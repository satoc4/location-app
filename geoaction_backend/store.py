from __future__ import annotations

import copy
import json
import os
import threading
from pathlib import Path
from typing import Callable, TypeVar

from .seed import default_state, merge_seed_defaults

T = TypeVar("T")


class JsonStore:
    def __init__(self, path: str | os.PathLike | None = None):
        self.path = Path(path or os.environ.get("GEOACTION_DB_PATH", "data/geoaction.local.json"))
        self._lock = threading.RLock()
        self._state: dict | None = None
        self._memory_only = str(self.path) == ":memory:"
        self._load()

    def view(self, reader: Callable[[dict], T]) -> T:
        with self._lock:
            return reader(copy.deepcopy(self._state))

    def transaction(self, writer: Callable[[dict], T]) -> T:
        with self._lock:
            state = copy.deepcopy(self._state)
            result = writer(state)
            self._state = state
            self._save()
            return result

    def reset(self) -> None:
        with self._lock:
            self._state = default_state()
            self._save()

    def _load(self) -> None:
        if self._memory_only:
            self._state = default_state()
            return

        if not self.path.exists():
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self._state = default_state()
            self._save()
            return

        self._state = json.loads(self.path.read_text(encoding="utf-8"))
        if merge_seed_defaults(self._state):
            self._save()

    def _save(self) -> None:
        if self._memory_only:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps(self._state, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        temporary.replace(self.path)
