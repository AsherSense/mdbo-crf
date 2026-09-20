import json
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from backend import BackendError, CRFClient, record_defaults, records_for_pane


class BackendTests(unittest.TestCase):
    def test_schema_matches_js_export(self):
        schema = json.loads((Path(__file__).parent / "schema.json").read_text(encoding="utf-8"))
        self.assertEqual(len(schema["modules"]), 15)
        self.assertEqual(sum(len(module["fields"]) for module in schema["modules"]), 204)
        self.assertEqual(len(schema["workflow"]), 11)

    def test_only_configured_worker_is_accepted(self):
        for url in ("http://mdbo-crf.ashersense-research.workers.dev", "https://example.com", "https://mdbo-crf.ashersense-research.workers.dev/other"):
            with self.assertRaises(ValueError):
                CRFClient(url, "secret", "researcher@example.org")

    def test_request_passes_token_only_to_worker(self):
        client = CRFClient("https://mdbo-crf.ashersense-research.workers.dev", "secret", "researcher@example.org")
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b'{"patients":[]}'
        with patch("backend.urlopen", return_value=response) as opener:
            self.assertEqual(client.patients(), {"patients": []})
            req = opener.call_args.args[0]
            self.assertEqual(req.get_header("Authorization"), "Bearer secret")
            self.assertEqual(req.get_header("X-crf-actor"), "researcher@example.org")
            self.assertEqual(req.full_url, "https://mdbo-crf.ashersense-research.workers.dev/api/patients")

    def test_errors_are_not_silently_swallowed(self):
        client = CRFClient("https://mdbo-crf.ashersense-research.workers.dev", "secret", "researcher@example.org")
        error = HTTPError("url", 409, "Conflict", {}, __import__("io").BytesIO('{"error":"版本冲突"}'.encode()))
        with patch("backend.urlopen", side_effect=error):
            with self.assertRaisesRegex(BackendError, "版本冲突"):
                client.patients()

    def test_repeated_visit_context(self):
        pane = {"module": "therapy", "context": "围术期"}
        records = [{"module": "therapy", "data": {"visit": "围术期"}}, {"module": "therapy", "data": {"visit": "术前"}}]
        self.assertEqual(records_for_pane(records, pane), records[:1])
        self.assertEqual(record_defaults(pane), {"visit": "围术期"})


if __name__ == "__main__":
    unittest.main()
