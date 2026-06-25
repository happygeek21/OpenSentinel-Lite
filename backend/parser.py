def parse_log(line):

    parts = line.strip().split("|")

    if len(parts) != 4:
        return None


    data = {
        "time": parts[0].strip(),
        "event": parts[1].strip(),
        "user": parts[2].split("=")[1].strip(),
        "ip": parts[3].split("=")[1].strip()
    }

    return data