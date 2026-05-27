#!/usr/bin/env python3
"""
Build Korean English-equivalent index, run WordNet+Korean compare (TS), emit dashboard.

Dry run (default --limit 10):
  python -m scripts.en_ko_coverage.main --use-local-data --max-xml-files 1

Logs: scripts/run-en-ko-coverage.sh (tee)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from pathlib import Path

from .build_index import build_index, build_index_from_files, load_index, save_index
from .dashboard import build_dashboard_html, write_dashboard
from .nikl_repo import ensure_nikl_repo

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = REPO_ROOT / "scripts" / "output"
DEFAULT_NIKL = REPO_ROOT / "vendor" / "korean-dict-nikl"
INDEX_FILENAME = "korean-english-index.json"
JSONL_FILENAME = "en-ko-coverage.jsonl"
DASHBOARD_FILENAME = "en-ko-coverage-dashboard.html"
SUMMARY_FILENAME = "en-ko-coverage-summary.json"
LOG_FILENAME = "en-ko-coverage.log"
COMPARE_SCRIPT = REPO_ROOT / "scripts" / "en-ko-coverage-compare.ts"


def _configure_logging(verbose: bool, log_file: Path | None) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
        force=True,
    )


def _default_workers() -> int:
    count = os.cpu_count() or 4
    return max(1, count - 1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Index NIKL Korean dict, compare via WordNet (wordnet.ts) then Korean index."
        ),
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Max English words to check (default: 10). Use 0 for full list.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=_default_workers(),
        help="Parallel workers for XML parsing (default: cpu_count - 1).",
    )
    parser.add_argument(
        "--nikl-path",
        type=Path,
        default=DEFAULT_NIKL,
        help="Path to korean-dict-nikl clone.",
    )
    parser.add_argument(
        "--use-local-data",
        action="store_true",
        help="Use dictionary/data/*.xml instead of vendor clone (fast dry-run).",
    )
    parser.add_argument(
        "--max-xml-files",
        type=int,
        default=None,
        help="Cap XML files parsed per dataset (dry-run speed).",
    )
    parser.add_argument(
        "--skip-clone",
        action="store_true",
        help="Do not git clone; fail if NIKL path missing.",
    )
    parser.add_argument(
        "--skip-index",
        action="store_true",
        help="Reuse existing korean-english-index.json.",
    )
    parser.add_argument(
        "--skip-compare",
        action="store_true",
        help="Skip TS compare (dashboard only from existing JSONL).",
    )
    parser.add_argument(
        "--index-only",
        action="store_true",
        help="Only build Korean index; do not compare or render dashboard.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Directory for JSONL, HTML, index, and logs.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="DEBUG logging.",
    )
    return parser.parse_args()


def _build_korean_index(args: argparse.Namespace, output_dir: Path) -> dict[str, list[str]]:
    index_path = output_dir / INDEX_FILENAME
    if args.skip_index and index_path.is_file():
        logging.getLogger("en_ko_coverage").info(
            "Loading cached index from %s", index_path
        )
        return load_index(index_path)

    if args.use_local_data:
        index_root = REPO_ROOT / "dictionary" / "data"
        xml_files = [
            ("krdict", str(p.resolve())) for p in sorted(index_root.glob("*.xml"))
        ]
        if args.max_xml_files is not None:
            xml_files = xml_files[: args.max_xml_files]
        logging.getLogger("en_ko_coverage").info(
            "Building index from local dictionary/data (%s files)", len(xml_files)
        )
        korean_index = build_index_from_files(xml_files, workers=args.workers)
    else:
        nikl_root = ensure_nikl_repo(args.nikl_path, skip_clone=args.skip_clone)
        korean_index = build_index(
            nikl_root,
            workers=args.workers,
            max_files=args.max_xml_files,
        )

    save_index(korean_index, index_path)
    return korean_index


def _run_compare(args: argparse.Namespace, output_dir: Path) -> None:
    log = logging.getLogger("en_ko_coverage")
    env = os.environ.copy()
    env["OUTPUT_DIR"] = str(output_dir.resolve())
    env["KOREAN_INDEX_PATH"] = str((output_dir / INDEX_FILENAME).resolve())
    env["LIMIT"] = str(args.limit)

    cmd = ["npx", "tsx", str(COMPARE_SCRIPT), "--limit", str(args.limit)]
    log.info("Running WordNet + Korean compare: %s", " ".join(cmd))
    subprocess.run(cmd, cwd=REPO_ROOT, env=env, check=True)


def _render_dashboard(output_dir: Path) -> None:
    log = logging.getLogger("en_ko_coverage")
    jsonl_path = output_dir / JSONL_FILENAME
    summary_path = output_dir / SUMMARY_FILENAME
    if not jsonl_path.is_file():
        raise FileNotFoundError(f"Missing compare output: {jsonl_path}")

    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    dashboard_path = output_dir / DASHBOARD_FILENAME
    html = build_dashboard_html(jsonl_path=jsonl_path, summary=summary)
    write_dashboard(html, dashboard_path)
    log.info("Dashboard: %s", dashboard_path)


def main() -> int:
    args = parse_args()
    output_dir: Path = args.output_dir
    log_path = output_dir / LOG_FILENAME
    _configure_logging(args.verbose, log_path)
    log = logging.getLogger("en_ko_coverage")

    started = time.perf_counter()
    try:
        korean_index = _build_korean_index(args, output_dir)
        log.info("Korean index: %s English tokens", len(korean_index))

        if args.index_only:
            log.info("--index-only: done")
            return 0

        if not args.skip_compare:
            _run_compare(args, output_dir)

        _render_dashboard(output_dir)

        summary_path = output_dir / SUMMARY_FILENAME
        if summary_path.is_file():
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
            summary["total_duration_sec"] = round(time.perf_counter() - started, 2)
            summary_path.write_text(
                json.dumps(summary, indent=2), encoding="utf-8"
            )
            log.info("Summary: %s", summary)

        return 0

    except Exception:
        log.exception("Coverage run failed")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
