"""Build per-game point history, reconciling it with official season Stats."""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path
from urllib.error import URLError

from fetch_official_games import SOURCE_URL, fetch_games_html, parse_games_html

ROOT = Path(__file__).resolve().parents[1]
STATS = ROOT / "src" / "data" / "officialStats.json"
HISTORY = ROOT / "src" / "data" / "officialHistory.json"
PLAYER_IDS = ("date", "watanabe", "hori", "shimoishi", "sasaki", "nakabayashi", "kurosawa", "katsumata")
SEASON = "2026-27"
PLAYER_NAMES = {
    "date": "伊達朱里紗", "watanabe": "渡辺太", "hori": "堀慎吾", "shimoishi": "下石戟",
    "sasaki": "佐々木寿人", "nakabayashi": "仲林圭", "kurosawa": "黒沢咲", "katsumata": "勝又健志",
}


def updated_history(stats: dict, history: dict, games: list[dict]) -> tuple[dict, bool]:
    if stats.get("season") != SEASON or history.get("season") != SEASON:
        raise ValueError("Unexpected season")
    players = stats.get("players") or {}
    if set(players) != set(PLAYER_IDS):
        raise ValueError("Expected exactly eight players")
    for player_id in PLAYER_IDS:
        if not isinstance(players[player_id], dict) or not isinstance(players[player_id].get("games"), int):
            raise ValueError(f"Invalid player record for {player_id}")
        if not isinstance(players[player_id].get("point"), (int, float)):
            raise ValueError(f"Invalid point for {player_id}")
    if not isinstance(history.get("snapshots"), list):
        raise ValueError("Invalid history")
    if not games:
        raise ValueError("No official game results")
    name_to_id = {name: player_id for player_id, name in PLAYER_NAMES.items()}
    totals = {player_id: 0.0 for player_id in PLAYER_IDS}
    counts = {player_id: 0 for player_id in PLAYER_IDS}
    snapshots = []
    for game in games:
        changes = {}
        for result in game["players"]:
            player_id = name_to_id.get(result["name"])
            if player_id:
                totals[player_id] = round(totals[player_id] + result["point"], 1)
                counts[player_id] += 1
                changes[player_id] = result["point"]
        if not changes:
            continue
        snapshots.append({
            "id": f"official-game-{game['gameId']}",
            "date": game["date"],
            "recordedAt": f"{game['date']}T00:00:00+09:00",
            "round": game["round"],
            "table": game["table"],
            "matchId": game["gameId"],
            "source": "official-game",
            "gamePointsByPlayer": changes,
            "pointsByPlayer": totals.copy(),
            "statsByPlayer": {},
        })
    for player_id in PLAYER_IDS:
        if counts[player_id] != players[player_id]["games"]:
            raise ValueError(f"Game count mismatch for {PLAYER_NAMES[player_id]}")
        if abs(totals[player_id] - players[player_id]["point"]) > 0.11:
            raise ValueError(f"Point mismatch for {PLAYER_NAMES[player_id]}")
    updated = {"season": SEASON, "sourceUrl": SOURCE_URL, "snapshots": snapshots}
    return (history, False) if history == updated else (updated, True)


def atomic_write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False) as file:
            temp_name = file.name
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(temp_name, path)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stats", type=Path, default=STATS)
    parser.add_argument("--history", type=Path, default=HISTORY)
    parser.add_argument("--games-html", type=Path, help="Parse saved official games HTML instead of fetching")
    args = parser.parse_args(argv)
    try:
        stats = json.loads(args.stats.read_text(encoding="utf-8"))
        history = json.loads(args.history.read_text(encoding="utf-8")) if args.history.exists() else {"season": SEASON, "snapshots": []}
        games_html = args.games_html.read_text(encoding="utf-8") if args.games_html else fetch_games_html()
        games = parse_games_html(games_html)
        updated, changed = updated_history(stats, history, games)
        if changed:
            atomic_write(args.history, updated)
    except (OSError, URLError, ValueError, KeyError, TypeError) as exc:
        print(f"History update failed; existing JSON kept: {exc}", file=sys.stderr)
        return 1
    print("Updated individual game history" if changed else "Game history unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
