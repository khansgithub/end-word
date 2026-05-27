"""Clone or update spellcheck-ko/korean-dict-nikl."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

REPO_URL = "https://github.com/spellcheck-ko/korean-dict-nikl.git"


def ensure_nikl_repo(path: Path, *, skip_clone: bool = False) -> Path:
    path = path.resolve()
    if path.exists() and (path / "krdict").is_dir():
        logger.info("Using existing NIKL repo at %s", path)
        return path

    if skip_clone:
        raise FileNotFoundError(
            f"NIKL repo not found at {path}. Run without --skip-clone or clone manually."
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Cloning %s -> %s (shallow; may take a while)", REPO_URL, path)
    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            REPO_URL,
            str(path),
        ],
        check=True,
    )
    return path
