"""Append a validated official Stats fetch to the season history."""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATS = ROOT / "src" / "data" / "officialStats.json"
HISTORY = ROOT / "src" / "data" / "officialHistory.json"
PLAYER_IDS = ("date", "watanabe", "hori", "shimoishi", "sasaki", "nakabayashi", "kurosawa", "katsumata")
SEASON = "2026-27"
JST = timezone(timedelta(hours=9))


def updated_history(stats: dict, history: dict) -> tuple[dict, bool]:
    if stats.get("season") != SEASON or history.get("season") != SEASON:
        raise ValueError("Unexpected season")
    fetched_at = stats.get("fetchedAt")
    if not isinstance(fetched_at, str):
        raise ValueError("Missing fetchedAt")
    fetched = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
    if fetched.tzinfo is None:
        raise ValueError("fetchedAt must include timezone")
    date = fetched.astimezone(JST).date().isoformat()
    players = stats.get("players") or {}
    if set(players) != set(PLAYER_IDS):
        raise ValueError("Expected exactly eight players")
    points = {}
    for player_id in PLAYER_IDS:
        if not isinstance(players[player_id], dict):
            raise ValueError(f"Invalid player record for {player_id}")
        value = players[player_id].get("point")
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
            raise ValueError(f"Invalid point for {player_id}")
        points[player_id] = value
    snapshots = history.get("snapshots")
    if not isinstance(snapshots, list):
        raise ValueError("Invalid history")
    for snapshot in snapshots:
        if not isinstance(snapshot, dict):
            raise ValueError("Invalid snapshot")
        if snapshot.get("date") == date and snapshot.get("pointsByPlayer") == points:
            return history, False
    if snapshots and snapshots[-1].get("pointsByPlayer") == points:
        return history, False
    snapshot = {
        "id": f"official-{fetched.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
        "date": date,
        "recordedAt": fetched.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "official",
        "pointsByPlayer": points,
        "statsByPlayer": players,
    }
    if any(item.get("id") == snapshot["id"] for item in snapshots):
        raise ValueError("Snapshot ID already exists with different points")
    return {"season": SEASON, "snapshots": [*snapshots, snapshot]}, True


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
    args = parser.parse_args(argv)
    try:
        stats = json.loads(args.stats.read_text(encoding="utf-8"))
        history = json.loads(args.history.read_text(encoding="utf-8")) if args.history.exists() else {"season": SEASON, "snapshots": []}
        updated, changed = updated_history(stats, history)
        if changed:
            atomic_write(args.history, updated)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"History update failed; existing JSON kept: {exc}", file=sys.stderr)
        return 1
    print("Added official snapshot" if changed else "Points unchanged; history unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
