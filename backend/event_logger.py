import sqlite3
from datetime import datetime

DB = "data/opensentinel.db"


def log_event(
    source_ip,
    username,
    event_type,
    status,
    details=""
):
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO events
        (timestamp, source_ip, username, event_type, status, details)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.now().isoformat(),
            source_ip,
            username,
            event_type,
            status,
            details
        )
    )

    conn.commit()
    conn.close()