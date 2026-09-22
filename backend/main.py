from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from backend.event_logger import log_event
from backend.database import create_database
from backend.analyzer import analyze_logs
from backend.auth import ensure_default_admin, register_user, authenticate_user

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
    ensure_default_admin()


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str


class LoginRequest(BaseModel):
    username: str
    password: str


class SearchRequest(BaseModel):
    query: str
    username: str | None = None


class EmployeeCreateRequest(BaseModel):
    username: str
    password: str
    email: str
    role: str = "employee"


class EmployeeUpdateRequest(BaseModel):
    email: str | None = None
    role: str | None = None
    status: str | None = None


def admin_required(username: str):
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, status FROM users WHERE username = ?",
        (username,),
    )
    user = cursor.fetchone()
    conn.close()

    if not user or user[0] != "admin" or user[1] != "ACTIVE":
        raise HTTPException(status_code=403, detail="Admin access required")


def get_admin_id(username: str):
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    return user[0] if user else None

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
        analyze_logs()

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
    analyze_logs()

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "status": user["status"]
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


@app.get("/alerts/{alert_id}")
def get_alert(alert_id: int):
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
    alert = cursor.fetchone()
    conn.close()

    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return dict(alert)


@app.post("/analyze")
def analyze():

    result = analyze_logs()

    return result


@app.post("/search")
def search(request: Request, search_data: SearchRequest):

    client_ip = request.client.host

    query = search_data.query
    username = search_data.username

    log_event(
        client_ip,
        username,
        "SEARCH",
        "REQUEST",
        f"Search query: {query}"
    )

    analysis = analyze_logs()

    return {
        "success": True,
        "message": "Search request received",
        "query": query,
        "analysis": analysis
    }


@app.get("/events")
def get_events(
    limit: int = 100,
    event_type: str | None = None,
    severity: str | None = None,
    search: str | None = None,
):
    import sqlite3

    limit = min(max(limit, 1), 500)
    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    clauses = []
    values = []
    if event_type and event_type != "ALL":
        clauses.append("event_type = ?")
        values.append(event_type)
    if severity and severity != "ALL":
        clauses.append("severity = ?")
        values.append(severity)
    if search:
        clauses.append(
            "(source_ip LIKE ? OR username LIKE ? OR details LIKE ? OR event_type LIKE ?)"
        )
        term = f"%{search}%"
        values.extend([term, term, term, term])

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    cursor.execute(
        f"SELECT * FROM events {where} ORDER BY id DESC LIMIT ?",
        (*values, limit),
    )
    events = [dict(row) for row in cursor.fetchall()]
    conn.close()

    suspicious = sum(1 for event in events if event.get("severity") != "NORMAL")
    return {"count": len(events), "suspicious_count": suspicious, "events": events}


@app.get("/activity")
def get_activity(username: str | None = None):
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if username:
        cursor.execute(
            """
            SELECT *
            FROM events
            WHERE username = ?
            ORDER BY id DESC
            LIMIT 20
            """,
            (username,)
        )
    else:
        cursor.execute(
            """
            SELECT *
            FROM events
            ORDER BY id DESC
            LIMIT 20
            """
        )

    events = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {
        "count": len(events),
        "events": events
    }


@app.get("/employees")
def get_employees(x_user: str = Header(default=""), search: str | None = None):
    admin_required(x_user)
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if search:
        term = f"%{search}%"
        cursor.execute(
            """
            SELECT id, username, email, role, status
            FROM users
            WHERE username LIKE ? OR email LIKE ? OR role LIKE ?
            ORDER BY username
            """,
            (term, term, term),
        )
    else:
        cursor.execute(
            "SELECT id, username, email, role, status FROM users ORDER BY username"
        )
    employees = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"count": len(employees), "employees": employees}


@app.get("/employees/{employee_id}")
def get_employee(employee_id: int, x_user: str = Header(default="")):
    admin_required(x_user)
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, username, email, role, status FROM users WHERE id = ?",
        (employee_id,),
    )
    employee = cursor.fetchone()
    conn.close()
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return dict(employee)


