import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [page, setPage] = useState("portal");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [profile, setProfile] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeUser, setActiveUser] = useState("");
  const [portalTab, setPortalTab] = useState("home");
  const [adminTab, setAdminTab] = useState("employees");
  const [dashboardTab, setDashboardTab] = useState("overview");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [alertSearchTerm, setAlertSearchTerm] = useState("");
  const [events, setEvents] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [streamPaused, setStreamPaused] = useState(false);
  const [eventFilter, setEventFilter] = useState("ALL");
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeActivity, setEmployeeActivity] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    username: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch(`${API}/`);
        setApiOnline(response.ok);
      } catch {
        setApiOnline(false);
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API}/notifications`);
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch {
      setMessage("Unable to load notifications");
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch(`${API}/alerts`);
      const data = await response.json();
      const alertList = data.alerts || [];
      setAlerts(alertList);

      if (!selectedAlert && alertList.length > 0) {
        setSelectedAlert(alertList[0]);
      }
    } catch {
      setMessage("Unable to load security alerts");
    }
  };

  const loadEvents = async () => {
    try {
      const params = new URLSearchParams({
        limit: "100",
        event_type: eventFilter,
        search: eventSearchTerm,
      });
      const response = await fetch(`${API}/events?${params}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch {
      setMessage("Unable to load security events");
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API}/stats`);
      setDashboardStats(await response.json());
    } catch {
      setMessage("Unable to load dashboard statistics");
    }
  };

  const loadEmployees = async () => {
    if (profile?.role !== "admin") return;
    try {
      const params = employeeSearch
        ? `?search=${encodeURIComponent(employeeSearch)}`
        : "";
      const response = await fetch(`${API}/employees${params}`, {
        headers: { "X-User": activeUser },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load employees");
      setEmployees(data.employees || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadEmployeeActivity = async (employee) => {
    setSelectedEmployee(employee);
    try {
      const response = await fetch(`${API}/employees/${employee.id}/activity`, {
        headers: { "X-User": activeUser },
      });
      const data = await response.json();
      setEmployeeActivity(data.events || []);
    } catch {
      setMessage("Unable to load employee activity");
    }
  };

  const updateEmployee = async (employeeId, changes) => {
    try {
      const response = await fetch(`${API}/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User": activeUser },
        body: JSON.stringify(changes),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to update employee");
      setMessage(data.message);
      setSelectedEmployee((current) => (
        current && current.id === employeeId
          ? { ...current, ...changes }
          : current
      ));
      loadEmployees();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const createEmployee = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User": activeUser },
        body: JSON.stringify(newEmployee),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to create employee");
      setMessage(data.message);
      setNewEmployee({ username: "", email: "", password: "" });
      loadEmployees();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteEmployee = async (employeeId) => {
    if (!window.confirm("Remove this employee from the application?")) return;
    try {
      const response = await fetch(`${API}/employees/${employeeId}`, {
        method: "DELETE",
        headers: { "X-User": activeUser },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to delete employee");
      setMessage(data.message);
      setSelectedEmployee(null);
      setEmployeeActivity([]);
      loadEmployees();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadActivity = async (user) => {
    if (!user) return;

    try {
      const response = await fetch(
        `${API}/activity?username=${encodeURIComponent(user)}`
      );
      const data = await response.json();
      setActivity(data.events || []);
    } catch {
      setMessage("Unable to load activity history");
    }
  };

  const register = async (e) => {
    e.preventDefault();

    if (!registerUsername || !registerPassword || !registerEmail) {
      setMessage("Please fill in username, password, and email.");
      return;
    }

    try {
      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerUsername,
          password: registerPassword,
          email: registerEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Registration successful. You can now log in.");
        setRegisterUsername("");
        setRegisterPassword("");
        setRegisterEmail("");
      } else {
        setMessage(data.message || "Registration failed.");
      }
    } catch {
      setMessage("Backend connection failed during registration.");
    }
  };

  const login = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setMessage("Please enter both username and password.");
      return;
    }

    try {
      const response = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLoggedIn(true);
        setActiveUser(data.user.username);
        setProfile({
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
        });
        setPage(data.user.role === "admin" ? "admin" : "portal");
        setPortalTab("home");
        setMessage(`Login successful. Welcome ${data.user.username}.`);
        setPassword("");
        loadActivity(data.user.username);
      } else {
        setIsLoggedIn(false);
        setActiveUser("");
        setProfile(null);
        setMessage(data.message || "Invalid username or password");
      }
    } catch {
      setMessage("Backend connection failed");
    }
  };

  const search = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      setMessage("Please log in before using the Employee Portal.");
      return;
    }

    try {
      const response = await fetch(`${API}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          username: activeUser,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Search request received: ${query}`);
        setQuery("");
        await loadActivity(activeUser);
        await loadAlerts();
      }
    } catch {
      setMessage("Backend connection failed");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveUser("");
    setProfile(null);
    setPortalTab("home");
    setPage("portal");
    setNotificationOpen(false);
    setMessage("Logged out successfully.");
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API}/notifications/${notificationId}/read`, {
        method: "POST",
      });
      loadNotifications();
    } catch {
      setMessage("Unable to update notifications");
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: "POST",
      });
      loadNotifications();
    } catch {
      setMessage("Unable to update notifications");
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeUser) {
      loadActivity(activeUser);
    }
  }, [isLoggedIn, activeUser]);

  useEffect(() => {
    if (page === "security" || page === "admin" || isLoggedIn) {
      loadAlerts();
      loadNotifications();
      loadStats();
    }
  }, [page, isLoggedIn]);

  useEffect(() => {
    if (page !== "security" || profile?.role !== "admin" || streamPaused) return undefined;
    loadEvents();
    const interval = setInterval(() => {
      loadEvents();
      loadAlerts();
      loadNotifications();
      loadStats();
    }, 3000);
    return () => clearInterval(interval);
  }, [page, profile?.role, streamPaused, eventFilter, eventSearchTerm]);

  useEffect(() => {
    if (page === "admin" && profile?.role === "admin") {
      loadEmployees();
    }
  }, [page, profile?.role, employeeSearch]);

  const totalAlerts = alerts.length;

  const highRiskAlerts = alerts.filter(
    (alert) =>
      alert.severity === "HIGH" ||
      alert.severity === "CRITICAL"
  ).length;

  const sqlInjectionAlerts = alerts.filter(
    (alert) => alert.type === "SQL_INJECTION"
  ).length;

  const bruteForceAlerts = alerts.filter(
    (alert) => alert.type === "BRUTE_FORCE"
  ).length;

  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  );

  const filteredAlerts = alerts.filter((alert) => {
    const typeMatch =
      alertFilter === "ALL" || alert.type === alertFilter;
    const severityMatch =
      severityFilter === "ALL" || alert.severity === severityFilter;
    const searchMatch =
      !alertSearchTerm ||
      `${alert.type} ${alert.ip} ${alert.username || ""} ${alert.severity} ${alert.detection_method}`
        .toLowerCase()
        .includes(alertSearchTerm.toLowerCase());

    return typeMatch && severityMatch && searchMatch;
  });

  const threatCounts = alerts.reduce((acc, alert) => {
    const key = alert.type || "UNKNOWN";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const severityCounts = alerts.reduce((acc, alert) => {
    const key = alert.severity || "UNKNOWN";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const trendCounts = alerts.reduce((acc, alert) => {
    const date = (alert.created_at || "").slice(0, 10);
    if (!date) return acc;
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const selectedAlertData = filteredAlerts.find(
    (alert) => alert.id === selectedAlert?.id
  ) || filteredAlerts[0] || selectedAlert;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">OS</div>
          <div>
            <h1>OpenSentinel Lite</h1>
            <span>Security Monitoring Platform</span>
          </div>
        </div>

        <div className="top-actions">
          <nav>
            {profile?.role !== "admin" && (
              <button
                className={page === "portal" ? "active" : ""}
                onClick={() => setPage("portal")}
              >
                Employee Portal
              </button>
            )}

            {profile?.role === "admin" && (
              <>
                <button
                  className={page === "admin" ? "active" : ""}
                  onClick={() => setPage("admin")}
                >
                  Admin Portal
                </button>
                <button
                  className={page === "security" ? "active security-link" : "security-link"}
                  onClick={() => setPage("security")}
                >
                  Security Dashboard
                </button>
              </>
            )}
          </nav>

          {isLoggedIn && (
            <div className="notification-wrap">
              <button
                className="notification-btn"
                onClick={() => setNotificationOpen((open) => !open)}
              >
                🔔
                {unreadNotifications.length > 0 && (
                  <span className="notification-badge">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <strong>Security Notifications</strong>
                    <button onClick={markAllNotificationsRead}>Mark all read</button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="empty-note">No notifications.</div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${
                          notification.is_read ? "read" : "unread"
                        }`}
                      >
                        <div>
                          <div className="notification-title">
                            {notification.title}
                          </div>
                          <div className="notification-message">
                            {notification.message}
                          </div>
                        </div>

                        {!notification.is_read && (
                          <button
                            className="tiny-btn"
                            onClick={() => markNotificationRead(notification.id)}
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {page === "portal" && (
        <main className="portal">
          <section className="hero">
            <div>
              <span className="eyebrow">INTERNAL APPLICATION</span>
              <h2>Employee Portal</h2>
              <p>Secure internal access and application services.</p>
            </div>

            <div className={`status ${apiOnline ? "online" : "offline"}`}>
              <span></span>
              {apiOnline ? "System Online" : "System Offline"}
            </div>
          </section>

          {!isLoggedIn ? (
            <div className="portal-grid">
              <section className="card login-card">
                <h3>Employee Login</h3>
                <p className="muted">Authenticate to access internal services.</p>

                <form onSubmit={login}>
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />

                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <button className="primary-btn" type="submit">
                    Sign In
                  </button>
                </form>
              </section>

              <section className="card register-card">
                <h3>Employee Registration</h3>
                <p className="muted">Register a new employee account for the portal.</p>

                <form onSubmit={register}>
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="Choose username"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />

                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Enter email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />

                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Create password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />

                  <button className="primary-btn" type="submit">
                    Register Employee
                  </button>
                </form>
              </section>
            </div>
          ) : (
            <>
              <div className="employee-shell">
                <aside className="employee-sidebar">
                  <div className="user-box">
                    <div className="avatar">{activeUser.charAt(0).toUpperCase()}</div>
                    <div>
                      <strong>{activeUser}</strong>
                      <small>{profile?.role || "employee"}</small>
                    </div>
                  </div>

                  <nav className="portal-nav">
                    {[
                      "home",
                      "search",
                      "activity",
                      "profile",
                    ].map((tab) => (
                      <button
                        key={tab}
                        className={portalTab === tab ? "active-tab" : ""}
                        onClick={() => setPortalTab(tab)}
                      >
                        {tab === "home" && "Home"}
                        {tab === "search" && "Search"}
                        {tab === "activity" && "Activity"}
                        {tab === "profile" && "Profile"}
                      </button>
                    ))}

                    <button
                      className="logout-btn"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </nav>
                </aside>

                <section className="portal-content card">
                  {portalTab === "home" && (
                    <div className="portal-panel">
                      <h3>Welcome, {activeUser}</h3>
                      <p className="muted">
                        You are logged in to the employee portal. Search activity is monitored by OpenSentinel Lite.
                      </p>

                      <div className="summary-cards">
                        <div className="mini-card">
                          <span>Role</span>
                          <strong>{profile?.role || "employee"}</strong>
                        </div>
                        <div className="mini-card">
                          <span>Recent Activity</span>
                          <strong>{activity.length}</strong>
                        </div>
                        <div className="mini-card">
                          <span>Security Status</span>
                          <strong>Protected</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {portalTab === "search" && (
                    <div className="portal-panel">
                      <h3>Application Search</h3>
                      <p className="muted">Search the internal application.</p>

                      <form onSubmit={search} className="search-form">
                        <label>Search Query</label>
                        <input
                          type="text"
                          placeholder="Enter search query"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />

                        <button className="primary-btn" type="submit">
                          Search
                        </button>
                      </form>
                    </div>
                  )}

                  {portalTab === "activity" && (
                    <div className="portal-panel">
                      <h3>Activity History</h3>
                      <p className="muted">Recent employee activity and requests.</p>

                      {activity.length === 0 ? (
                        <div className="empty-state">No recent activity found.</div>
                      ) : (
                        <div className="activity-list">
                          {activity.map((item) => (
                            <div key={item.id} className="activity-item">
                              <div>
                                <strong>{item.event_type}</strong>
                                <p>{item.status}</p>
                              </div>
                              <small>{item.timestamp}</small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {portalTab === "profile" && (
                    <div className="portal-panel">
                      <h3>Profile</h3>

                      <div className="profile-box">
                        <div className="profile-row">
                          <span>Username</span>
                          <strong>{profile?.username || activeUser}</strong>
                        </div>
                        <div className="profile-row">
                          <span>Email</span>
                          <strong>{profile?.email || "N/A"}</strong>
                        </div>
                        <div className="profile-row">
                          <span>Role</span>
                          <strong>{profile?.role || "employee"}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {message && <div className="message auth-message">{message}</div>}

          <section className="monitoring-note">
            <div className="shield">◆</div>
            <div>
              <strong>Protected by OpenSentinel</strong>
              <p>
                Application activity is monitored for suspicious behaviour,
                including brute-force attempts and SQL injection patterns.
              </p>
            </div>
          </section>
        </main>
      )}

      {page === "admin" && profile?.role === "admin" && (
        <main className="security admin-page">
          <section className="dashboard-heading">
            <div>
              <span className="eyebrow">ACCESS CONTROL</span>
              <h2>Admin Portal</h2>
              <p>Manage users and inspect employee security activity.</p>
            </div>
            <div className="admin-header-actions">
              <button className="refresh-btn" onClick={loadEmployees}>Refresh Employees</button>
              <button className="secondary-btn" onClick={handleLogout}>Logout</button>
            </div>
          </section>

          <nav className="section-tabs" aria-label="Admin Portal sections">
            {[
              ["employees", "Employees"],
              ["add", "Add Employee"],
              ["activity", "Employee Activity"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                className={adminTab === tab ? "active-tab" : ""}
                onClick={() => setAdminTab(tab)}
              >
                {label}
              </button>
            ))}
          </nav>

          <section className="admin-grid">
            <div className={`card admin-pane ${adminTab !== "employees" ? "hidden-pane" : ""}`}>
              <div className="panel-header compact-header">
                <div>
                  <h3>Employees</h3>
                  <p>{employees.length} users in the application database</p>
                </div>
              </div>
              <input
                type="search"
                placeholder="Search username, email, or role"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
              <div className="employee-list">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    className={`employee-row ${selectedEmployee?.id === employee.id ? "selected-row" : ""}`}
                    onClick={() => loadEmployeeActivity(employee)}
                  >
                    <span><strong>{employee.username}</strong><small>{employee.email}</small></span>
                    <span>{employee.role}</span>
                    <b className={`status-pill ${employee.status.toLowerCase()}`}>{employee.status}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-side-column">
              <section className={`card admin-pane ${adminTab !== "add" ? "hidden-pane" : ""}`}>
                <h3>Add Employee</h3>
                <p className="muted">Create an account for the simulated application.</p>
                <form onSubmit={createEmployee}>
                  <input placeholder="Username" value={newEmployee.username} onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })} required />
                  <input type="email" placeholder="Email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} required />
                  <input type="password" placeholder="Temporary password" value={newEmployee.password} onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} required />
                  <button className="primary-btn" type="submit">Add Employee</button>
                </form>
              </section>

              <section className={`card admin-pane ${adminTab !== "activity" ? "hidden-pane" : ""}`}>
                <h3>Employee Details</h3>
                {!selectedEmployee ? (
                  <div className="empty-state">Select an employee to inspect activity.</div>
                ) : (
                  <>
                    <div className="profile-box">
                      <div className="profile-row"><span>Username</span><strong>{selectedEmployee.username}</strong></div>
                      <div className="profile-row">
                        <span>Email</span>
                        <input
                          className="inline-input"
                          value={selectedEmployee.email || ""}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, email: e.target.value })}
                        />
                      </div>
                      <div className="profile-row">
                        <span>Role</span>
                        <select
                          className="inline-input"
                          value={selectedEmployee.role}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, role: e.target.value })}
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="profile-row">
                        <span>Status</span>
                        <select
                          className="inline-input"
                          value={selectedEmployee.status}
                          onChange={(e) => setSelectedEmployee({ ...selectedEmployee, status: e.target.value })}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="admin-actions">
                      <button className="primary-btn" onClick={() => updateEmployee(selectedEmployee.id, {
                        email: selectedEmployee.email,
                        role: selectedEmployee.role,
                        status: selectedEmployee.status,
                      })}>
                        Save Details
                      </button>
                      {selectedEmployee.username !== "admin" && (
                        <button className="danger-btn" onClick={() => deleteEmployee(selectedEmployee.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                    <h4>Recent Activity</h4>
                    <div className="activity-list compact-list">
                      {employeeActivity.length === 0 ? <div className="empty-state">No activity recorded.</div> : employeeActivity.slice(0, 8).map((item) => (
                        <div key={item.id} className={`activity-item ${item.severity !== "NORMAL" ? "suspicious-event" : ""}`}>
                          <div><strong>{item.event_type}</strong><p>{item.details || item.status}</p></div>
                          <small>{item.timestamp}</small>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          </section>
        </main>
      )}

      {page === "security" && profile?.role === "admin" && (
        <main className="security">
          <section className="dashboard-heading">
            <div>
              <span className="eyebrow">SECURITY OPERATIONS</span>
              <h2>Threat Monitoring Dashboard</h2>
              <p>Real-time security events and detected threats.</p>
            </div>

            <button className="refresh-btn" onClick={() => { loadAlerts(); loadNotifications(); }}>
              ↻ Refresh
            </button>
          </section>

          <nav className="section-tabs dashboard-tabs" aria-label="Security Dashboard sections">
            {[
              ["overview", "Overview"],
              ["monitor", "Live Monitor"],
              ["alerts", "Security Alerts"],
              ["notifications", "Notifications"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                className={dashboardTab === tab ? "active-tab" : ""}
                onClick={() => setDashboardTab(tab)}
              >
                {label}
                {tab === "notifications" && unreadNotifications.length > 0 && (
                  <span className="tab-count">{unreadNotifications.length}</span>
                )}
              </button>
            ))}
          </nav>

          <section className={`dashboard-pane ${dashboardTab !== "overview" ? "hidden-pane" : ""}`}>
          <section className="stats">
            <div className="stat-card">
              <span>Total Alerts</span>
              <strong>{dashboardStats.total_alerts ?? totalAlerts}</strong>
            </div>

            <div className="stat-card danger">
              <span>High Risk</span>
              <strong>{dashboardStats.high_alerts ?? highRiskAlerts}</strong>
            </div>

            <div className="stat-card warning">
              <span>SQL Injection</span>
              <strong>{dashboardStats.sql_injection_alerts ?? sqlInjectionAlerts}</strong>
            </div>

            <div className="stat-card">
              <span>Brute Force</span>
              <strong>{dashboardStats.brute_force_alerts ?? bruteForceAlerts}</strong>
            </div>

            <div className="stat-card warning">
              <span>Recon Activity</span>
              <strong>{dashboardStats.reconnaissance_alerts ?? 0}</strong>
            </div>

            <div className="stat-card">
              <span>Total Events</span>
              <strong>{dashboardStats.total_events ?? 0}</strong>
            </div>
          </section>

          <section className="chart-grid">
            <div className="chart-card">
              <h4>Threat Distribution</h4>
              <div className="chart-bars">
                {Object.entries(threatCounts).map(([key, value]) => (
                  <div key={key} className="bar-group">
                    <span>{key}</span>
                    <div className="bar-wrap">
                      <div className="bar" style={{ height: `${Math.max((value / Math.max(totalAlerts, 1)) * 100, 20)}%` }} />
                    </div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h4>Severity Distribution</h4>
              <div className="chart-bars">
                {Object.entries(severityCounts).map(([key, value]) => (
                  <div key={key} className="bar-group">
                    <span>{key}</span>
                    <div className="bar-wrap">
                      <div className="bar severity-bar" style={{ height: `${Math.max((value / Math.max(totalAlerts, 1)) * 100, 20)}%` }} />
                    </div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="chart-card trend-card">
            <h4>Alerts Over Time</h4>
            <div className="trend-list">
              {Object.entries(trendCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, value]) => (
                  <div key={date} className="trend-row">
                    <span>{date}</span>
                    <div className="trend-bar">
                      <div style={{ width: `${Math.min((value / Math.max(totalAlerts, 1)) * 100, 100)}%` }} />
                    </div>
                    <strong>{value}</strong>
                  </div>
                ))}
            </div>
          </section>
          </section>

          <section className={`alert-panel live-monitor dashboard-pane ${dashboardTab !== "monitor" ? "hidden-pane" : ""}`}>
            <div className="panel-header">
              <div>
                <h3>Live Security Log Monitor</h3>
                <p>{events.length} events loaded · {dashboardStats.suspicious_events ?? 0} suspicious events</p>
              </div>
              <div className="monitor-actions">
                <span className="live-badge live">● LIVE</span>
                <button className="secondary-btn" onClick={() => setStreamPaused((paused) => !paused)}>
                  {streamPaused ? "Resume" : "Pause"}
                </button>
              </div>
            </div>
            <div className="filter-row event-filters">
              <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                <option value="ALL">All Events</option>
                <option value="LOGIN">Login Events</option>
                <option value="SEARCH">Search Events</option>
              </select>
              <input
                className="filter-input"
                placeholder="Filter IP, user, details"
                value={eventSearchTerm}
                onChange={(e) => setEventSearchTerm(e.target.value)}
              />
              <span className="stream-state">{streamPaused ? "Stream paused" : "Polling every 3 seconds"}</span>
            </div>
            <div className="event-stream">
              {events.length === 0 ? <div className="empty">No events available.</div> : events.map((event) => (
                <div key={event.id} className={`event-row ${event.severity?.toLowerCase() || "normal"}`}>
                  <span className="event-time">{event.timestamp?.slice(11, 19) || "--:--:--"}</span>
                  <span className="mono">{event.source_ip}</span>
                  <span>{event.username || "anonymous"}</span>
                  <strong>{event.event_type}</strong>
                  <span>{event.status}</span>
                  <span className="event-details">{event.details || "-"}</span>
                  <b className={`severity ${event.severity?.toLowerCase() || "low"}`}>{event.severity || "NORMAL"} {event.risk_score ? `· ${event.risk_score}` : ""}</b>
                </div>
              ))}
            </div>
          </section>

          <section className={`alert-panel dashboard-pane ${dashboardTab !== "alerts" ? "hidden-pane" : ""}`}>
            <div className="panel-header">
              <div>
                <h3>Detected Security Alerts</h3>
                <p>Events identified by the OpenSentinel detection engine.</p>
              </div>

              <span className={`live-badge ${apiOnline ? "live" : "offline-live"}`}>
                ● {apiOnline ? "LIVE" : "OFFLINE"}
              </span>
            </div>

            <div className="filter-row">
              <select value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)}>
                <option value="ALL">All Threats</option>
                <option value="SQL_INJECTION">SQL Injection</option>
                <option value="BRUTE_FORCE">Brute Force</option>
                <option value="RECONNAISSANCE">Reconnaissance</option>
              </select>

              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                <option value="ALL">All Severity</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="MEDIUM">MEDIUM</option>
              </select>

              <input
                type="text"
                placeholder="Filter alerts"
                className="filter-input"
                value={alertSearchTerm}
                onChange={(e) => setAlertSearchTerm(e.target.value)}
              />
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="empty">No alerts available.</div>
            ) : (
              <div className="alert-layout">
                <div className="alert-table">
                  <div className="table-row table-head">
                    <span>Threat</span>
                    <span>Source IP</span>
                    <span>User</span>
                    <span>Attempts</span>
                    <span>Risk</span>
                    <span>Severity</span>
                    <span>Detection</span>
                  </div>

                  {filteredAlerts.map((alert, index) => (
                    <div
                      className={`table-row ${selectedAlertData?.id === alert.id ? "selected-row" : ""}`}
                      key={alert.id || index}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <span><strong>{alert.type}</strong></span>
                      <span className="mono">{alert.ip}</span>
                      <span>{alert.username || "-"}</span>
                      <span className="attempts">{alert.attempts ?? 0}</span>
                      <span className="risk">{alert.risk_score ?? alert.risk ?? 0}</span>
                      <span>
                        <b className={`severity ${alert.severity?.toLowerCase()}`}>
                          {alert.severity}
                        </b>
                      </span>
                      <span>{alert.detection_method}</span>
                    </div>
                  ))}
                </div>

                {selectedAlertData && (
                  <div className="alert-details">
                    <h4>Alert Details</h4>
                    <div className="detail-grid">
                      <div><span>Threat</span><strong>{selectedAlertData.type}</strong></div>
                      <div><span>Source IP</span><strong>{selectedAlertData.ip}</strong></div>
                      <div><span>Attempts</span><strong>{selectedAlertData.attempts ?? 0}</strong></div>
                      <div><span>Risk</span><strong>{selectedAlertData.risk_score ?? selectedAlertData.risk ?? 0}</strong></div>
                      <div><span>Severity</span><strong>{selectedAlertData.severity}</strong></div>
                      <div><span>Detection</span><strong>{selectedAlertData.detection_method}</strong></div>
                      <div><span>Time</span><strong>{selectedAlertData.created_at || "N/A"}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={`notification-page dashboard-pane ${dashboardTab !== "notifications" ? "hidden-pane" : ""}`}>
            <div className="panel-header">
              <div>
                <h3>Security Notifications</h3>
                <p>Alert notifications recorded by the monitoring system.</p>
              </div>
              <button className="secondary-btn" onClick={markAllNotificationsRead}>
                Mark All Read
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="empty">No notifications available.</div>
            ) : (
              <div className="notification-page-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-page-item ${notification.is_read ? "read" : "unread"}`}
                  >
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>{notification.created_at}</small>
                    </div>
                    {!notification.is_read && (
                      <button className="tiny-btn" onClick={() => markNotificationRead(notification.id)}>
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      <footer>
        OpenSentinel Lite · Lightweight Security Monitoring & Threat Detection
      </footer>
    </div>
  );
}

export default App;