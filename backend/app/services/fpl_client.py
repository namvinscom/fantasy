"""
FPL API Client — wraps all calls to fantasy.premierleague.com/api
with in-memory caching (TTL-based) and graceful error handling.
"""
import json
import logging
import time
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[float, Any]] = {}


def _is_cached(key: str) -> bool:
    if key not in _cache:
        return False
    ts, _ = _cache[key]
    return time.time() - ts < settings.cache_ttl_seconds


def _get_cached(key: str) -> Any:
    return _cache[key][1]


def _set_cache(key: str, data: Any) -> None:
    _cache[key] = (time.time(), data)


def clear_cache() -> None:
    _cache.clear()
    logger.info("FPL cache cleared")


class FPLClient:
    BASE = settings.fpl_api_base_url
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://fantasy.premierleague.com/",
    }

    def __init__(self):
        self._client = httpx.Client(
            timeout=30.0,
            headers=self.HEADERS,
            follow_redirects=True,
            trust_env=False,
        )

    def _get(self, path: str, cache_key: str | None = None) -> dict | list | None:
        key = cache_key or path
        if _is_cached(key):
            logger.debug(f"Cache hit: {key}")
            return _get_cached(key)
        url = f"{self.BASE}/{path}"
        logger.info(f"FPL API GET {url}")
        try:
            resp = self._client.get(url)
            resp.raise_for_status()
            data = resp.json()
            _set_cache(key, data)
            return data
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} for {url}: {e}")
            return None
        except httpx.RequestError as e:
            logger.error(f"Request error for {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error for {url}: {e}")
            return None

    def get_bootstrap(self) -> dict | None:
        """Main endpoint: all players, teams, events, element_types."""
        return self._get("bootstrap-static/", "bootstrap")

    def get_fixtures(self, gameweek: int | None = None) -> list | None:
        """All fixtures or filtered by GW."""
        path = "fixtures/" if gameweek is None else f"fixtures/?event={gameweek}"
        key = "fixtures_all" if gameweek is None else f"fixtures_gw_{gameweek}"
        return self._get(path, key)

    def get_gw_live(self, gameweek: int) -> dict | None:
        """Live stats for a specific GW."""
        return self._get(f"event/{gameweek}/live/", f"gw_live_{gameweek}")

    def get_element_summary(self, player_id: int) -> dict | None:
        """History + upcoming fixtures for one player."""
        return self._get(f"element-summary/{player_id}/", f"element_{player_id}")

    def get_entry_picks(self, team_id: str, gameweek: int) -> dict | None:
        """Semi-public squad picks for a given team/GW (finished GWs)."""
        return self._get(f"entry/{team_id}/event/{gameweek}/picks/", f"picks_{team_id}_{gameweek}")

    def get_dream_team(self, gameweek: int) -> dict | None:
        """Dream team (best 11 players) for a finished GW."""
        return self._get(f"dream-team/{gameweek}/", f"dream_team_{gameweek}")

    def get_entry_info(self, team_id: str) -> dict | None:
        """Basic info about an FPL entry."""
        return self._get(f"entry/{team_id}/", f"entry_{team_id}")

    def close(self):
        self._client.close()


# Module-level singleton
fpl_client = FPLClient()
