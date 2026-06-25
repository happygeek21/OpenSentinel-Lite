import time
import random
from datetime import datetime


events = [
    "SUCCESS",
    "SUCCESS",
    "FAILED",
    "FAILED",
    "FAILED"
]


users = [
    "alice",
    "bob",
    "admin"
]


ips = [
    "192.168.1.10",
    "192.168.1.20",
    "192.168.1.50"
]


while True:

    event = random.choice(events)
    user = random.choice(users)
    ip = random.choice(ips)

    log = (
        f"{datetime.now()} | "
        f"{event} | "
        f"user={user} | "
        f"ip={ip}"
    )


    with open("data/security.log","a") as file:
        file.write(log+"\n")


    print(log)

    time.sleep(2)