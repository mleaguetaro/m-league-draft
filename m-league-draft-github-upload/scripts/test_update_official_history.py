import copy
import json
import tempfile
import unittest
from pathlib import Path

from update_official_history import PLAYER_IDS, SEASON, main, updated_history


class OfficialHistoryTests(unittest.TestCase):
    def setUp(self):
        self.stats = {
            "season": SEASON,
            "fetchedAt": "2026-09-23T16:15:00Z",
            "players": {player_id: {"point": index * 1.5} for index, player_id in enumerate(PLAYER_IDS)},
        }
        self.empty = {"season": SEASON, "snapshots": []}

    def test_adds_snapshot_once_per_jst_date_and_points(self):
        result, changed = updated_history(self.stats, self.empty)
        self.assertTrue(changed)
        self.assertEqual(result["snapshots"][0]["date"], "2026-09-24")
        self.assertEqual(result["snapshots"][0]["pointsByPlayer"]["date"], 0)
        same, changed_again = updated_history(self.stats, result)
        self.assertFalse(changed_again)
        self.assertEqual(same, result)
        next_day = copy.deepcopy(self.stats)
        next_day["fetchedAt"] = "2026-09-24T16:15:00Z"
        same, changed_next_day = updated_history(next_day, result)
        self.assertFalse(changed_next_day)
        self.assertEqual(same, result)
        revised = copy.deepcopy(self.stats)
        revised["fetchedAt"] = "2026-09-23T17:15:00Z"
        revised["players"]["date"]["point"] = -2.5
        result, changed = updated_history(revised, result)
        self.assertTrue(changed)
        self.assertEqual(len(result["snapshots"]), 2)

    def test_invalid_stats_preserve_existing_file(self):
        with tempfile.TemporaryDirectory() as temp:
            stats_path = Path(temp) / "stats.json"
            history_path = Path(temp) / "history.json"
            stats_path.write_text(json.dumps({**self.stats, "players": {}}), encoding="utf-8")
            original = json.dumps(self.empty)
            history_path.write_text(original, encoding="utf-8")
            self.assertEqual(main(["--stats", str(stats_path), "--history", str(history_path)]), 1)
            self.assertEqual(history_path.read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
