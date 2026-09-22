import sqlite3

from backend.database import create_database, save_alert


DB = "data/opensentinel.db"

create_database()


# --------------------------------------------------
# SQL INJECTION PATTERNS
# --------------------------------------------------

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
    "--",
    "/*",
    "*/",
]

RECON_PATTERNS = [
    "/admin",
    "/.env",
    "/backup",
    "/config",
    "../../etc/passwd",
    "..\\..\\etc\\passwd",
]


def detect_sql_injection(details):
    """
    Detect common SQL injection patterns
    inside logged request details.
    """

    if not details:
        return False

    value = details.lower()

    for pattern in SQLI_PATTERNS:
        if pattern in value:
            return True

    return False


def detect_reconnaissance(details, status):
    value = (details or "").lower()
    if any(pattern in value for pattern in RECON_PATTERNS):
        return True
    return str(status or "").upper() in {"404", "INVALID", "NOT_FOUND"}


def classify_event(event):
    details = event["details"] or ""
    if detect_sql_injection(details):
        return "HIGH", 90
    if event["event_type"] == "LOGIN" and event["status"] == "FAILED":
        return "MEDIUM", 50
    if detect_reconnaissance(details, event["status"]):
        return "MEDIUM", 60
    return "NORMAL", 0


# --------------------------------------------------
# ALERT DATABASE FUNCTIONS
# --------------------------------------------------

def update_alert(alert):
    """
    Update an existing alert for the same
    threat type and source IP.

    Returns True if an existing alert was updated.
    """

    conn = sqlite3.connect(DB)
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE alerts
        SET attempts = ?,
            risk_score = ?,
            severity = ?,
            detection_method = ?,
            first_seen = COALESCE(?, first_seen),
            last_seen = COALESCE(?, last_seen),
            created_at = CURRENT_TIMESTAMP
        WHERE type = ?
        AND ip = ?
        AND (username = ? OR (username IS NULL AND ? IS NULL))
        """,
        (
            alert["attempts"],
            alert["risk"],
            alert["severity"],
            alert["detection_method"],
            alert.get("first_seen"),
            alert.get("last_seen"),
            alert["type"],
            alert["ip"],
            alert.get("username"),
            alert.get("username"),
        )
    )

    updated = cursor.rowcount

    conn.commit()
    conn.close()

    return updated > 0


# --------------------------------------------------
# MAIN ANALYZER
# --------------------------------------------------

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
    sql_attempts = {}
    recon_attempts = {}

    alerts = []

    total = len(events)

    # Annotate raw events so the live monitor can show risk without inventing data.
    update_conn = sqlite3.connect(DB)
    update_cursor = update_conn.cursor()
    for event in events:
        severity, risk = classify_event(event)
        update_cursor.execute(
            "UPDATE events SET severity = ?, risk_score = ? WHERE id = ?",
            (severity, risk, event["id"]),
        )
    update_conn.commit()
    update_conn.close()

    # --------------------------------------------------
    # 1. BRUTE FORCE DETECTION
    # --------------------------------------------------

    for event in events:

        if (
            event["event_type"] == "LOGIN"
            and event["status"] == "FAILED"
        ):

            key = (event["source_ip"], event["username"])
            failed_attempts[key] = failed_attempts.get(key, 0) + 1

    for (ip, username), count in failed_attempts.items():

        if count >= 5:

            # Risk scoring for brute-force attacks

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
                "username": username,
                "attempts": count,
                "risk": risk,
                "severity": severity,
                "detection_method": "Rule Engine",
                "first_seen": next(
                    event["timestamp"] for event in events
                    if event["source_ip"] == ip and event["username"] == username
                    and event["event_type"] == "LOGIN" and event["status"] == "FAILED"
                ),
                "last_seen": next(
                    event["timestamp"] for event in reversed(events)
                    if event["source_ip"] == ip and event["username"] == username
                    and event["event_type"] == "LOGIN" and event["status"] == "FAILED"
                ),
            }

            alerts.append(alert)

            # Update existing alert or create a new one

            if not update_alert(alert):
                save_alert(alert)

    # --------------------------------------------------
    # 2. SQL INJECTION DETECTION
    # --------------------------------------------------

    for event in events:

        details = event["details"]

        if detect_sql_injection(details):

            key = (event["source_ip"], event["username"])
            sql_attempts[key] = sql_attempts.get(key, 0) + 1

        if detect_reconnaissance(event["details"], event["status"]):
            key = (event["source_ip"], event["username"])
            recon_attempts[key] = recon_attempts.get(key, 0) + 1

    # --------------------------------------------------
    # 3. SQL INJECTION RISK SCORING
    # --------------------------------------------------

    for (ip, username), count in sql_attempts.items():

        # Risk increases with repeated attempts

        if count >= 3:
            risk = 90
            severity = "HIGH"

        elif count == 2:
            risk = 80
            severity = "HIGH"

        else:
            risk = 70
            severity = "MEDIUM"

        alert = {
            "type": "SQL_INJECTION",
            "ip": ip,
            "username": username,
            "attempts": count,
            "risk": risk,
            "severity": severity,
            "detection_method": "SQL Injection Rule",
            "first_seen": next(
                event["timestamp"] for event in events
                if event["source_ip"] == ip
                and event["username"] == username
                and detect_sql_injection(event["details"])
            ),
            "last_seen": next(
                event["timestamp"] for event in reversed(events)
                if event["source_ip"] == ip
                and event["username"] == username
                and detect_sql_injection(event["details"])
            ),
        }

        alerts.append(alert)

        # Update existing alert or create a new one

        if not update_alert(alert):
            save_alert(alert)

    # Recon alerts use the same correlation model as SQL injection and brute force.
    for (ip, username), count in recon_attempts.items():
        risk = 75 if count >= 3 else 60
        severity = "HIGH" if count >= 3 else "MEDIUM"
        alert = {
            "type": "RECONNAISSANCE",
            "ip": ip,
            "username": username,
            "attempts": count,
            "risk": risk,
            "severity": severity,
            "detection_method": "Suspicious Request Rule",
            "first_seen": next(
                event["timestamp"] for event in events
                if event["source_ip"] == ip
                and event["username"] == username
                and detect_reconnaissance(event["details"], event["status"])
            ),
            "last_seen": next(
                event["timestamp"] for event in reversed(events)
                if event["source_ip"] == ip
                and event["username"] == username
                and detect_reconnaissance(event["details"], event["status"])
            ),
        }
        alerts.append(alert)
        if not update_alert(alert):
            save_alert(alert)

    # --------------------------------------------------
    # 4. RETURN ANALYSIS RESULT
    # --------------------------------------------------

    if alerts:

        return {
            "status": "ALERT",
            "total_logs": total,
            "alerts": alerts,
        }

    return {
        "status": "SAFE",
        "total_logs": total,
        "alerts": [],
    }


# --------------------------------------------------
# COMMAND LINE EXECUTION
# --------------------------------------------------

if __name__ == "__main__":
    print(analyze_logs())