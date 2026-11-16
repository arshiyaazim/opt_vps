"""Offline regression checks for the reviewed SQL harness; never open a database."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('workflow_rehearsal', ROOT / 'scripts/workflow-sql-rehearsal.py')
rehearsal = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rehearsal)
MIGRATION = ROOT / 'db/migrations/0012_business_workflows.sql'
MIGRATION_SHA = 'f90bccff6f9297afc646a98c824d04812c8b52affc8051855c9efff0e6b381e8'


def statements(sql):
    """Split only outside SQL quotes/comments/dollar bodies, preserving whole DO blocks."""
    result = []
    start = index = 0
    quote = dollar = None
    line = block = False
    while index < len(sql):
        char, next_char = sql[index], sql[index:index + 2]
        if line:
            if char == '\n':
                line = False
        elif block:
            if next_char == '*/':
                block = False
                index += 1
        elif dollar:
            if sql.startswith(dollar, index):
                index += len(dollar) - 1
                dollar = None
        elif quote:
            if char == quote:
                if sql[index:index + 2] == quote * 2:
                    index += 1
                else:
                    quote = None
        elif next_char == '--':
            line = True
            index += 1
        elif next_char == '/*':
            block = True
            index += 1
        elif char in "'\"":
            quote = char
        elif char == '$' and (match := re.match(r'\$[A-Za-z_0-9]*\$', sql[index:])):
            dollar = match[0]
            index += len(dollar) - 1
        elif char == ';':
            result.append(sql[start:index + 1])
            start = index + 1
        index += 1
    if sql[start:].strip():
        result.append(sql[start:])
    return [re.sub(r'--[^\n]*', '', item).strip() for item in result if item.strip()]


class RehearsalTests(unittest.TestCase):
    def test_balance_constraints_run_after_each_complete_operation(self):
        migration = MIGRATION.read_text()
        sql = rehearsal.build_sql(migration)
        checks = statements(sql.split(migration, 1)[1])
        mode = 'DEFERRED'
        operations = 0
        for index, statement in enumerate(checks):
            if statement.startswith('SET CONSTRAINTS'):
                mode = 'IMMEDIATE' if 'IMMEDIATE' in statement else 'DEFERRED'
            if 'public.alrifai_post_cash(' in statement:
                operations += 1
                self.assertEqual(mode, 'DEFERRED', 'An operation would fire the balance trigger before its legs exist')
                self.assertEqual(checks[index + 1], 'SET CONSTRAINTS ALL IMMEDIATE;')
                self.assertEqual(checks[index + 2], 'SET CONSTRAINTS ALL DEFERRED;')
        self.assertEqual(operations, 5)  # Original, replay, reversal, duplicate reversal, revoked replay.
        self.assertEqual(checks[-1], 'ROLLBACK;')
        self.assertFalse(any(re.match(r'^(COMMIT|END)\s*;', item) for item in checks))

    def test_permission_and_privileged_trigger_denials_are_distinct(self):
        checks = statements(rehearsal.build_sql('').split('SET CONSTRAINTS ALL DEFERRED;', 1)[1])
        role = None
        permission = trigger = rls = False
        for statement in checks:
            if statement == 'SET LOCAL ROLE ir_review_runtime;':
                role = 'runtime'
            elif statement == 'RESET ROLE;':
                role = 'privileged'
            if 'RUNTIME_UPDATE_ACCEPTED' in statement:
                self.assertEqual(role, 'runtime')
                self.assertIn("EXCEPTION WHEN SQLSTATE '42501'", statement)
                self.assertNotIn("SQLSTATE '55000'", statement)
                self.assertIn("has_table_privilege(current_user,'public.cash_instructions','UPDATE')", statement)
                self.assertIn('IS DISTINCT FROM 10001::bigint', statement)
                permission = True
            if 'PRIVILEGED_MUTATION_ACCEPTED' in statement:
                self.assertEqual(role, 'privileged')
                self.assertIn("EXCEPTION WHEN SQLSTATE '55000'", statement)
                self.assertNotIn("SQLSTATE '42501'", statement)
                self.assertIn("SQLERRM<>'foundation facts are append-only'", statement)
                self.assertIn('NOT has_table_privilege', statement)
                self.assertIn('IS DISTINCT FROM 10001::bigint', statement)
                trigger = True
            if 'REGISTRY_RLS_BYPASS' in statement:
                self.assertEqual(role, 'runtime')
                self.assertIn('GET DIAGNOSTICS changed=ROW_COUNT', statement)
                rls = True
        self.assertTrue(permission and trigger and rls)

    def test_migration_privileges_constraints_and_generated_artifact_are_unchanged(self):
        migration = MIGRATION.read_bytes()
        self.assertEqual(rehearsal.sha256(migration), MIGRATION_SHA)
        sql = rehearsal.build_sql(migration.decode())
        self.assertEqual(sql.encode(), (ROOT / rehearsal.SQL).read_bytes())
        harness = sql.split(migration.decode(), 1)[1]
        self.assertNotRegex(harness, r'(?im)^\s*(?:GRANT|REVOKE|DISABLE\s+TRIGGER|DROP\s+CONSTRAINT|ALTER\s+TABLE)\b')
        self.assertIn('DEFERRABLE INITIALLY DEFERRED', migration.decode())

    def make_release(self, root):
        migration = MIGRATION.read_bytes()
        files = {rehearsal.RUNNER: (ROOT / rehearsal.RUNNER).read_bytes(),
                 'db/migrations/0012_business_workflows.sql': migration,
                 rehearsal.SQL: rehearsal.build_sql(migration.decode()).encode()}
        for name, value in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(value)
        runner_sha = rehearsal.sha256(files[rehearsal.RUNNER])
        sql_sha = rehearsal.sha256(files[rehearsal.SQL])
        manifest = {'migration': {'path': 'db/migrations/0012_business_workflows.sql', 'sha256': MIGRATION_SHA},
                    'sourceChanges': [{'path': 'apps/al-rifai/' + rehearsal.RUNNER, 'sha256': runner_sha}],
                    'rehearsal': {'runnerSha256': runner_sha, 'sqlSha256': sql_sha},
                    'artifacts': {'workflow-rehearsal.sql': sql_sha}}
        (root / rehearsal.MANIFEST).write_text(json.dumps(manifest))
        self.seal_manifest(root)

    def seal_manifest(self, root):
        digest = rehearsal.sha256((root / rehearsal.MANIFEST).read_bytes())
        (root / rehearsal.MANIFEST_CHECKSUM).write_text(digest + '  workflow-release.json\n')

    def test_sql_runner_migration_and_manifest_mismatches_fail_before_execution(self):
        for name, error in [(rehearsal.SQL, 'REVIEWED_SQL_CHANGED'),
                            (rehearsal.RUNNER, 'REVIEWED_RUNNER_CHANGED'),
                            ('db/migrations/0012_business_workflows.sql', 'REVIEWED_MIGRATION_CHANGED'),
                            (rehearsal.MANIFEST, 'REVIEWED_MANIFEST_CHANGED')]:
            with self.subTest(file=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.make_release(root)
                with (root / name).open('ab') as file:
                    file.write(b'\n-- changed')
                with patch.object(rehearsal, 'ROOT', root), patch.object(rehearsal.subprocess, 'run') as run:
                    with self.assertRaisesRegex(ValueError, error):
                        rehearsal.main(['--reviewed-sha256', MIGRATION_SHA])
                    run.assert_not_called()

    def test_rehashed_sql_still_must_match_the_generator(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_release(root)
            path = root / rehearsal.SQL
            path.write_bytes(path.read_bytes().replace(b'SET CONSTRAINTS ALL IMMEDIATE;', b'SELECT 1;', 1))
            manifest = json.loads((root / rehearsal.MANIFEST).read_text())
            changed_sha = rehearsal.sha256(path.read_bytes())
            manifest['artifacts']['workflow-rehearsal.sql'] = changed_sha
            manifest['rehearsal']['sqlSha256'] = changed_sha
            (root / rehearsal.MANIFEST).write_text(json.dumps(manifest))
            self.seal_manifest(root)
            with self.assertRaisesRegex(ValueError, 'REVIEWED_SQL_GENERATOR_MISMATCH'):
                rehearsal.check_release(root, MIGRATION_SHA)

    def test_prepare_and_check_only_never_connect_to_docker_or_database(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_release(root)
            with patch.object(rehearsal, 'ROOT', root), patch.object(rehearsal.subprocess, 'run') as run:
                with contextlib.redirect_stdout(io.StringIO()) as output:
                    rehearsal.main(['--prepare-only', '--reviewed-sha256', MIGRATION_SHA])
                    rehearsal.main(['--check-only', '--reviewed-sha256', MIGRATION_SHA])
                self.assertIn('OFFLINE_CHECKSUMS_PASS_NOT_EXECUTED', output.getvalue())
                run.assert_not_called()
                self.assertFalse((root / 'data/workflow-sql-rehearsal.json').exists())


if __name__ == '__main__':
    unittest.main()
