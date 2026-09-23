"""Read individual regular-season games from the official M.LEAGUE results page."""

from __future__ import annotations

import re
import unicodedata
from html.parser import HTMLParser
from urllib.request import Request, urlopen

SOURCE_URL = "https://m-league.jp/games/"
SEASON_START = "2026-09-01"
SEASON_END = "2027-06-30"


class GamesParseError(ValueError):
    """The published match result markup is missing or inconsistent."""


def _score(raw: str) -> float:
    value = unicodedata.normalize("NFKC", raw).strip().replace(",", "").replace("pt", "")
    value = value.replace("▲", "-").replace("△", "-").replace("−", "-")
    if not re.fullmatch(r"[+-]?\d+(?:\.\d+)?", value):
        raise GamesParseError(f"Invalid game point: {raw!r}")
    return float(value)


class _GamesHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict] = []
        self.modal: dict | None = None
        self.column: dict | None = None
        self.rank: dict | None = None
        self.capture: dict | None = None
        self.games: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").split())
        marker: dict = {"tag": tag}
        match = re.fullmatch(r"js-modal-key(\d{8})-\d+", attrs.get("id") or "")
        if tag == "div" and "c-modal2" in classes and match:
            date = f"{match.group(1)[:4]}-{match.group(1)[4:6]}-{match.group(1)[6:]}"
            if SEASON_START <= date <= SEASON_END:
                self.modal = {"date": date, "columns": []}
                marker["modal"] = True
        elif self.modal and tag == "div" and "p-gamesResult__column" in classes:
            self.column = {"round": len(self.modal["columns"]) + 1, "players": [], "gameId": None}
            marker["column"] = True
        elif self.column and tag == "div" and "p-gamesResult__rank-item" in classes:
            self.rank = {}
            marker["rank"] = True
        elif self.rank is not None and tag == "div" and "p-gamesResult__name" in classes:
            self.capture = {"field": "name", "text": []}
            marker["capture"] = True
        elif self.rank is not None and tag == "div" and "p-gamesResult__point" in classes:
            self.capture = {"field": "point", "text": []}
            marker["capture"] = True
        elif self.column and tag == "form" and attrs.get("data-game-id"):
            self.column["gameId"] = attrs["data-game-id"]
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(marker)

    def handle_data(self, data: str) -> None:
        if self.capture is not None:
            self.capture["text"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            return
        if not self.stack:
            return
        marker = self.stack.pop()
        if marker["tag"] != tag:
            raise GamesParseError(f"Unexpected closing tag: {tag}")
        if marker.get("capture"):
            self.rank[self.capture["field"]] = "".join(self.capture["text"]).strip()
            self.capture = None
        if marker.get("rank"):
            if self.rank.get("name") and self.rank.get("point"):
                self.column["players"].append(self.rank)
            self.rank = None
        if marker.get("column"):
            self.modal["columns"].append(self.column)
            self.column = None
        if marker.get("modal"):
            for column in self.modal["columns"]:
                if column["gameId"]:
                    self.games.append({"date": self.modal["date"], **column})
            self.modal = None


def parse_games_html(html: str) -> list[dict]:
    parser = _GamesHTMLParser()
    parser.feed(html)
    if not parser.games:
        raise GamesParseError("No completed games found")
    unique: dict[str, dict] = {}
    for game in parser.games:
        game_id = game["gameId"]
        if not re.fullmatch(r"[A-Za-z0-9_-]+", game_id):
            raise GamesParseError(f"Invalid game ID: {game_id!r}")
        if len(game["players"]) != 4:
            raise GamesParseError(f"Expected four results in {game_id}")
        players = [{"name": item["name"], "point": _score(item["point"])} for item in game["players"]]
        if len({item["name"] for item in players}) != 4 or abs(sum(item["point"] for item in players)) > 0.11:
            raise GamesParseError(f"Invalid four-player result in {game_id}")
        clean = {
            "gameId": game_id,
            "date": game["date"],
            "round": game["round"],
            "table": game_id[-1].upper(),
            "players": players,
        }
        if game_id in unique and unique[game_id] != clean:
            raise GamesParseError(f"Conflicting game ID: {game_id}")
        unique[game_id] = clean
    return sorted(unique.values(), key=lambda item: (item["date"], item["round"], item["table"], item["gameId"]))


def fetch_games_html() -> str:
    request = Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0 (compatible; MLeagueDraft/0.4)"})
    with urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8")
