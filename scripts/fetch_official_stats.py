"""Fetch the eight draft players' regular-season stats from M.LEAGUE."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SOURCE_URL = "https://m-league.jp/stats/"
SEASON = "2026-27"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "officialStats.json"

PLAYERS = {
    "date": "伊達朱里紗",
    "watanabe": "渡辺太",
    "hori": "堀慎吾",
    "shimoishi": "下石戟",
    "sasaki": "佐々木寿人",
    "nakabayashi": "仲林圭",
    "kurosawa": "黒沢咲",
    "katsumata": "勝又健志",
}

METRICS = {
    "試合数": "games",
    "総局数": "rounds",
    "ポイント": "point",
    "平着": "averageRank",
    "1位": "firstPlaceCount",
    "2位": "secondPlaceCount",
    "3位": "thirdPlaceCount",
    "4位": "fourthPlaceCount",
    "トップ率": "topRate",
    "連対率": "rentaiRate",
    "ラス回避率": "avoidLastRate",
    "ベストスコア": "bestScore",
    "平均打点": "averageScore",
    "副露率": "callRate",
    "リーチ率": "reachRate",
    "アガリ率": "winRate",
    "放銃率": "dealInRate",
    "放銃平均打点": "averageDealIn",
}

COUNT_FIELDS = {"games", "rounds", "firstPlaceCount", "secondPlaceCount", "thirdPlaceCount", "fourthPlaceCount", "bestScore"}
RATE_FIELDS = {"topRate", "rentaiRate", "avoidLastRate", "callRate", "reachRate", "winRate", "dealInRate"}


class StatsParseError(ValueError):
    """The official page no longer has the expected complete stats table."""


def normalize(value: str) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value))


def parse_number(value: str, field: str) -> int | float:
    clean = unicodedata.normalize("NFKC", value).replace(",", "").strip()
    is_percent = clean.endswith("%")
    if is_percent:
        clean = clean[:-1].strip()
    try:
        number = float(clean)
    except ValueError as exc:
        raise StatsParseError(f"Invalid {field}: {value!r}") from exc
    if not math.isfinite(number):
        raise StatsParseError(f"Non-finite {field}: {value!r}")
    if is_percent:
        number /= 100
    if field in COUNT_FIELDS:
        if not number.is_integer() or number < 0:
            raise StatsParseError(f"Invalid count for {field}: {value!r}")
        return int(number)
    if field in RATE_FIELDS and not 0 <= number <= 1:
        raise StatsParseError(f"Invalid rate for {field}: {value!r}")
    return number


def parse_stats_html(html: str, fetched_at: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    season_heading = any(f"Stats{SEASON}" in normalize(tag.get_text(" ", strip=True)) for tag in soup.find_all(["h1", "h2"]))
    if not season_heading:
        raise StatsParseError(f"Expected {SEASON} regular-season heading is missing")

    wanted = {normalize(name): player_id for player_id, name in PLAYERS.items()}
    found: dict[str, dict] = {}
    for table in soup.select("table.p-stats__table") or soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue
        header = rows[0].find_all(["th", "td"], recursive=False)
        if not header or normalize(header[0].get_text(" ", strip=True)) != "選手名":
            continue
        names = [normalize(cell.get_text(" ", strip=True)) for cell in header[1:]]
        columns = [(index, wanted[name]) for index, name in enumerate(names) if name in wanted]
        if not columns:
            continue

        values_by_label = {}
        for row in rows[1:]:
            cells = row.find_all(["th", "td"], recursive=False)
            if not cells:
                continue
            label = normalize(cells[0].get_text(" ", strip=True))
            if label in METRICS:
                values_by_label[label] = [cell.get_text(" ", strip=True) for cell in cells[1:]]
        missing_labels = set(METRICS) - set(values_by_label)
        if missing_labels:
            raise StatsParseError(f"Missing stats rows: {sorted(missing_labels)}")

        team_heading = table.find_previous("h2", class_="p-stats__teamName")
        official_team = team_heading.get_text(" ", strip=True) if team_heading else None
        for column, player_id in columns:
            if player_id in found:
                raise StatsParseError(f"Duplicate player: {PLAYERS[player_id]}")
            record = {"id": player_id, "name": PLAYERS[player_id], "officialTeam": official_team}
            for label, field in METRICS.items():
                values = values_by_label[label]
                if column >= len(values):
                    raise StatsParseError(f"Missing {field} for {PLAYERS[player_id]}")
                record[field] = parse_number(values[column], field)
            if sum(record[field] for field in ("firstPlaceCount", "secondPlaceCount", "thirdPlaceCount", "fourthPlaceCount")) != record["games"]:
                raise StatsParseError(f"Rank counts do not match games for {PLAYERS[player_id]}")
            found[player_id] = record

    missing_players = set(PLAYERS) - set(found)
    if missing_players:
        raise StatsParseError(f"Missing players: {[PLAYERS[player_id] for player_id in sorted(missing_players)]}")
    return {
        "season": SEASON,
        "sourceUrl": SOURCE_URL,
        "fetchedAt": fetched_at,
        "players": {player_id: found[player_id] for player_id in PLAYERS},
    }


def fetch_html() -> str:
    response = requests.get(SOURCE_URL, timeout=25, headers={"User-Agent": "Mozilla/5.0 (compatible; MLeagueDraft/0.3)"})
    response.raise_for_status()
    return response.content.decode("utf-8")


def atomic_write_json(output: Path, data: dict) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output.parent, prefix=output.name + ".", suffix=".tmp", delete=False) as temp_file:
            temp_name = temp_file.name
            json.dump(data, temp_file, ensure_ascii=False, indent=2)
            temp_file.write("\n")
        os.replace(temp_name, output)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--html-file", type=Path, help="Parse a saved HTML file instead of making a request")
    args = parser.parse_args(argv)
    try:
        html = args.html_file.read_text(encoding="utf-8") if args.html_file else fetch_html()
        fetched_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        data = parse_stats_html(html, fetched_at)
        atomic_write_json(args.output, data)
    except (OSError, requests.RequestException, StatsParseError, UnicodeError) as exc:
        print(f"Stats update failed; existing JSON kept: {exc}", file=sys.stderr)
        return 1
    print(f"Saved {len(data['players'])} players to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
