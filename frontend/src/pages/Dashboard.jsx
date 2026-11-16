import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActivityFeed, getAnalyticsSummary } from "../api/client.js";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";

const RECORD_META = {
  SERVICE: { label: "Service", tone: "success", icon: "wrench" },
  ACCIDENT: { label: "Accident", tone: "danger", icon: "alert" },
  INSURANCE: { label: "Insurance", tone: "warning", icon: "shield" },
  OWNERSHIP_TRANSFER: { label: "Transfer", tone: "info", icon: "transfer" },
  INSPECTION: { label: "Inspection", tone: "accent", icon: "search" },
};

const KIND_META = {
  RECORD: { label: "Record", icon: "file" },
  REGISTRATION: { label: "Registration", icon: "car" },
  PHOTO: { label: "Photo", icon: "photo" },
};

const RISK_META = {
  LOW: { label: "Low", tone: "success" },
  MEDIUM: { label: "Medium", tone: "warning" },
  HIGH: { label: "High", tone: "danger" },
  CRITICAL: { label: "Critical", tone: "critical" },
  UNRATED: { label: "Unrated", tone: "neutral" },
};

const RECORD_CHART_COLORS = {
  SERVICE: "var(--success)",
  ACCIDENT: "var(--danger)",
  INSURANCE: "var(--warning)",
  OWNERSHIP_TRANSFER: "var(--indigo)",
  INSPECTION: "var(--accent)",
};

function relativeTime(value) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "unknown";
  const diff = Date.now() - time;
  if (diff < 45 * 1000) return "just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(value).toLocaleDateString();
}

