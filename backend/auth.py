import sqlite3
import bcrypt

DB = "data/opensentinel.db"


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8")
    )


def register_user(username: str, password: str, email: str):

    password_hash = get_password_hash(password)

    conn = sqlite3.connect(DB)
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            INSERT INTO users
            (username, password_hash, role, email)
            VALUES (?, ?, ?, ?)
            """,
            (
                username,
                password_hash,
                "employee",
                email
            )
        )

        conn.commit()

        return {
            "success": True,
            "message": "User registered successfully"
        }

    except sqlite3.IntegrityError:

        return {
            "success": False,
            "message": "Username or email already exists"
        }

    finally:

        conn.close()


def authenticate_user(username: str, password: str):

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, username, password_hash, role, email, status
        FROM users
        WHERE username = ?
        """,
        (username,)
    )

    user = cursor.fetchone()

    conn.close()

    if user is None:
        return None

    if user["status"] != "ACTIVE":
        return None

    if not verify_password(
        password,
        user["password_hash"]
    ):
        return None

    return dict(user)


def ensure_default_admin():
    conn = sqlite3.connect(DB)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", ("admin",))
    exists = cursor.fetchone()

    if not exists:
        cursor.execute(
            """
            INSERT INTO users (username, password_hash, role, email, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                "admin",
                get_password_hash("admin123"),
                "admin",
                "admin@opensentinel.local",
                "ACTIVE",
            ),
        )

    conn.commit()
    conn.close()