#!/usr/bin/env python3
"""Disposable-only Cash delivery qualification; never targets production."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import selectors
import subprocess
import sys
import time
import uuid


SCHEMA = Path(__file__).with_name("schema.sql")
LABEL_SCOPE = "alrifai-disposable-cash-delivery"
LIVE_CONTAINER = "vps-infra-postgres-1"
LIVE_DATABASE = "alrifai"
EXPECTED_SOURCE = "alrifai-canonical-db"
EXPECTED_ACCOUNT = "wa-01"
FAKE_EMPLOYEE = "SYNTHETIC_EMPLOYEE_MOBILE"
FAKE_PAYOUT = "SYNTHETIC_PAYOUT_MOBILE"
DB_IMAGE = "postgres:16-alpine"


class HarnessError(RuntimeError):
    pass


def run(args: list[str], *, input_text: str | None = None,
        check: bool = True, env: dict[str, str] | None = None,
        timeout: int = 30) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            args, input=input_text, text=True, capture_output=True,
            check=False, env=env, timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise HarnessError(f"command failed safely: {args[0]} ({type(exc).__name__})") from exc
    if check and result.returncode:
        raise HarnessError(f"command failed: {args[0]} (exit {result.returncode})")
    return result


def docker_json(*args: str) -> dict | list:
    result = run(["docker", *args])
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise HarnessError("Docker returned invalid inspection data") from exc


def validate_inspection(container: dict, volume: dict, *,
                        expected_name: str, expected_volume: str,
                        expected_image_id: str, run_id: str,
                        require_running: bool = False) -> None:
    labels = container.get("Config", {}).get("Labels") or {}
    if labels.get("alrifai.test.scope") != LABEL_SCOPE or labels.get("alrifai.test.run") != run_id:
        raise HarnessError("container ownership labels do not match this run")
    if container.get("Name", "").lstrip("/") != expected_name:
        raise HarnessError("container name does not match this run")
    if (container.get("Id") == LIVE_CONTAINER
            or container.get("Name", "").lstrip("/") == LIVE_CONTAINER
            or expected_name == LIVE_CONTAINER):
        raise HarnessError("live PostgreSQL container is forbidden")
    if container.get("Image") != expected_image_id:
        raise HarnessError("container image is not the pinned local image ID")

    host = container.get("HostConfig") or {}
    if host.get("NetworkMode") != "none":
        raise HarnessError("container is not network-isolated")
    if host.get("PortBindings") not in (None, {}):
        raise HarnessError("published ports are forbidden")
    networks = container.get("NetworkSettings", {}).get("Networks") or {}
    if networks and set(networks) != {"none"}:
        raise HarnessError("unexpected container network attachment")
    if any(item.get("IPAddress") for item in networks.values()):
        raise HarnessError("container has a network address")

    mounts = container.get("Mounts") or []
    if len(mounts) != 1:
        raise HarnessError("container must have exactly one disposable data mount")
    mount = mounts[0]
    if (mount.get("Type") != "volume"
            or mount.get("Name") != expected_volume
            or mount.get("Destination") != "/var/lib/postgresql/data"
            or mount.get("RW") is not True):
        raise HarnessError("container mount is not the owned disposable volume")
    if (volume.get("Name") != expected_volume
            or (volume.get("Labels") or {}).get("alrifai.test.scope") != LABEL_SCOPE
            or (volume.get("Labels") or {}).get("alrifai.test.run") != run_id):
        raise HarnessError("volume ownership labels do not match this run")

    if require_running and not (container.get("State") or {}).get("Running"):
        raise HarnessError("disposable PostgreSQL is not running")
    if host.get("Privileged"):
        raise HarnessError("privileged containers are forbidden")


def validate_database_identity(identity: object, *,
                               expected_db: str, expected_user: str,
                               expected_system_id: str | None = None) -> str:
    if (not isinstance(identity, dict)
            or identity.get("database") != expected_db
            or identity.get("database") == LIVE_DATABASE
            or not expected_db.startswith("cash_delivery_test_")
            or identity.get("user") != expected_user
            or identity.get("dataDirectory") != "/var/lib/postgresql/data"):
        raise HarnessError("database identity preflight failed")
    system_id = identity.get("systemIdentifier")
    if not system_id or (expected_system_id and system_id != expected_system_id):
        raise HarnessError("PostgreSQL cluster identity preflight failed")
    return str(system_id)


def canonical_payload(amount: int = 12500) -> dict[str, object]:
    return {
        "amountMinor": amount,
        "currency": "BDT",
        "domain": "ACCOUNTS",
        "employeeMobile": FAKE_EMPLOYEE,
        "payoutMobile": FAKE_PAYOUT,
        "recordType": "CASH_POSTING",
    }


def payload_hash(payload: dict[str, object]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


class DisposableHarness:
    def __init__(self) -> None:
        self.run_id = uuid.uuid4().hex
        self.container_name = f"alrifai-cash-delivery-test-{self.run_id[:12]}"
        self.volume_name = f"alrifai-cash-delivery-data-{self.run_id[:12]}"
        self.db_name = f"cash_delivery_test_{self.run_id[:12]}"
        self.db_user = "cash_harness_owner"
        self.db_password = secrets.token_urlsafe(32)
        self.container_id: str | None = None
        self.volume_created = False
        self.container_created = False
        self.image_id = ""
        self.system_identifier = ""
        self.results: list[tuple[str, str, str]] = []

    def docker_inspect(self) -> tuple[dict, dict]:
        if not self.container_id:
            raise HarnessError("no disposable container is assigned")
        container = docker_json("inspect", self.container_id)[0]
        volume = docker_json("volume", "inspect", self.volume_name)[0]
        validate_inspection(
            container, volume, expected_name=self.container_name,
            expected_volume=self.volume_name, expected_image_id=self.image_id,
            run_id=self.run_id, require_running=True,
        )
        return container, volume

    def psql(self, sql: str, *, user: str | None = None,
             db: str | None = None, check: bool = True,
             timeout: int = 30) -> str:
        if not self.container_id:
            raise HarnessError("no disposable container is assigned")
        self.docker_inspect()
        result = run([
            "docker", "exec", "-i", "-e", f"PGPASSWORD={self.db_password}",
            self.container_id, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
            "-U", user or self.db_user, "-d", db or self.db_name,
        ], input_text=sql, check=check, timeout=timeout)
        return result.stdout.strip()

    def query_json(self, sql: str) -> object:
        output = self.psql(sql)
        try:
            return json.loads(output)
        except json.JSONDecodeError as exc:
            raise HarnessError("disposable database returned invalid JSON") from exc

    def scalar(self, sql: str) -> str:
        return self.psql(sql).splitlines()[-1]

    def wait_ready(self, timeout: int = 40) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            self.docker_inspect()
            result = run([
                "docker", "exec", self.container_id or "",
                "pg_isready", "-U", self.db_user, "-d", self.db_name,
            ], check=False, timeout=5)
            if result.returncode == 0:
                return
            time.sleep(0.5)
        raise HarnessError("disposable PostgreSQL readiness timed out")

    def provision(self) -> None:
        image = docker_json("image", "inspect", DB_IMAGE)[0]
        self.image_id = image.get("Id", "")
        if not self.image_id.startswith("sha256:"):
            raise HarnessError("local PostgreSQL image has no immutable ID")
        labels = [
            "--label", f"alrifai.test.scope={LABEL_SCOPE}",
            "--label", f"alrifai.test.run={self.run_id}",
        ]
        created_volume = run([
            "docker", "volume", "create", *labels, self.volume_name,
        ]).stdout.strip()
        self.volume_created = True
        if created_volume != self.volume_name:
            raise HarnessError("Docker created an unexpected volume name")
        volume = docker_json("volume", "inspect", self.volume_name)[0]
        volume_labels = volume.get("Labels") or {}
        if (volume_labels.get("alrifai.test.scope") != LABEL_SCOPE
                or volume_labels.get("alrifai.test.run") != self.run_id):
            raise HarnessError("new volume failed ownership verification")

        result = run([
            "docker", "create", "--name", self.container_name, *labels,
            "--network", "none", "--restart", "no",
            "--memory", "512m", "--cpus", "1", "--pids-limit", "64",
            "--security-opt", "no-new-privileges",
            "--mount", f"type=volume,source={self.volume_name},destination=/var/lib/postgresql/data",
            "--env", f"POSTGRES_USER={self.db_user}",
            "--env", f"POSTGRES_PASSWORD={self.db_password}",
            "--env", f"POSTGRES_DB={self.db_name}",
            self.image_id,
        ])
        self.container_id = result.stdout.strip()
        self.container_created = True
        container = docker_json("inspect", self.container_id)[0]
        validate_inspection(
            container, volume, expected_name=self.container_name,
            expected_volume=self.volume_name, expected_image_id=self.image_id,
            run_id=self.run_id,
        )

        run(["docker", "start", self.container_id])
        self.wait_ready()

        # This is the only SQL permitted before the synthetic schema is loaded.
        identity = self.query_json("""
            SELECT json_build_object(
                'database', current_database(),
                'user', current_user,
                'systemIdentifier', (SELECT system_identifier::text FROM pg_control_system()),
                'dataDirectory', current_setting('data_directory'),
                'serverVersion', current_setting('server_version_num')
            )::text;
        """)
        self.system_identifier = validate_database_identity(
            identity, expected_db=self.db_name, expected_user=self.db_user,
        )
        if not str(identity.get("serverVersion", "")).startswith("16"):
            raise HarnessError("disposable PostgreSQL major version is not 16")
        self.results.append((
            "isolation", "PASS",
            f"network=none; image={self.image_id}; container={self.container_id[:12]}; "
            f"db={self.db_name}; pg_system_id={self.system_identifier}",
        ))

        self.psql(SCHEMA.read_text())

    def insert_posting(self, posting_id: str, case_name: str, *,
                       created_at: str = "2026-10-19 10:00:00+00",
                       amount: int = 12500) -> dict[str, object]:
        payload = canonical_payload(amount)
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        digest = payload_hash(payload)
        sql = f"""
            INSERT INTO cash_delivery_test.canonical_postings
                (posting_id, case_name, source_account, operation_id,
                 instruction_id, command_id, posting_status, amount_minor,
                 employee_mobile, payout_mobile, payload_hash, payload, created_at)
            VALUES ({literal(posting_id)}, {literal(case_name)}, 'wa-01',
                    {literal('op-' + posting_id)}, {literal('instruction-' + posting_id)},
                    {literal('command-' + posting_id)}, 'POSTED', {amount},
                    {literal(FAKE_EMPLOYEE)}, {literal(FAKE_PAYOUT)},
                    {literal(digest)}, {literal(encoded)}::jsonb, {literal(created_at)}::timestamptz);
            INSERT INTO cash_delivery_test.cash_movements(posting_id, leg, amount_minor)
            VALUES ({literal(posting_id)}, 1, -{amount}),
                   ({literal(posting_id)}, 2, {amount});
        """
        self.psql(sql)
        return payload

    def receive(self, posting_id: str, payload: dict[str, object], *,
                source: str = EXPECTED_SOURCE, account: str = EXPECTED_ACCOUNT,
                domain: str = "ACCOUNTS", record_type: str = "CASH_POSTING",
                identity_verified: bool = True) -> tuple[str, str]:
        p_hash = payload_hash(payload)
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        sql = f"""
            SET ROLE cash_delivery_receiver;
            SELECT result_status || '|' || coalesce(result_receipt_id, '')
              FROM cash_delivery_test.receive_cash(
                {literal(source)}, {literal(account)}, {literal(posting_id)},
                {literal(p_hash)}, {literal(domain)}, {literal(record_type)},
                {'true' if identity_verified else 'false'}, {literal(encoded)}::jsonb
              );
        """
        output = self.psql("SET ROLE cash_delivery_receiver;\n" + sql)
        status, receipt = output.splitlines()[-1].split("|", 1)
        return status, receipt

    def record(self, name: str, action) -> None:
        try:
            detail = action()
            self.results.append((name, "PASS", str(detail)))
        except Exception as exc:
            self.results.append((name, "FAIL", f"{type(exc).__name__}: {exc}"))

    def test_duplicate_delivery(self) -> str:
        payload = self.insert_posting("duplicate-1", "duplicate")
        first = self.receive("duplicate-1", payload)
        second = self.receive("duplicate-1", payload)
        counts = self.query_json("""
            SELECT json_build_object(
                'postings', (SELECT count(*) FROM cash_delivery_test.canonical_postings WHERE posting_id='duplicate-1'),
                'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements WHERE posting_id='duplicate-1'),
                'receipts', (SELECT count(*) FROM cash_delivery_test.delivery_receipts WHERE posting_id='duplicate-1')
            )::text;
        """)
        assert first[0] == second[0] == "ACCEPTED"
        assert first[1] == second[1] and first[1]
        assert counts == {"postings": 1, "movements": 2, "receipts": 1}
        assert payload["employeeMobile"] != payload["payoutMobile"]
        stored = self.query_json("""
            SELECT json_build_object('payload', payload)::text
            FROM cash_delivery_test.delivery_receipts
            WHERE posting_id='duplicate-1';
        """)
        assert stored == {"payload": payload}
        return f"same receipt={first[1]}; postings=1; movements=2; receipts=1"

    def test_conflict(self) -> str:
        original = self.query_json("""
            SELECT json_build_object('hash', payload_hash, 'payload', payload, 'receipt', receipt_id)::text
            FROM cash_delivery_test.delivery_receipts WHERE posting_id='duplicate-1';
        """)
        changed = canonical_payload(12501)
        status, _ = self.receive("duplicate-1", changed)
        after = self.query_json("""
            SELECT json_build_object('hash', payload_hash, 'payload', payload, 'receipt', receipt_id)::text
            FROM cash_delivery_test.delivery_receipts WHERE posting_id='duplicate-1';
        """)
        counts = self.query_json("""
            SELECT json_build_object(
                'postings', (SELECT count(*) FROM cash_delivery_test.canonical_postings WHERE posting_id='duplicate-1'),
                'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements WHERE posting_id='duplicate-1'),
                'conflicts', (SELECT count(*) FROM cash_delivery_test.delivery_conflicts WHERE posting_id='duplicate-1'),
                'status', (SELECT status FROM cash_delivery_test.delivery_status WHERE posting_id='duplicate-1')
            )::text;
        """)
        assert status == "NEEDS_REVIEW"
        assert after == original
        assert counts == {"postings": 1, "movements": 2, "conflicts": 1, "status": "NEEDS_REVIEW"}
        return "NEEDS_REVIEW; original receipt/hash/payload unchanged; no new posting or movement"

    def test_late_commit(self) -> str:
        self.docker_inspect()
        self.insert_posting("watermark-base", "watermark", created_at="2026-10-19 10:00:00+00")
        payload = canonical_payload()
        digest = payload_hash(payload)
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        late_insert = f"""
            BEGIN;
            INSERT INTO cash_delivery_test.canonical_postings
                (posting_id, case_name, source_account, operation_id,
                 instruction_id, command_id, posting_status, amount_minor,
                 employee_mobile, payout_mobile, payload_hash, payload, created_at)
            VALUES ('watermark-late', 'watermark', 'wa-01', 'op-watermark-late',
                    'instruction-watermark-late', 'command-watermark-late',
                    'POSTED', 12500, '{FAKE_EMPLOYEE}', '{FAKE_PAYOUT}',
                    '{digest}', '{encoded}'::jsonb, '2026-10-19 09:59:00+00');
            INSERT INTO cash_delivery_test.cash_movements(posting_id, leg, amount_minor)
            VALUES ('watermark-late', 1, -12500), ('watermark-late', 2, 12500);
            \\echo TX_INSERTED_UNCOMMITTED
            SELECT pg_sleep(3);
            COMMIT;
        """
        proc = subprocess.Popen(
            ["docker", "exec", "-i", "-e", f"PGPASSWORD={self.db_password}",
             self.container_id or "", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
             "-U", self.db_user, "-d", self.db_name],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True,
        )
        assert proc.stdin and proc.stdout
        proc.stdin.write(late_insert)
        proc.stdin.close()
        proc.stdin = None
        selector = selectors.DefaultSelector()
        selector.register(proc.stdout, selectors.EVENT_READ)
        ready = False
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline and selector.select(timeout=0.2):
            line = proc.stdout.readline()
            if "TX_INSERTED_UNCOMMITTED" in line:
                ready = True
                break
        selector.close()
        if not ready:
            proc.kill()
            proc.wait(timeout=5)
            raise AssertionError("late transaction did not reach its uncommitted barrier")

        cursor = self.scalar("""
            SELECT max(created_at)::text FROM cash_delivery_test.canonical_postings
            WHERE case_name='watermark';
        """)
        invisible_before = self.scalar("""
            SELECT count(*) FROM cash_delivery_test.canonical_postings
            WHERE case_name='watermark' AND posting_id='watermark-late';
        """)
        try:
            proc.communicate(timeout=15)
        except subprocess.TimeoutExpired as exc:
            proc.kill()
            proc.communicate()
            raise AssertionError("late transaction did not complete") from exc
        if proc.returncode:
            raise AssertionError("late transaction failed before commit")
        unsafe_after = self.scalar(f"""
            SELECT count(*) FROM cash_delivery_test.canonical_postings
            WHERE case_name='watermark' AND created_at > {literal(cursor)}::timestamptz;
        """)
        full_scan = self.query_json("""
            SELECT coalesce(json_agg(posting_id ORDER BY posting_id), '[]'::json)::text
            FROM cash_delivery_test.canonical_postings WHERE case_name='watermark';
        """)
        self.receive("watermark-late", payload)
        self.receive("watermark-base", canonical_payload())
        assert invisible_before == "0"
        assert unsafe_after == "0"
        assert full_scan == ["watermark-base", "watermark-late"]
        return "late-visible row was missed by strict timestamp cursor; full retained-set reconciliation recovered 1"

    def test_poll_restart(self) -> str:
        self.insert_posting("restart-1", "restart")
        self.insert_posting("restart-2", "restart", amount=22000)
        env = os.environ.copy()
        env.update({
            "CASH_TEST_CONTAINER": self.container_name,
            "CASH_TEST_DB": self.db_name,
            "CASH_TEST_USER": self.db_user,
            "CASH_TEST_PASSWORD": self.db_password,
            "CASH_TEST_RUN_ID": self.run_id,
            "CASH_TEST_VOLUME": self.volume_name,
            "CASH_TEST_IMAGE_ID": self.image_id,
            "CASH_TEST_SYSTEM_ID": self.system_identifier,
        })
        interrupted = run(
            [sys.executable, str(Path(__file__).resolve()), "--worker", "--crash-after", "1"],
            env=env, check=False, timeout=30,
        )
        if interrupted.returncode != 75:
            detail = interrupted.stderr.strip().replace(self.db_password, "[redacted]")
            raise AssertionError(
                f"poller interruption exit was {interrupted.returncode}, expected 75: {detail[-400:]}"
            )
        before = self.query_json("""
            SELECT json_build_object(
              'receipts', (SELECT count(*) FROM cash_delivery_test.delivery_receipts WHERE posting_id LIKE 'restart-%'),
              'postings', (SELECT count(*) FROM cash_delivery_test.canonical_postings WHERE case_name='restart'),
              'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements WHERE posting_id LIKE 'restart-%')
            )::text;
        """)
        assert before == {"receipts": 1, "postings": 2, "movements": 4}

        self.docker_inspect()
        run(["docker", "restart", self.container_id or ""], timeout=30)
        self.wait_ready()
        self.verify_database_identity()

        resumed = run(
            [sys.executable, str(Path(__file__).resolve()), "--worker"],
            env=env, timeout=30,
        )
        if resumed.returncode:
            raise AssertionError("poller did not resume after process/container restart")
        after = self.query_json("""
            SELECT json_build_object(
              'receipts', (SELECT count(*) FROM cash_delivery_test.delivery_receipts WHERE posting_id LIKE 'restart-%'),
              'postings', (SELECT count(*) FROM cash_delivery_test.canonical_postings WHERE case_name='restart'),
              'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements WHERE posting_id LIKE 'restart-%'),
              'uniqueKeys', (SELECT count(DISTINCT (source_system,source_account,posting_id))
                             FROM cash_delivery_test.delivery_receipts WHERE posting_id LIKE 'restart-%')
            )::text;
        """)
        assert after == {"receipts": 2, "postings": 2, "movements": 4, "uniqueKeys": 2}
        return "interrupted after 1/2; PostgreSQL restarted on same volume; replay scan resumed with 2 receipts, 2 postings, 4 movements"

    def verify_database_identity(self) -> None:
        identity = self.query_json("""
            SELECT json_build_object(
                'database', current_database(),
                'user', current_user,
                'systemIdentifier', (SELECT system_identifier::text FROM pg_control_system()),
                'dataDirectory', current_setting('data_directory')
            )::text;
        """)
        validate_database_identity(
            identity, expected_db=self.db_name, expected_user=self.db_user,
            expected_system_id=self.system_identifier,
        )

    def test_lost_ack(self) -> str:
        payload = self.insert_posting("lost-ack-1", "lost_ack")
        sql = f"""
            BEGIN;
            SET ROLE cash_delivery_receiver;
            SELECT * FROM cash_delivery_test.receive_cash(
                '{EXPECTED_SOURCE}', '{EXPECTED_ACCOUNT}', 'lost-ack-1',
                '{payload_hash(payload)}', 'ACCOUNTS', 'CASH_POSTING', true,
                '{json.dumps(payload, sort_keys=True, separators=(',', ':'))}'::jsonb
            );
            COMMIT;
        """
        self.psql(sql)  # Deliberately discard the committed acknowledgement.
        prior = self.scalar("""
            SELECT receipt_id::text FROM cash_delivery_test.delivery_receipts
            WHERE posting_id='lost-ack-1';
        """)
        retry = self.receive("lost-ack-1", payload)
        counts = self.query_json("""
            SELECT json_build_object(
                'postings', (SELECT count(*) FROM cash_delivery_test.canonical_postings WHERE posting_id='lost-ack-1'),
                'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements WHERE posting_id='lost-ack-1'),
                'receipts', (SELECT count(*) FROM cash_delivery_test.delivery_receipts WHERE posting_id='lost-ack-1')
            )::text;
        """)
        assert retry == ("ACCEPTED", prior)
        assert counts == {"postings": 1, "movements": 2, "receipts": 1}
        return f"discarded acknowledgement; same-key retry returned receipt={prior}; posting/movements unchanged"

    def test_least_privilege(self) -> str:
        self.psql("""
            DO $block$
            DECLARE table_name text; privilege_name text;
            BEGIN
              FOREACH table_name IN ARRAY ARRAY[
                'cash_delivery_test.canonical_postings',
                'cash_delivery_test.cash_movements'
              ] LOOP
                FOREACH privilege_name IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
                  IF has_table_privilege('cash_delivery_receiver', table_name, privilege_name) THEN
                    RAISE EXCEPTION 'RECEIVER_HAS_WRITE_PRIVILEGE:%:%', table_name, privilege_name;
                  END IF;
                END LOOP;
              END LOOP;
            END
            $block$;
            SET ROLE cash_delivery_receiver;
            DO $block$
            BEGIN
              BEGIN
                INSERT INTO cash_delivery_test.canonical_postings
                  (posting_id,case_name,source_account,operation_id,instruction_id,command_id,
                   posting_status,amount_minor,employee_mobile,payload_hash,payload,created_at)
                VALUES ('permission-probe','probe','wa-01','op-probe','i-probe','c-probe',
                        'POSTED',1,'SYNTHETIC_EMPLOYEE_MOBILE','x','{}','2026-10-19 00:00+00');
                RAISE EXCEPTION 'RECEIVER_POSTING_INSERT_SUCCEEDED';
              EXCEPTION WHEN insufficient_privilege THEN NULL;
              END;
              BEGIN
                INSERT INTO cash_delivery_test.cash_movements(posting_id,leg,amount_minor)
                VALUES ('duplicate-1',1,1);
                RAISE EXCEPTION 'RECEIVER_MOVEMENT_INSERT_SUCCEEDED';
              EXCEPTION WHEN insufficient_privilege THEN NULL;
              END;
              BEGIN
                UPDATE cash_delivery_test.canonical_postings SET amount_minor=1
                WHERE posting_id='duplicate-1';
                RAISE EXCEPTION 'RECEIVER_POSTING_UPDATE_SUCCEEDED';
              EXCEPTION WHEN insufficient_privilege THEN NULL;
              END;
              BEGIN
                DELETE FROM cash_delivery_test.cash_movements WHERE posting_id='duplicate-1';
                RAISE EXCEPTION 'RECEIVER_MOVEMENT_DELETE_SUCCEEDED';
              EXCEPTION WHEN insufficient_privilege THEN NULL;
              END;
            END
            $block$;
            RESET ROLE;
        """)
        counts = self.query_json("""
            SELECT json_build_object(
                'postings', count(*),
                'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements)
            )::text
            FROM cash_delivery_test.canonical_postings;
        """)
        assert counts["postings"] == 6 and counts["movements"] == 12
        return "receiver role denied INSERT/UPDATE/DELETE on posting and movement tables; row counts unchanged"

    def test_domain_and_eligibility(self) -> str:
        self.psql("""
            INSERT INTO cash_delivery_test.instructions VALUES
                ('instruction-intent','INTENT'),
                ('instruction-review','REVIEW'),
                ('instruction-manual-ready','MANUAL_READY');
        """)
        eligible = self.query_json("""
            SELECT coalesce(json_agg(p.posting_id ORDER BY p.posting_id), '[]'::json)::text
            FROM cash_delivery_test.canonical_postings p;
        """)
        instruction_only = self.query_json("""
            SELECT coalesce(json_agg(i.instruction_id ORDER BY i.instruction_id), '[]'::json)::text
            FROM cash_delivery_test.instructions i
            WHERE NOT EXISTS (
                SELECT 1 FROM cash_delivery_test.canonical_postings p
                WHERE p.instruction_id=i.instruction_id AND p.posting_status='POSTED'
            );
        """)
        payload = canonical_payload()
        checks = [
            self.receive("unknown-cash", payload, source="untrusted-source"),
            self.receive("escort-record", payload, domain="ESCORT", record_type="ESCORT"),
            self.receive("release-record", payload, domain="Vessel", record_type="RELEASE"),
            self.receive("ambiguous-identity", payload, identity_verified=False),
            self.receive("not-posted", payload),
        ]
        statuses = self.query_json("""
            SELECT json_build_object(
              'reviews', (SELECT count(*) FROM cash_delivery_test.delivery_reviews),
              'receipts', (SELECT count(*) FROM cash_delivery_test.delivery_receipts),
              'cashPostings', (SELECT count(*) FROM cash_delivery_test.canonical_postings),
              'cashMovements', (SELECT count(*) FROM cash_delivery_test.cash_movements)
            )::text;
        """)
        assert all(status == "NEEDS_REVIEW" for status, _ in checks), checks
        assert instruction_only == [
            "instruction-intent", "instruction-manual-ready", "instruction-review"
        ], instruction_only
        assert statuses["reviews"] == 5
        assert statuses["receipts"] == len(eligible), (statuses, eligible)
        assert statuses["cashPostings"] == len(eligible), (statuses, eligible)
        assert statuses["cashMovements"] == len(eligible) * 2, (statuses, eligible)
        return f"wrong source/domain/type/identity/non-posted all NEEDS_REVIEW; no extra posting; non-posted instructions excluded"

    def test_delivery_failure_preserves_posting(self) -> str:
        payload = self.insert_posting("delivery-failed-1", "delivery_failed")
        self.psql("""
            INSERT INTO cash_delivery_test.delivery_status
                (source_system,source_account,posting_id,status)
            VALUES ('alrifai-canonical-db','wa-01','delivery-failed-1','DELIVERY_FAILED');
        """)
        state = self.query_json("""
            SELECT json_build_object(
              'posting', (SELECT posting_status FROM cash_delivery_test.canonical_postings WHERE posting_id='delivery-failed-1'),
              'delivery', (SELECT status FROM cash_delivery_test.delivery_status WHERE posting_id='delivery-failed-1'),
              'postings', (SELECT count(*) FROM cash_delivery_test.canonical_postings WHERE posting_id='delivery-failed-1'),
              'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements WHERE posting_id='delivery-failed-1')
            )::text;
        """)
        assert state == {
            "posting": "POSTED", "delivery": "DELIVERY_FAILED",
            "postings": 1, "movements": 2,
        }
        assert payload["employeeMobile"] != payload["payoutMobile"]
        return "delivery=DELIVERY_FAILED; canonical posting remains POSTED; no deletion/repost/reversal"

    def cleanup(self) -> None:
        if self.container_created and self.container_id:
            try:
                container = docker_json("inspect", self.container_id)[0]
                labels = container.get("Config", {}).get("Labels") or {}
                if (container.get("Id") == self.container_id
                        and labels.get("alrifai.test.scope") == LABEL_SCOPE
                        and labels.get("alrifai.test.run") == self.run_id
                        and container.get("Name", "").lstrip("/") == self.container_name):
                    run(["docker", "rm", "-f", self.container_id], check=False)
            except Exception:
                self.results.append(("cleanup-container", "FAIL", "owned container cleanup not verified"))
        if self.volume_created:
            try:
                volume = docker_json("volume", "inspect", self.volume_name)[0]
                labels = volume.get("Labels") or {}
                if (volume.get("Name") == self.volume_name
                        and labels.get("alrifai.test.scope") == LABEL_SCOPE
                        and labels.get("alrifai.test.run") == self.run_id):
                    run(["docker", "volume", "rm", self.volume_name])
                    self.results.append(("cleanup", "PASS", "owned disposable container and volume removed"))
                else:
                    self.results.append(("cleanup", "FAIL", "volume ownership mismatch; left untouched"))
            except Exception as exc:
                self.results.append(("cleanup", "FAIL", f"owned volume cleanup not verified: {type(exc).__name__}"))

    def verify_and_run(self) -> None:
        self.provision()
        self.record("A duplicate delivery", self.test_duplicate_delivery)
        self.record("B conflicting payload", self.test_conflict)
        self.record("C late commit", self.test_late_commit)
        self.record("D restart recovery", self.test_poll_restart)
        self.record("E lost acknowledgement", self.test_lost_ack)
        self.record("F least privilege", self.test_least_privilege)
        self.record("G domain separation", self.test_domain_and_eligibility)
        self.record("posting/delivery status invariant", self.test_delivery_failure_preserves_posting)
        self.record("aggregate counts", self.test_aggregate_counts)

    def test_aggregate_counts(self) -> str:
        counts = self.query_json("""
            SELECT json_build_object(
              'postings', (SELECT count(*) FROM cash_delivery_test.canonical_postings),
              'movements', (SELECT count(*) FROM cash_delivery_test.cash_movements),
              'receipts', (SELECT count(*) FROM cash_delivery_test.delivery_receipts),
              'unreceived', (
                SELECT count(*) FROM cash_delivery_test.canonical_postings p
                WHERE NOT EXISTS (
                  SELECT 1 FROM cash_delivery_test.delivery_receipts r
                  WHERE r.source_system='alrifai-canonical-db'
                    AND r.source_account=p.source_account
                    AND r.posting_id=p.posting_id
                )
              ),
              'deliveryFailed', (
                SELECT count(*) FROM cash_delivery_test.delivery_status
                WHERE status='DELIVERY_FAILED'
              ),
              'review', (
                SELECT count(*) FROM cash_delivery_test.delivery_reviews
              )
            )::text;
        """)
        assert counts == {
            "postings": 7, "movements": 14, "receipts": 6,
            "unreceived": 1, "deliveryFailed": 1, "review": 5,
        }
        return "postings=7; movements=14; receipts=6; intentionally unreceived=1 (DELIVERY_FAILED); domain reviews=5"


def worker() -> int:
    container = os.environ["CASH_TEST_CONTAINER"]
    db_name = os.environ["CASH_TEST_DB"]
    db_user = os.environ["CASH_TEST_USER"]
    password = os.environ["CASH_TEST_PASSWORD"]
    run_id = os.environ.get("CASH_TEST_RUN_ID")
    volume_name = os.environ.get("CASH_TEST_VOLUME", "")
    image_id = os.environ.get("CASH_TEST_IMAGE_ID", "")
    system_identifier = os.environ.get("CASH_TEST_SYSTEM_ID", "")
    if (not container.startswith("alrifai-cash-delivery-test-")
            or not db_name.startswith("cash_delivery_test_")
            or db_name == LIVE_DATABASE
            or run_id is None):
        raise HarnessError("worker target validation failed")
    inspections = docker_json("inspect", container)
    if len(inspections) != 1:
        raise HarnessError("worker container identity is ambiguous")
    inspected = inspections[0]
    volumes = docker_json("volume", "inspect", volume_name)
    if len(volumes) != 1:
        raise HarnessError("worker volume identity is ambiguous")
    validate_inspection(
        inspected, volumes[0], expected_name=container,
        expected_volume=volume_name, expected_image_id=image_id,
        run_id=run_id, require_running=True,
    )
    identity_result = run([
        "docker", "exec", "-e", f"PGPASSWORD={password}", container,
        "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", db_user, "-d", db_name,
        "-c", """
          SELECT json_build_object(
            'database', current_database(),
            'user', current_user,
            'systemIdentifier', (SELECT system_identifier::text FROM pg_control_system()),
            'dataDirectory', current_setting('data_directory')
          )::text;
        """,
    ])
    identity = json.loads(identity_result.stdout.strip())
    validate_database_identity(
        identity, expected_db=db_name, expected_user=db_user,
        expected_system_id=system_identifier,
    )
    output = run([
        "docker", "exec", "-e", f"PGPASSWORD={password}", container,
        "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", db_user, "-d", db_name,
        "-c", """
          SET ROLE cash_delivery_receiver;
        """
        + """
          SELECT coalesce(json_agg(row_to_json(p) ORDER BY p.posting_id), '[]'::json)::text
          FROM cash_delivery_test.canonical_postings p WHERE p.case_name='restart';
        """,
    ])
    rows = json.loads(output.stdout)
    for index, row in enumerate(rows, start=1):
        payload = row["payload"]
        sql = f"""
            SET ROLE cash_delivery_receiver;
            SELECT result_status || '|' || coalesce(result_receipt_id, '')
              FROM cash_delivery_test.receive_cash(
                {literal(EXPECTED_SOURCE)}, 'wa-01', {literal(row['posting_id'])},
                {literal(row['payload_hash'])}, 'ACCOUNTS', 'CASH_POSTING', true,
                {literal(json.dumps(payload, sort_keys=True, separators=(',', ':')))}::jsonb
              );
        """
        run([
            "docker", "exec", "-e", f"PGPASSWORD={password}", container,
            "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", db_user, "-d", db_name,
            "-c", sql,
        ])
        if os.environ.get("CASH_TEST_CRASH_AFTER") == str(index):
            return 75
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker", action="store_true")
    parser.add_argument("--crash-after", type=int)
    args = parser.parse_args()
    if args.worker:
        os.environ["CASH_TEST_RUN_ID"] = os.environ.get("CASH_TEST_RUN_ID", "")
        if args.crash_after is not None:
            os.environ["CASH_TEST_CRASH_AFTER"] = str(args.crash_after)
        return worker()

    harness = DisposableHarness()
    try:
        harness.verify_and_run()
    except Exception as exc:
        harness.results.append(("harness", "FAIL", f"{type(exc).__name__}: {exc}"))
    finally:
        harness.cleanup()
    for name, status, detail in harness.results:
        print(f"{status}\t{name}\t{detail}")
    failures = [result for result in harness.results if result[1] == "FAIL"]
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except HarnessError as exc:
        print(f"STOPPED SAFELY: {exc}", file=sys.stderr)
        raise SystemExit(2)
