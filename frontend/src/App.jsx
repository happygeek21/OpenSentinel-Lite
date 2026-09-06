import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [page, setPage] = useState("portal");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState([]);

  const [apiOnline, setApiOnline] = useState(false);

useEffect(() => {
  const checkApi = async () => {
    try {
      const response = await fetch(`${API}/`);

      if (response.ok) {
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
    } catch {
      setApiOnline(false);
    }
  };

  checkApi();

  const interval = setInterval(checkApi, 5000);

  return () => clearInterval(interval);
}, []);


  const login = async (e) => {
    e.preventDefault();

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
        setMessage("Login successful");
      } else {
        setMessage("Invalid username or password");
      }
    } catch {
      setMessage("Backend connection failed");
    }
  };

  const search = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Search request received: ${query}`);
      }
    } catch {
      setMessage("Backend connection failed");
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch(`${API}/alerts`);
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch {
      setMessage("Unable to load security alerts");
    }
  };

  const openSecurityDashboard = () => {
    setPage("security");
    loadAlerts();
  };

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

        <nav>
          <button
            className={page === "portal" ? "active" : ""}
            onClick={() => setPage("portal")}
          >
            Employee Portal
          </button>

          <button
            className={page === "security" ? "active security-link" : "security-link"}
            onClick={openSecurityDashboard}
          >
            Security Dashboard
          </button>
        </nav>
      </header>

      {page === "portal" && (
        <main className="portal">
          <section className="hero">
            <div>
              <span className="eyebrow">INTERNAL APPLICATION</span>
              <h2>Employee Portal</h2>
              <p>
                Secure internal access and application services.
              </p>
            </div>

            <div className={`status ${apiOnline ? "online" : "offline"}`}>
            <span></span>
            {apiOnline ? "System Online" : "System Offline"}
            </div>
          </section>

          <div className="portal-grid">
            <section className="card login-card">
              <h3>Employee Login</h3>
              <p className="muted">
                Authenticate to access internal services.
              </p>

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

            <section className="card search-card">
              <h3>Application Search</h3>
              <p className="muted">
                Search internal application resources.
              </p>

              <form onSubmit={search}>
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

              {message && (
                <div className="message">
                  {message}
                </div>
              )}
            </section>
          </div>

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

      {page === "security" && (
        <main className="security">
          <section className="dashboard-heading">
            <div>
              <span className="eyebrow">SECURITY OPERATIONS</span>
              <h2>Threat Monitoring Dashboard</h2>
              <p>
                Real-time security events and detected threats.
              </p>
            </div>

            <button className="refresh-btn" onClick={loadAlerts}>
              ↻ Refresh
            </button>
          </section>

          <section className="stats">
            <div className="stat-card">
              <span>Total Alerts</span>
              <strong>{alerts.length}</strong>
            </div>

            <div className="stat-card danger">
              <span>High Risk</span>
              <strong>
                {alerts.filter((a) => a.severity === "HIGH").length}
              </strong>
            </div>

            <div className="stat-card warning">
              <span>SQL Injection</span>
              <strong>
                {alerts.filter((a) => a.type === "SQL_INJECTION").length}
              </strong>
            </div>

            <div className="stat-card">
              <span>Brute Force</span>
              <strong>
                {alerts.filter((a) => a.type === "BRUTE_FORCE").length}
              </strong>
            </div>
          </section>

          <section className="alert-panel">
            <div className="panel-header">
              <div>
                <h3>Detected Security Alerts</h3>
                <p>Events identified by the OpenSentinel detection engine.</p>
              </div>

            <span className={`live-badge ${apiOnline ? "live" : "offline-live"}`}>
  ● {apiOnline ? "LIVE" : "OFFLINE"}
</span>
            </div>

            {alerts.length === 0 ? (
              <div className="empty">
                No alerts available.
              </div>
            ) : (
              <div className="alert-table">
                <div className="table-row table-head">
                  <span>Threat</span>
                  <span>Source IP</span>
                  <span>Risk</span>
                  <span>Severity</span>
                  <span>Detection</span>
                </div>

                {alerts.map((alert, index) => (
                  <div className="table-row" key={alert.id || index}>
                    <span>
                      <strong>{alert.type}</strong>
                    </span>

                    <span className="mono">
                      {alert.ip}
                    </span>

                    <span className="risk">
                      {alert.risk_score ?? alert.risk ?? 0}
                    </span>

                    <span>
                      <b className={`severity ${alert.severity?.toLowerCase()}`}>
                        {alert.severity}
                      </b>
                    </span>

                    <span>
                      {alert.detection_method}
                    </span>
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