function shortAddress(address) {
  if (!address) return "unknown";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function dayLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [summaryData, activityData] = await Promise.all([
        getAnalyticsSummary(),
        getActivityFeed(24),
      ]);
      setSummary(summaryData);
      setActivity(activityData.items || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => load({ silent: true }), 8000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  const totals = summary?.totals;
  const activityMax = Math.max(1, ...(summary?.activity || []).map((day) => day.count));
  const typeMax = Math.max(1, ...(summary?.recordsByType || []).map((entry) => entry.count));
  const makeMax = Math.max(1, ...(summary?.topMakes || []).map((entry) => entry.count));
  const trustTotal = Math.max(
    1,
    (summary?.trustDistribution || []).reduce((total, entry) => total + entry.count, 0)
  );
  const photoPercent =
    totals && totals.vehicles
      ? Math.round((totals.photos / totals.vehicles) * 100)
      : 0;

  const trustTone =
    summary?.averageTrustScore == null
      ? "neutral"
      : summary.averageTrustScore >= 70
        ? "success"
        : summary.averageTrustScore >= 45
          ? "warning"
          : "danger";

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="Registry intelligence"
        title="The registry, live."
        description="A real-time read on vehicle trust, record volume, and on-chain activity. Data refreshes automatically every 8 seconds."
        meta={
          lastUpdated && (
            <span className="meta-item">
              <Icon name="clock" size={13} />
              Last updated {lastUpdated.toLocaleTimeString()} ·{" "}
              <Link to="/">look up a VIN</Link>
            </span>
          )
        }
        actions={
          <div className="dashboard-controls">
            <span className={`live-dot ${autoRefresh ? "on" : "off"}`}>
              <span className="live-pulse" />
              {autoRefresh ? "Live" : "Paused"}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setAutoRefresh((value) => !value)}
            >
              <Icon name={autoRefresh ? "pause" : "play"} size={14} />
              {autoRefresh ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => load()}
              disabled={loading}
            >
              <Icon name="refresh" size={15} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        }
      />

      {error && <div className="error-msg">{error}</div>}

      {!summary && loading && (
        <div className="stat-grid" aria-label="Loading registry analytics">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
              <span className="skeleton-line tiny" />
            </div>
          ))}
        </div>
      )}

      {summary && (
        <>
          <section className="stat-grid">
            <article className="stat-card tone-accent">
              <span className="stat-icon">
                <Icon name="car" size={19} />
              </span>
              <div className="stat-content">
                <span className="stat-label">Vehicles</span>
                <strong className="stat-value">{totals.vehicles}</strong>
                <span className="stat-hint">in the registry index</span>
              </div>
            </article>

            <article className="stat-card tone-info">
              <span className="stat-icon">
                <Icon name="layers" size={19} />
              </span>
              <div className="stat-content">
                <span className="stat-label">History records</span>
                <strong className="stat-value">{totals.records}</strong>
                <span className="stat-hint">written on-chain</span>
              </div>
            </article>

            <article className="stat-card tone-neutral">
              <span className="stat-icon">
                <Icon name="photo" size={19} />
              </span>
              <div className="stat-content">
                <span className="stat-label">Verified photos</span>
                <strong className="stat-value">{totals.photos}</strong>
                <span className="stat-hint">{photoPercent}% of vehicles</span>
              </div>
            </article>

            <article className={`stat-card tone-${trustTone}`}>
              <span className="stat-icon">
                <Icon name="gauge" size={19} />
              </span>
              <div className="stat-content">
                <span className="stat-label">Average trust</span>
                <strong className="stat-value">
                  {summary.averageTrustScore ?? "—"}
                </strong>
                <span className="stat-hint">out of 100 · rated vehicles</span>
              </div>
            </article>

            <article
              className={`stat-card ${
                totals.suspicious ? "tone-danger" : "tone-success"
              }`}
            >
              <span className="stat-icon">
                <Icon name="flag" size={19} />
              </span>
              <div className="stat-content">
                <span className="stat-label">Flagged suspicious</span>
                <strong className="stat-value">{totals.suspicious}</strong>
                <span className="stat-hint">
                  {totals.normal} normal · {totals.verified} verified
                </span>
              </div>
            </article>
          </section>

          <div className="dashboard-grid">
            <section className="panel panel-wide">
              <div className="panel-head">
                <div>
                  <h2>14-day activity</h2>
                  <span className="panel-sub">History records written per day</span>
                </div>
                <span className="panel-badge">
                  {summary.activity.reduce((total, day) => total + day.count, 0)}{" "}
                  records
                </span>
              </div>
              <div
                className="bar-chart"
                role="img"
                aria-label="History records per day over the last 14 days"
              >
                {summary.activity.map((day) => (
                  <div
                    className="bar-column"
                    key={day.date}
                    title={`${day.date}: ${day.count} records`}
                  >
                    <span className="bar-value">
                      {day.count > 0 ? day.count : ""}
                    </span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${Math.max(3, (day.count / activityMax) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="bar-label">{dayLabel(day.date)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Trust distribution</h2>
                  <span className="panel-sub">Vehicles by risk level</span>
                </div>
                <span className="panel-badge">{totals.unrated} unrated</span>
              </div>
              <div className="stacked-bar">
                {summary.trustDistribution.map((entry) => {
                  const meta = RISK_META[entry.level] || RISK_META.UNRATED;
                  const width = (entry.count / trustTotal) * 100;
                  if (!entry.count) return null;
                  return (
                    <div
                      key={entry.level}
                      className={`stacked-segment tone-${meta.tone}`}
                      style={{ width: `${width}%` }}
                      title={`${meta.label}: ${entry.count}`}
                    />
                  );
                })}
              </div>
              <ul className="legend-list">
                {summary.trustDistribution.map((entry) => {
                  const meta = RISK_META[entry.level] || RISK_META.UNRATED;
                  return (
                    <li key={entry.level}>
                      <span
                        className={`legend-dot tone-${meta.tone}`}
                        aria-hidden="true"
                      />
                      <span className="legend-label">{meta.label}</span>
                      <strong>{entry.count}</strong>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Records by type</h2>
                  <span className="panel-sub">Composition of the evidence trail</span>
                </div>
                <span className="panel-badge">{totals.records} total</span>
              </div>
              <ul className="rank-list">
                {summary.recordsByType.map((entry) => {
                  const meta = RECORD_META[entry.type] || {
                    label: entry.type,
                    icon: "file",
                  };
                  return (
                    <li key={entry.type}>
                      <span className="rank-label">
                        <Icon name={meta.icon} size={13} />
                        {meta.label}
                      </span>
                      <div className="rank-track">
                        <div
                          className="rank-fill"
                          style={{
                            width: `${Math.max(2, (entry.count / typeMax) * 100)}%`,
                            background:
                              RECORD_CHART_COLORS[entry.type] || "var(--indigo)",
                          }}
                        />
                      </div>
                      <strong>{entry.count}</strong>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Top makes</h2>
                  <span className="panel-sub">Distribution across the registry</span>
                </div>
                <span className="panel-badge">{totals.owners} owners</span>
              </div>
              {summary.topMakes.length === 0 ? (
                <p className="empty-note">No vehicles indexed yet.</p>
              ) : (
                <ul className="rank-list">
                  {summary.topMakes.map((entry) => (
                    <li key={entry.make}>
                      <span className="rank-label">{entry.make}</span>
                      <div className="rank-track">
                        <div
                          className="rank-fill rank-fill-indigo"
                          style={{
                            width: `${Math.max(2, (entry.count / makeMax) * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>{entry.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel panel-wide">
              <div className="panel-head">
                <div>
                  <h2>Live activity</h2>
                  <span className="panel-sub">
                    Registrations · records · photos
                  </span>
                </div>
                <span className="panel-badge">{activity.length} events</span>
              </div>
              {activity.length === 0 ? (
                <p className="empty-note">No activity yet.</p>
              ) : (
                <ul className="activity-feed">
                  {activity.map((item) => {
                    const kind = KIND_META[item.kind] || KIND_META.RECORD;
                    const record = RECORD_META[item.recordType];
                    const risk = item.riskLevel ? RISK_META[item.riskLevel] : null;
                    return (
                      <li className="activity-item" key={item.id}>
                        <span
                          className={`activity-icon tone-${
                            record?.tone || "neutral"
                          }`}
                        >
                          <Icon
                            name={record ? record.icon : kind.icon}
                            size={16}
                          />
                        </span>
                        <div className="activity-body">
                          <div className="activity-title">
                            <Link
                              to={`/vehicle/${encodeURIComponent(item.vin)}`}
                            >
                              {item.vin}
                            </Link>
                            {record && (
                              <span
                                className={`activity-chip tone-${record.tone}`}
                              >
                                {record.label}
                              </span>
                            )}
                            {item.kind !== "RECORD" && (
                              <span className="activity-chip tone-neutral">
                                {kind.label}
                              </span>
                            )}
                            {risk && (
                              <span className={`activity-chip tone-${risk.tone}`}>
                                {risk.label} risk
                              </span>
                            )}
                          </div>
                          <p>
                            {item.make || item.model
                              ? `${item.make || ""} ${item.model || ""}`.trim()
                              : "Vehicle"}{" "}
                            · {item.description}
                          </p>
                          <span className="activity-meta">
                            {shortAddress(item.actor)} ·{" "}
                            {relativeTime(item.timestamp)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="panel panel-wide">
              <div className="panel-head">
                <div>
                  <h2>Recently indexed vehicles</h2>
                  <span className="panel-sub">
                    Open a vehicle to see its full passport
                  </span>
                </div>
              </div>
              {summary.recentVehicles.length === 0 ? (
                <p className="empty-note">No vehicles indexed yet.</p>
              ) : (
                <div className="recent-vehicle-grid">
                  {summary.recentVehicles.map((vehicle) => {
                    const risk = vehicle.riskLevel
                      ? RISK_META[vehicle.riskLevel]
                      : null;
                    return (
                      <Link
                        className="recent-vehicle-card"
                        key={vehicle.vin}
                        to={`/vehicle/${encodeURIComponent(vehicle.vin)}`}
                      >
                        {vehicle.photoUrl ? (
                          <img src={vehicle.photoUrl} alt={vehicle.vin} />
                        ) : (
                          <div className="recent-vehicle-placeholder">
                            <Icon name="car" size={22} />
                          </div>
                        )}
                        <div className="recent-vehicle-copy">
                          <strong>
                            {vehicle.make || vehicle.model
                              ? `${vehicle.make || ""} ${vehicle.model || ""}`.trim()
                              : `Vehicle ${vehicle.vin}`}
                          </strong>
                          <span>
                            {vehicle.year ? `${vehicle.year} · ` : ""}
                            {vehicle.vin}
                          </span>
                          {risk && (
                            <span className={`mini-risk tone-${risk.tone}`}>
                              {risk.label} risk
                              {vehicle.trustScore != null
                                ? ` · ${vehicle.trustScore}/100`
                                : ""}
                            </span>
                          )}
                        </div>
                        <Icon
                          name="chevronRight"
                          size={15}
                          className="recent-vehicle-arrow"
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
