import sqlite3


DB = "data/opensentinel.db"



def create_database():

    conn = sqlite3.connect(DB)

    cursor = conn.cursor()


    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS alerts
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            ip TEXT,
            attempts INTEGER,
            severity TEXT
        )
        """
    )


    conn.commit()
    conn.close()



def save_alert(alert):

    conn = sqlite3.connect(DB)

    cursor = conn.cursor()


    cursor.execute(
        """
        INSERT INTO alerts
        (type, ip, attempts, severity)

        VALUES (?, ?, ?, ?)
        """,

        (
            alert["type"],
            alert["ip"],
            alert["attempts"],
            alert["severity"]
        )
    )


    conn.commit()
    conn.close()