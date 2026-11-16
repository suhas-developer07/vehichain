import { useCallback, useEffect, useState } from "react";
import {
  addWatchlistEntry,
  getWatchlist,
  resolveWatchlistEntry,
} from "../api/client.js";
import {
  buildWatchlistMessage,
  buildWatchlistResolveMessage,
} from "../utils/watchlist.js";
import Icon from "./Icon.jsx";

const SEVERITIES = ["low", "medium", "high", "critical"];

function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default function WatchlistPanel({ signer }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    vin: "",
    owner: "",
    reason: "",
    severity: "medium",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWatchlist({ includeResolved: true });
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!signer) {
      setError("Please connect the admin wallet first");
      return;
    }

    const payload = {
      vin: form.vin.trim(),
      owner: form.owner.trim(),
      reason: form.reason.trim(),
      severity: form.severity,
    };

    if (!payload.vin && !payload.owner) {
      setError("Enter a VIN, an owner address, or both");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const timestamp = Date.now();
      const message = buildWatchlistMessage({ ...payload, timestamp });
      const signature = await signer.signMessage(message);
      await addWatchlistEntry({ ...payload, signature, timestamp });

      setSuccess(
        "Watchlist entry signed and saved. It now appears in buyer reports."
      );
      setForm({ vin: "", owner: "", reason: "", severity: "medium" });
      await load();
    } catch (err) {
      setError(err.reason || err.message || "Failed to add watchlist entry");
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id) => {
    if (!signer) {
      setError("Please connect the admin wallet first");
      return;
    }

    setResolving(id);
    setError(null);
    setSuccess(null);

    try {
      const timestamp = Date.now();
      const message = buildWatchlistResolveMessage(id, timestamp);
      const signature = await signer.signMessage(message);
      await resolveWatchlistEntry(id, signature, timestamp);
      setSuccess("Watchlist entry resolved.");
      await load();
    } catch (err) {
      setError(err.reason || err.message || "Failed to resolve entry");
    } finally {
      setResolving(null);
    }
  };

  const activeCount = entries.filter((entry) => entry.active).length;

  return (
    <section className="panel watchlist-panel">
      <div className="panel-head">
        <div>
          <h2>
            <span className="panel-title-icon">
              <Icon name="flag" size={16} />
            </span>
            Buyer-report watchlist
          </h2>
          <span className="panel-sub">
            {activeCount} active · surfaced in buyer due-diligence reports
          </span>
        </div>
        <span className="panel-badge">{entries.length} total</span>
      </div>

      <p className="watchlist-hint">
        <Icon name="info" size={14} />
        Entries are stored off-chain but require a signature from the contract
        admin wallet, so only the admin can flag or clear a vehicle or owner.
      </p>

      <form onSubmit={handleSubmit} className="watchlist-form">
        <div className="watchlist-form-row">
          <div className="form-group">
            <label htmlFor="watch-vin">VIN</label>
            <input
              id="watch-vin"
              type="text"
              name="vin"
              value={form.vin}
              onChange={handleChange}
              placeholder="VIN1001"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="watch-owner">Owner wallet</label>
            <input
              id="watch-owner"
              type="text"
              name="owner"
              value={form.owner}
              onChange={handleChange}
              placeholder="0x…"
              className="mono-input"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="watch-severity">Severity</label>
            <select
              id="watch-severity"
              name="severity"
              value={form.severity}
              onChange={handleChange}
            >
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="watch-reason">Reason *</label>
          <input
            id="watch-reason"
            type="text"
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Reported stolen, cloned VIN, unpaid lien…"
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Icon name="flag" size={15} />
            {saving ? "Signing & saving…" : "Add watchlist entry"}
          </button>
        </div>
      </form>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {loading ? (
        <div className="watchlist-loading">
          <span className="spinner" aria-hidden="true" />
          Loading watchlist…
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state empty-state-compact">
          <span className="state-icon">
            <Icon name="shieldCheck" size={20} />
          </span>
          <h3>No watchlist entries</h3>
          <p>Flagged vehicles and owners will appear here.</p>
        </div>
      ) : (
        <ul className="watchlist-list">
          {entries.map((entry) => (
            <li
              key={entry._id}
              className={`watchlist-entry severity-${entry.severity} ${
                entry.active ? "" : "resolved"
              }`}
            >
              <span className="watchlist-severity">
                <span className="severity-dot" aria-hidden="true" />
                {entry.severity}
              </span>
              <div className="watchlist-body">
                <strong>{entry.reason}</strong>
                <span className="watchlist-targets">
                  {entry.vin ? <code>VIN {entry.vin}</code> : <em>No VIN</em>}
                  {entry.owner && <code>{shortAddress(entry.owner)}</code>}
                </span>
                <span className="watchlist-meta">
                  {entry.active
                    ? `Added ${new Date(entry.createdAt).toLocaleDateString()}`
                    : `Resolved ${new Date(entry.resolvedAt).toLocaleDateString()}`}
                </span>
              </div>
              {entry.active ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleResolve(entry._id)}
                  disabled={resolving === entry._id}
                >
                  {resolving === entry._id ? "Signing…" : "Resolve"}
                </button>
              ) : (
                <span className="watchlist-resolved-tag">
                  <Icon name="check" size={12} />
                  Resolved
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
