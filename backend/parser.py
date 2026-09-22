"""Parse OpenSentinel's legacy and refined pipe-delimited log formats."""


def parse_log(line):
    """Return a normalized event dictionary, or ``None`` for malformed input."""

    parts = [part.strip() for part in line.strip().split("|")]
    if len(parts) < 4:
        return None

    event = {
        "time": parts[0],
        "event": parts[1],
        "user": "",
        "ip": "",
        "status": "",
        "details": "",
    }

    for part in parts[2:]:
        key, separator, value = part.partition("=")
        if not separator:
            continue
        key = key.strip().lower()
        if key == "user":
            event["user"] = value.strip()
        elif key == "ip":
            event["ip"] = value.strip()
        elif key == "status":
            event["status"] = value.strip()
        elif key == "details":
            event["details"] = value.strip()

    # Legacy records used the event field for SUCCESS/FAILED status.
    if not event["status"] and event["event"] in {"SUCCESS", "FAILED"}:
        event["status"] = event["event"]
        event["event"] = "LOGIN"

    if not event["user"] or not event["ip"]:
        return None

    return event