@app.post("/employees")
def create_employee(
    employee: EmployeeCreateRequest,
    x_user: str = Header(default=""),
):
    admin_required(x_user)
    if employee.role not in {"employee", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = register_user(employee.username, employee.password, employee.email)
    if not result["success"]:
        raise HTTPException(status_code=409, detail=result["message"])

    import sqlite3
    conn = sqlite3.connect("data/opensentinel.db")
    conn.execute(
        "UPDATE users SET role = ? WHERE username = ?",
        (employee.role, employee.username),
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Employee created"}


@app.put("/employees/{employee_id}")
def update_employee(
    employee_id: int,
    employee: EmployeeUpdateRequest,
    x_user: str = Header(default=""),
):
    admin_required(x_user)
    if employee_id == get_admin_id(x_user) and (
        employee.role is not None or employee.status is not None
    ):
        raise HTTPException(status_code=400, detail="You cannot change your own admin access")
    fields = []
    values = []
    if employee.email is not None:
        fields.append("email = ?")
        values.append(employee.email)
    if employee.role is not None:
        if employee.role not in {"employee", "admin"}:
            raise HTTPException(status_code=400, detail="Invalid role")
        fields.append("role = ?")
        values.append(employee.role)
    if employee.status is not None:
        if employee.status not in {"ACTIVE", "INACTIVE"}:
            raise HTTPException(status_code=400, detail="Invalid status")
        fields.append("status = ?")
        values.append(employee.status)
    if not fields:
        raise HTTPException(status_code=400, detail="No employee changes supplied")

    import sqlite3
    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE users SET {', '.join(fields)} WHERE id = ?",
        (*values, employee_id),
    )
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"success": True, "message": "Employee updated"}


@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, x_user: str = Header(default="")):
    admin_required(x_user)
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM users WHERE id = ? AND username != 'admin'",
        (employee_id,),
    )
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Employee not found or protected")
    return {"success": True, "message": "Employee deleted"}


@app.get("/employees/{employee_id}/activity")
def get_employee_activity(employee_id: int, x_user: str = Header(default="")):
    admin_required(x_user)
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE id = ?", (employee_id,))
    user = cursor.fetchone()
    if user is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")
    cursor.execute(
        "SELECT * FROM events WHERE username = ? ORDER BY id DESC LIMIT 50",
        (user["username"],),
    )
    events = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"count": len(events), "events": events}


@app.get("/notifications")
def get_notifications():
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT *
        FROM notifications
        ORDER BY id DESC
        """
    )

    notifications = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {
        "count": len(notifications),
        "notifications": notifications
    }


@app.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int):
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = ?",
        (notification_id,)
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Notification marked as read"
    }


@app.post("/notifications/read-all")
def mark_all_notifications_read():
    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE notifications SET is_read = 1 WHERE is_read = 0"
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "All notifications marked as read"
    }


@app.get("/stats")
def stats():

    import sqlite3

    conn = sqlite3.connect("data/opensentinel.db")
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM alerts")
    total_alerts = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM alerts WHERE severity IN ('HIGH', 'CRITICAL')"
    )
    high_alerts = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM blocked_ips WHERE status = 'ACTIVE'"
    )
    blocked_ips = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM events")
    total_events = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM alerts WHERE type = 'SQL_INJECTION'"
    )
    sql_injection_alerts = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM alerts WHERE type = 'BRUTE_FORCE'"
    )
    brute_force_alerts = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM alerts WHERE type = 'RECONNAISSANCE'"
    )
    reconnaissance_alerts = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM events WHERE severity != 'NORMAL'"
    )
    suspicious_events = cursor.fetchone()[0]

    conn.close()

    return {
        "total_alerts": total_alerts,
        "high_alerts": high_alerts,
        "active_blocks": blocked_ips,
        "total_events": total_events,
        "suspicious_events": suspicious_events,
        "sql_injection_alerts": sql_injection_alerts,
        "brute_force_alerts": brute_force_alerts,
        "reconnaissance_alerts": reconnaissance_alerts,
    }