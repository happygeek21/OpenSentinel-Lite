"""Generate realistic local security events for the OpenSentinel demo.

The generator writes the refined pipe-delimited file format and, by default,
persists the same events to SQLite so the live dashboard can observe them.
It never executes the generated search strings.
"""

from __future__ import annotations

import argparse
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from backend.analyzer import analyze_logs
from backend.database import create_database
from backend.event_logger import log_event


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOG_PATH = PROJECT_ROOT / "data" / "security.log"


@dataclass(frozen=True)
class DemoEvent:
    event_type: str
    status: str
    username: str
    source_ip: str
    details: str


DEMO_EVENTS = (
    DemoEvent("LOGIN", "SUCCESS", "employee_demo", "127.0.0.1", "Successful authentication"),
    DemoEvent("SEARCH", "REQUEST", "employee_demo", "127.0.0.1", "Search query: employee benefits"),
    DemoEvent("SEARCH", "REQUEST", "employee_demo", "127.0.0.1", "Search query: team directory"),
    DemoEvent("SEARCH", "REQUEST", "employee_demo", "127.0.0.1", "Search query: ' OR 1=1 --"),
    DemoEvent("SEARCH", "REQUEST", "employee_demo", "127.0.0.1", "Search query: UNION SELECT username FROM users --"),
    DemoEvent("SEARCH", "REQUEST", "employee_demo", "127.0.0.1", "Search query: /.env"),
    DemoEvent("LOGIN", "FAILED", "employee_demo", "127.0.0.1", "Invalid username or password"),
    DemoEvent("LOGIN", "FAILED", "employee_demo", "127.0.0.1", "Invalid username or password"),
    DemoEvent("LOGIN", "FAILED", "employee_demo", "127.0.0.1", "Invalid username or password"),
    DemoEvent("LOGIN", "FAILED", "employee_demo", "127.0.0.1", "Invalid username or password"),
    DemoEvent("LOGIN", "FAILED", "employee_demo", "127.0.0.1", "Invalid username or password"),
)


def write_file_event(event: DemoEvent, timestamp: str) -> str:
    line = (
        f"{timestamp} | {event.event_type} | "
        f"user={event.username} | ip={event.source_ip} | "
        f"status={event.status} | details={event.details}"
    )
    with LOG_PATH.open("a", encoding="utf-8") as log_file:
        log_file.write(f"{line}\n")
    return line


def generate_events(interval: float, count: int, overwrite: bool) -> None:
    create_database()
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    if overwrite:
        LOG_PATH.write_text("", encoding="utf-8")

    events = DEMO_EVENTS if count <= 0 else DEMO_EVENTS[:count]
    for event in events:
        timestamp = datetime.now().isoformat(timespec="seconds")
        line = write_file_event(event, timestamp)
        log_event(
            event.source_ip,
            event.username,
            event.event_type,
            event.status,
            event.details,
        )
        analyze_logs()
        print(line, flush=True)
        if interval > 0:
            time.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate OpenSentinel demo security events")
    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Seconds between events; use 0 for fastest execution",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=0,
        help="Number of events from the demo sequence; 0 emits the full sequence",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Keep existing security.log contents instead of overwriting them",
    )
    args = parser.parse_args()
    generate_events(max(args.interval, 0), max(args.count, 0), overwrite=not args.append)


if __name__ == "__main__":
    main()
