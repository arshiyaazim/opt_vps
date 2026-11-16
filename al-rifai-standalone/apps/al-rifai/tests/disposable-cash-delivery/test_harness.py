import importlib.util
from pathlib import Path
import unittest


HARNESS_PATH = Path(__file__).with_name("harness.py")
SPEC = importlib.util.spec_from_file_location("cash_delivery_harness", HARNESS_PATH)
harness = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(harness)


def inspections(*, network="none", published=None, mount_name="owned-volume",
                volume_name="owned-volume", image_id="sha256:test-image",
                privileged=False, state_running=False, container_name="owned-container",
                run_id="run-1", scope=harness.LABEL_SCOPE):
    container = {
        "Id": "owned-id",
        "Name": f"/{container_name}",
        "Image": image_id,
        "Config": {"Labels": {"alrifai.test.scope": scope, "alrifai.test.run": run_id}},
        "HostConfig": {"NetworkMode": network, "PortBindings": published, "Privileged": privileged},
        "NetworkSettings": {"Networks": {} if network == "none" else {network: {"IPAddress": "10.0.0.2"}}},
        "Mounts": [{
            "Type": "volume", "Name": mount_name,
            "Destination": "/var/lib/postgresql/data", "RW": True,
        }],
        "State": {"Running": state_running},
    }
    volume = {"Name": volume_name, "Labels": {
        "alrifai.test.scope": scope, "alrifai.test.run": run_id,
    }}
    return container, volume


class TargetGuardTests(unittest.TestCase):
    def validate(self, **kwargs):
        require_running = kwargs.pop("require_running", False)
        container, volume = inspections(**kwargs)
        harness.validate_inspection(
            container, volume, expected_name="owned-container",
            expected_volume="owned-volume", expected_image_id="sha256:test-image",
            run_id="run-1", require_running=require_running,
        )

    def test_accepts_owned_networkless_exact_volume(self):
        self.validate()

    def test_rejects_live_name_and_live_database_identity(self):
        with self.assertRaisesRegex(harness.HarnessError, "live PostgreSQL"):
            container, volume = inspections(container_name=harness.LIVE_CONTAINER)
            harness.validate_inspection(
                container, volume, expected_name=harness.LIVE_CONTAINER,
                expected_volume="owned-volume", expected_image_id="sha256:test-image",
                run_id="run-1",
            )
        identity = {
            "database": harness.LIVE_DATABASE,
            "user": "cash_harness_owner",
            "systemIdentifier": "synthetic-cluster-id",
            "dataDirectory": "/var/lib/postgresql/data",
        }
        with self.assertRaisesRegex(harness.HarnessError, "database identity"):
            harness.validate_database_identity(
                identity, expected_db=harness.LIVE_DATABASE,
                expected_user="cash_harness_owner",
            )

    def test_database_identity_requires_ephemeral_db_user_path_and_cluster(self):
        valid = {
            "database": "cash_delivery_test_run1",
            "user": "cash_harness_owner",
            "systemIdentifier": "synthetic-cluster-id",
            "dataDirectory": "/var/lib/postgresql/data",
        }
        self.assertEqual(
            harness.validate_database_identity(
                valid, expected_db="cash_delivery_test_run1",
                expected_user="cash_harness_owner",
            ),
            "synthetic-cluster-id",
        )
        for change in (
            {"user": "production_user"},
            {"systemIdentifier": "other-cluster"},
            {"dataDirectory": "/etc/vps"},
        ):
            with self.subTest(change=change), self.assertRaises(harness.HarnessError):
                harness.validate_database_identity(
                    {**valid, **change}, expected_db="cash_delivery_test_run1",
                    expected_user="cash_harness_owner",
                    expected_system_id="synthetic-cluster-id",
                )

    def test_rejects_bridge_network_or_published_ports(self):
        for kwargs in ({"network": "bridge"}, {"published": {"5432/tcp": [{"HostPort": "5432"}]}}):
            with self.subTest(kwargs=kwargs), self.assertRaises(harness.HarnessError):
                self.validate(**kwargs)

    def test_rejects_unowned_mount_image_volume_or_privileged_container(self):
        cases = (
            {"mount_name": "other-volume"},
            {"volume_name": "other-volume"},
            {"image_id": "sha256:other-image"},
            {"privileged": True},
            {"scope": "wrong-scope"},
            {"run_id": "other-run"},
        )
        for kwargs in cases:
            with self.subTest(kwargs=kwargs), self.assertRaises(harness.HarnessError):
                self.validate(**kwargs)


if __name__ == "__main__":
    unittest.main()
