from parser import parse_log


def analyze_logs():

    failed_attempts = {}

    alerts = []

    total = 0


    with open("data/security.log") as file:

        for line in file:

            log = parse_log(line)

            if log is None:
                continue


            total += 1


            ip = log["ip"]


            if log["event"] == "FAILED":

                if ip not in failed_attempts:
                    failed_attempts[ip] = 0


                failed_attempts[ip] += 1



    for ip, count in failed_attempts.items():

        if count >= 5:

            alerts.append(
                {
                    "type": "BRUTE_FORCE",
                    "ip": ip,
                    "attempts": count,
                    "severity": "HIGH"
                }
            )



    if len(alerts) > 0:

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