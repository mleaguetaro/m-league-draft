import json
import tempfile
import unittest
from pathlib import Path

from fetch_official_stats import METRICS, PLAYERS, StatsParseError, main, parse_stats_html


def fixture_html(season="2026-27", omit_player=None, invalid_field=None):
    names = list(PLAYERS.values())
    sections = []
    for group_index in range(2):
        group = names[group_index * 4:(group_index + 1) * 4]
        if omit_player in group:
            group.remove(omit_player)
        header = "<tr><th scope='row'>選手名</th>" + "".join(
            f"<th scope='col'>{name[:2]} {name[2:]}</th>" for name in group
        ) + "</tr>"
        rows = []
        for label, field in METRICS.items():
            if field == "games":
                value = "1"
            elif field == "rounds":
                value = "10"
            elif field == "point":
                value = "12.3"
            elif field == "averageRank":
                value = "1"
            elif field == "firstPlaceCount":
                value = "1"
            elif field in {"secondPlaceCount", "thirdPlaceCount", "fourthPlaceCount"}:
                value = "0"
            elif field == "bestScore":
                value = "50,000"
            elif field == "topRate":
                value = "100%"
            else:
                value = "0.5" if field.endswith("Rate") else "5000"
            if invalid_field == field:
                value = "invalid"
            rows.append(f"<tr><th scope='row'>{label}</th>" + "".join(f"<td>{value}</td>" for _ in group) + "</tr>")
        sections.append(f"<section><h2 class='p-stats__teamName'>Test Team {group_index + 1}</h2><table class='p-stats__table'>{header}{''.join(rows)}</table></section>")
    return f"<html><h1>Stats {season} チーム成績表</h1>{''.join(sections)}</html>"


class StatsParserTests(unittest.TestCase):
    def test_eight_players_and_fields(self):
        data = parse_stats_html(fixture_html(), "2026-09-23T00:00:00Z")
        self.assertEqual(len(data["players"]), 8)
        self.assertEqual(data["players"]["date"]["name"], "伊達朱里紗")
        self.assertEqual(data["players"]["date"]["point"], 12.3)
        self.assertEqual(data["players"]["date"]["bestScore"], 50000)
        self.assertEqual(data["players"]["date"]["topRate"], 1.0)
        self.assertEqual(data["players"]["date"]["officialTeam"], "Test Team 1")
        self.assertEqual(len(data["players"]["date"]), 21)

    def test_rejects_incomplete_or_wrong_season(self):
        with self.assertRaises(StatsParseError):
            parse_stats_html(fixture_html(omit_player="伊達朱里紗"), "2026-09-23T00:00:00Z")
        with self.assertRaises(StatsParseError):
            parse_stats_html(fixture_html(invalid_field="point"), "2026-09-23T00:00:00Z")
        with self.assertRaises(StatsParseError):
            parse_stats_html(fixture_html(season="2025-26"), "2026-09-23T00:00:00Z")

    def test_failure_keeps_existing_json(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "officialStats.json"
            html_file = Path(directory) / "broken.html"
            output.write_text('{"existing": true}', encoding="utf-8")
            html_file.write_text("<html>broken</html>", encoding="utf-8")
            self.assertEqual(main(["--html-file", str(html_file), "--output", str(output)]), 1)
            self.assertEqual(json.loads(output.read_text(encoding="utf-8")), {"existing": True})


if __name__ == "__main__":
    unittest.main()
