import { useState, useEffect } from "react";
import WatchlistPanel from "../components/WatchlistPanel.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";

const ROLES = [
  { value: 0, label: "NONE", tone: "neutral", description: "No operator privileges." },
  {
    value: 1,
    label: "OWNER",
    tone: "success",
    description: "Vehicle owner. Assigned automatically on registration.",
  },
  {
    value: 2,
    label: "SERVICE_CENTER",
    tone: "info",
    description: "Can write service and inspection records.",
  },
  {
    value: 3,
    label: "INSURANCE",
    tone: "warning",
    description: "Can write insurance and accident records.",
  },
  {
    value: 4,
    label: "GOVERNMENT",
    tone: "accent",
    description: "Can write inspection and regulatory records.",
  },
  {
    value: 5,
    label: "BUYER",
    tone: "neutral",
    description: "Read-only buyer access to reports and passports.",
  },
];

export default function AdminRoles({ contract, account, signer }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({ address: "", role: 2 });
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!contract || !account) return;
      try {
        const adminAddr = await contract.admin();
        setIsAdmin(adminAddr.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error("Failed to check admin:", err);
      }
    };
    checkAdmin();
  }, [contract, account]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }

    setStatus("confirming");
    setErrorMsg(null);

    try {
      const tx = await contract.assignRole(form.address, parseInt(form.role));
      setStatus("pending");
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      setStatus("confirmed");
      setTxHash(receipt.hash);
    } catch (err) {
      setStatus("failed");
      setErrorMsg(err.reason || err.message || "Transaction failed");
    }
  };

  if (!account) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Control · Permissions"
          title="Admin console"
          description="Assign operator roles and manage the buyer-report watchlist."
        />
        <div className="state-panel">
          <span className="state-icon">
            <Icon name="wallet" size={22} />
          </span>
          <h2>Connect your wallet to continue</h2>
          <p>
            The admin console is restricted to the contract admin wallet.
            Connect MetaMask from the top bar.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Control · Permissions"
          title="Admin console"
          description="Assign operator roles and manage the buyer-report watchlist."
        />
        <div className="state-panel state-panel-denied">
          <span className="state-icon">
            <Icon name="lock" size={22} />
          </span>
          <h2>Access denied</h2>
          <p>Only the contract admin can assign roles or manage the watchlist.</p>
          <p className="state-panel-note">
            Connected wallet
            <code className="mono-line">{account}</code>
          </p>
        </div>
      </div>
    );
  }

  const statusTone =
    status === "confirmed" ? "confirmed" : status === "failed" ? "failed" : "pending";

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Control · Permissions"
        title="Admin console"
        description="Assign operator roles and manage the admin-signed watchlist that feeds buyer due-diligence reports."
        meta={
          <span className="status-pill tone-success">
            <span className="status-dot" />
            Contract admin verified
          </span>
        }
      />

      <div className="form-layout">
        <form onSubmit={handleSubmit} className="form form-card">
          <section className="form-section">
            <div className="form-section-head">
              <span className="step-badge">01</span>
              <div>
                <h2>Assign a role</h2>
                <p>
                  Grant an operator wallet the right to write specific record
                  types to the registry.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group form-group-full">
                <label htmlFor="admin-address">Wallet address *</label>
                <input
                  id="admin-address"
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="0x…"
                  className="mono-input"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group form-group-full">
                <span className="field-label">Role *</span>
                <div className="role-picker" role="radiogroup" aria-label="Role">
                  {ROLES.map((role) => {
                    const selected = Number(form.role) === role.value;
                    return (
                      <label
                        key={role.value}
                        className={`role-option tone-${role.tone} ${
                          selected ? "is-selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={selected}
                          onChange={handleChange}
                          className="native-radio"
                        />
                        <span className="role-option-head">
                          <strong>{role.label}</strong>
                          <span className="role-radio" aria-hidden="true" />
                        </span>
                        <span className="role-option-desc">{role.description}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={status === "confirming" || status === "pending"}
            >
              {status === "confirming"
                ? "Confirm in MetaMask…"
                : status === "pending"
                  ? "Assigning…"
                  : "Assign role"}
            </button>
            <span className="form-actions-note">
              <Icon name="lock" size={13} />
              Admin-only transaction
            </span>
          </div>
        </form>

        <aside className="form-aside">
          <section className="side-card">
            <span className="eyebrow">Admin authority</span>
            <h3>Handle with care</h3>
            <ul className="side-list">
              <li>
                <Icon name="check" size={14} />
                Roles grant permanent write access
              </li>
              <li>
                <Icon name="check" size={14} />
                Only this admin wallet can change them
              </li>
              <li>
                <Icon name="check" size={14} />
                Every assignment is an on-chain transaction
              </li>
            </ul>
          </section>

          <section className="side-card side-card-quiet">
            <span className="eyebrow">Demo tip</span>
            <p className="side-card-lede">
              Use this console to grant a Ganache test account a Service Center,
              Insurance, or Government role, then switch wallets to add records.
            </p>
          </section>
        </aside>
      </div>

      {txHash && (
        <div className={`status-msg ${statusTone}`}>
          <span className="status-msg-icon">
            {statusTone === "confirmed" ? (
              <Icon name="check" size={17} />
            ) : statusTone === "failed" ? (
              <Icon name="alert" size={17} />
            ) : (
              <span className="spinner" aria-hidden="true" />
            )}
          </span>
          <div>
            <strong>Role assignment</strong>
            <p>
              {status === "pending" && "Transaction is pending confirmation."}
              {status === "confirmed" && "Confirmed. The role is now active."}
              {status === "failed" && `Failed: ${errorMsg}`}
            </p>
            <span className="status-tx mono-line">tx {txHash.slice(0, 20)}…</span>
          </div>
        </div>
      )}

      {status === "failed" && errorMsg && !txHash && (
        <div className="error-msg">{errorMsg}</div>
      )}

      <WatchlistPanel signer={signer} />
    </div>
  );
}
