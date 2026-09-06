from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from backend.event_logger import log_event
from backend.database import create_database
from backend.analyzer import analyze_logs
from backend.auth import register_user, authenticate_user

app = FastAPI(
    title="OpenSentinel Lite",
    description="Lightweight security monitoring and threat detection system",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_database()


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str


class LoginRequest(BaseModel):
    username: str
    password: str


class SearchRequest(BaseModel):
    query: str

@app.post("/register")
def register(request: RegisterRequest):

    result = register_user(
        request.username,
        request.password,
        request.email
    )

    return result


@app.post("/login")
def login(request: Request, login_data: LoginRequest):

    client_ip = request.client.host

    user = authenticate_user(
        login_data.username,
        login_data.password
    )

    if user is None:

        log_event(
            client_ip,
            login_data.username,
            "LOGIN",
            "FAILED",
            "Invalid username or password"
        )

        return {
            "success": False,
            "message": "Invalid username or password"
        }

    log_event(
        client_ip,
        login_data.username,
        "LOGIN",
        "SUCCESS",
        "Successful authentication"
    )

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"]
        }
    }


@app.get("/")
def root():
    return {
        "system": "OpenSentinel Lite",
        "status": "online"
    }


@app.get("/alerts")
def get_alerts():

    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT *
        FROM alerts
        ORDER BY id DESC
        """
    )

    alerts = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "count": len(alerts),
        "alerts": alerts
    }


@app.post("/analyze")
def analyze():

    result = analyze_logs()

    return result


@app.post("/search")
def search(request: Request, search_data: SearchRequest):

    client_ip = request.client.host

    query = search_data.query

    # Log the search request for OpenSentinel
    log_event(
        client_ip,
        None,
        "SEARCH",
        "REQUEST",
        f"Search query: {query}"
    )

    return {
        "success": True,
        "message": "Search request received",
        "query": query
    }


@app.get("/stats")
def stats():

    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM alerts")
    total_alerts = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM alerts WHERE severity = 'HIGH'"
    )
    high_alerts = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM blocked_ips WHERE status = 'ACTIVE'"
    )
    blocked_ips = cursor.fetchone()[0]

    conn.close()

    return {
        "total_alerts": total_alerts,
        "high_alerts": high_alerts,
        "active_blocks": blocked_ips
    }