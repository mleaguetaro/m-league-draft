import json
import tempfile
import unittest
from pathlib import Path

from fetch_official_games import GamesParseError, parse_games_html
from update_official_history import PLAYER_IDS, SEASON, main, updated_history


def game(game_id, date, round_number, table, results):
    return {
        "gameId": game_id, "date": date, "round": round_number, "table": table,
        "players": [{"name": name, "point": point} for name, point in results],
    }


class OfficialHistoryTests(unittest.TestCase):
    def setUp(self):
        self.games = [
            game("match-01A", "2026-09-21", 1, "A", [("伊達朱里紗", 10), ("選手甲", 0), ("選手乙", 0), ("選手丙", -10)]),
            game("match-01B", "2026-09-21", 1, "B", [("仲林圭", 5), ("選手丁", 0), ("選手戊", 0), ("選手己", -5)]),
            game("match-02A", "2026-09-21", 2, "A", [("伊達朱里紗", -4), ("選手甲", 0), ("選手乙", 0), ("選手丙", 4)]),
        ]
        self.stats = {
            "season": SEASON,
            "fetchedAt": "2026-09-21T16:15:00Z",
            "players": {player_id: {"point": {"date": 6, "nakabayashi": 5}.get(player_id, 0),
                                   "games": {"date": 2, "nakabayashi": 1}.get(player_id, 0)}
                        for player_id in PLAYER_IDS},
        }
        self.empty = {"season": SEASON, "snapshots": []}

    def test_two_tables_and_repeat_player_remain_separate_games(self):
        result, changed = updated_history(self.stats, self.empty, self.games)
        self.assertTrue(changed)
        snapshots = result["snapshots"]
        self.assertEqual(len(snapshots), 3)
        self.assertEqual([(s["round"], s["table"]) for s in snapshots], [(1, "A"), (1, "B"), (2, "A")])
        self.assertEqual([s["pointsByPlayer"]["date"] for s in snapshots], [10, 10, 6])
        self.assertEqual([s["pointsByPlayer"]["nakabayashi"] for s in snapshots], [0, 5, 5])
        same, changed_again = updated_history(self.stats, result, self.games)
        self.assertFalse(changed_again)
        self.assertEqual(same, result)

    def test_stats_mismatch_does_not_replace_history(self):
        changed_stats = json.loads(json.dumps(self.stats))
        changed_stats["players"]["date"]["games"] = 3
        with self.assertRaisesRegex(ValueError, "Game count mismatch"):
            updated_history(changed_stats, self.empty, self.games)

    def test_parser_reads_results_and_game_ids(self):
        html = '''<div class="c-modal2" id="js-modal-key20260921-5"><div class="p-gamesResult__column">
          <div class="p-gamesResult__rank-item"><div class="p-gamesResult__name">伊達朱里紗</div><div class="p-gamesResult__point">10pt</div></div>
          <div class="p-gamesResult__rank-item"><div class="p-gamesResult__name">選手甲</div><div class="p-gamesResult__point">0pt</div></div>
          <div class="p-gamesResult__rank-item"><div class="p-gamesResult__name">選手乙</div><div class="p-gamesResult__point">0pt</div></div>
          <div class="p-gamesResult__rank-item"><div class="p-gamesResult__name">選手丙</div><div class="p-gamesResult__point">▲10pt</div></div>
          <form data-game-id="match-01A"></form></div></div>'''
        parsed = parse_games_html(html)
        self.assertEqual(parsed[0]["gameId"], "match-01A")
        self.assertEqual(parsed[0]["players"][-1]["point"], -10)
        with self.assertRaises(GamesParseError):
            parse_games_html(html.replace("▲10pt", "▲9pt"))

    def test_invalid_stats_preserve_existing_file(self):
        with tempfile.TemporaryDirectory() as temp:
            stats_path = Path(temp) / "stats.json"
            history_path = Path(temp) / "history.json"
            games_path = Path(temp) / "games.html"
            stats_path.write_text(json.dumps({**self.stats, "players": {}}), encoding="utf-8")
            original = json.dumps(self.empty)
            history_path.write_text(original, encoding="utf-8")
            games_path.write_text("<html></html>", encoding="utf-8")
            self.assertEqual(main(["--stats", str(stats_path), "--history", str(history_path), "--games-html", str(games_path)]), 1)
            self.assertEqual(history_path.read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
