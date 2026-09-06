import sqlite3

from backend.database import create_database, save_alert


DB = "data/opensentinel.db"

create_database()


SQLI_PATTERNS = [
    "' or ",
    '" or ',
    " or 1=1",
    "'--",
    '"--',
    "union select",
    "union all select",
    "drop table",
    "insert into",
    "delete from",
    "update ",
    "select ",
]


def detect_sql_injection(details):
    if not details:
        return False

    value = details.lower()

    for pattern in SQLI_PATTERNS:
        if pattern in value:
            return True

    return False


def alert_exists(alert_type, ip):
    """
    Prevent duplicate alerts for the same threat type and source IP.
    """

    conn = sqlite3.connect(DB)
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT 1
        FROM alerts
        WHERE type = ?
        AND ip = ?
        LIMIT 1
        """,
        (alert_type, ip)
    )

    exists = cursor.fetchone() is not None

    conn.close()

    return exists


def analyze_logs():

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT *
        FROM events
        ORDER BY id ASC
        """
    )

    events = cursor.fetchall()
    conn.close()

    failed_attempts = {}
    alerts = []

    total = len(events)

    # --------------------------------------------------
    # 1. BRUTE FORCE DETECTION
    # --------------------------------------------------

    for event in events:

        if (
            event["event_type"] == "LOGIN"
            and event["status"] == "FAILED"
        ):

            ip = event["source_ip"]

            if ip not in failed_attempts:
                failed_attempts[ip] = 0

            failed_attempts[ip] += 1

    for ip, count in failed_attempts.items():

        if count >= 5:

            if count >= 10:
                risk = 95
                severity = "CRITICAL"

            elif count >= 7:
                risk = 90
                severity = "HIGH"

            else:
                risk = 80
                severity = "HIGH"

            alert = {
                "type": "BRUTE_FORCE",
                "ip": ip,
                "attempts": count,
                "risk": risk,
                "severity": severity,
                "detection_method": "Rule Engine"
            }

            alerts.append(alert)

            if not alert_exists("BRUTE_FORCE", ip):
                save_alert(alert)

    # --------------------------------------------------
    # 2. SQL INJECTION DETECTION
    # --------------------------------------------------

    detected_sql_ips = set()

    for event in events:

        details = event["details"]

        if detect_sql_injection(details):

            ip = event["source_ip"]

            # Avoid detecting the same source repeatedly
            if ip in detected_sql_ips:
                continue

            detected_sql_ips.add(ip)

            alert = {
                "type": "SQL_INJECTION",
                "ip": ip,
                "attempts": 1,
                "risk": 90,
                "severity": "HIGH",
                "detection_method": "SQL Injection Rule"
            }

            alerts.append(alert)

            if not alert_exists("SQL_INJECTION", ip):
                save_alert(alert)

    # --------------------------------------------------
    # RESULT
    # --------------------------------------------------

    if alerts:

        return {
            "status": "ALERT",
            "total_logs": total,
            "alerts": alerts
        }

    return {
        "status": "SAFE",
        "total_logs": total,
        "alerts": []
    }


if __name__ == "__main__":
    print(analyze_logs())