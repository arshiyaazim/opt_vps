"""WhatsApp export parser format coverage.

Run: python3 tests/test_parse_import_formats.py
These tests exercise the real script through its stdin/stdout contract; no
database, network or credentials are involved.
"""
import base64
import json
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / 'scripts' / 'parse-import.py'


def parse(name: str, content: str):
    payload = json.dumps({'name': name, 'content': base64.b64encode(content.encode('utf-8')).decode('ascii')})
    result = subprocess.run([sys.executable, str(SCRIPT)], input=payload, capture_output=True, text=True)
    if result.returncode != 0:
        raise AssertionError(result.stderr.strip())
    return json.loads(result.stdout)


class WhatsAppTextFormats(unittest.TestCase):
    def test_plain_24_hour_export(self):
        out = parse('chat.txt', '03/10/2026, 13:24 - Hridoy: Mother Vessel: MV. Alpha\ncontinued line\n')
        self.assertEqual(out['kind'], 'conversation')
        self.assertEqual(len(out['rows']), 1)
        self.assertEqual(out['rows'][0]['senderLabel'], 'Hridoy')
        self.assertIn('continued line', out['rows'][0]['text'])
        self.assertTrue(out['rows'][0]['sourceTime'].startswith('2026-10-03T13:24'))

    def test_bracketed_24_hour_with_seconds(self):
        out = parse('chat.txt', '[03/10/2026, 13:24:05] Hridoy: Lighter Vessel: MV. Light One')
        self.assertEqual(len(out['rows']), 1)
        self.assertEqual(out['rows'][0]['sourceTime'], '2026-10-03T13:24:05+06:00')
        self.assertEqual(out['rows'][0]['senderLabel'], 'Hridoy')

    def test_bracketed_12_hour_am_pm(self):
        out = parse('chat.txt', '[03/10/2026, 1:24:05 PM] Hridoy: Master Mobile: 01829-984145')
        self.assertEqual(len(out['rows']), 1)
        self.assertTrue(out['rows'][0]['sourceTime'].startswith('2026-10-03T13:24'))
        midnight = parse('chat.txt', '[03/10/2026, 12:05:00 AM] Hridoy: test')
        self.assertTrue(midnight['rows'][0]['sourceTime'].startswith('2026-10-03T00:05'))

    def test_plain_12_hour_am_pm(self):
        out = parse('chat.txt', '03/10/2026, 1:24 PM - Hridoy: test')
        self.assertEqual(len(out['rows']), 1)
        self.assertTrue(out['rows'][0]['sourceTime'].startswith('2026-10-03T13:24'))

    def test_occurrence_ids_stay_unique_for_repeated_headers(self):
        out = parse('chat.txt', '03/10/2026, 13:24 - Hridoy: same\n03/10/2026, 13:24 - Hridoy: same\n')
        ids = [row['externalId'] for row in out['rows']]
        self.assertEqual(len(ids), 2)
        self.assertNotEqual(ids[0], ids[1])

    def test_unsupported_text_is_rejected_with_original_retained(self):
        with self.assertRaises(AssertionError) as context:
            parse('chat.txt', 'no timestamps here')
        self.assertIn('No supported WhatsApp text export', str(context.exception))


class StructuredFormats(unittest.TestCase):
    def test_csv_is_marked_structured_not_authoritative(self):
        out = parse('orders.csv', 'mother,lighter\nAlpha,Light One\n')
        self.assertEqual(out['kind'], 'structured')
        self.assertEqual(out['rows'][0]['mother'], 'Alpha')

    def test_json_records_wrapper(self):
        out = parse('orders.json', json.dumps({'records': [{'mother': 'Alpha'}]}))
        self.assertEqual(out['kind'], 'structured')
        self.assertEqual(out['rows'][0]['mother'], 'Alpha')


if __name__ == '__main__':
    unittest.main(verbosity=2)
