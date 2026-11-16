import { useState } from "react";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";

const RECORD_TYPES = [
  { value: 0, label: "Service", icon: "wrench", tone: "success" },
  { value: 1, label: "Accident", icon: "alert", tone: "danger" },
  { value: 2, label: "Insurance", icon: "shield", tone: "warning" },
  { value: 3, label: "Ownership transfer", icon: "transfer", tone: "info" },
  { value: 4, label: "Inspection", icon: "search", tone: "accent" },
];

const AUTHORIZED_ROLES = ["SERVICE_CENTER", "INSURANCE", "GOVERNMENT"];

export default function AddRecord({ contract, account, roleName }) {
  const [form, setForm] = useState({
    vin: "",
    recordType: 0,
    description: "",
    dataHash: "",
  });
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const isAuthorized = AUTHORIZED_ROLES.includes(roleName);

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
      const tx = await contract.addRecord(
        form.vin,
        parseInt(form.recordType),
        form.dataHash || "",
        form.description
      );
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
          eyebrow="Operate · Evidence"
          title="Add a history record"
          description="Append a signed event to a vehicle's permanent on-chain history."
        />
        <div className="state-panel">
          <span className="state-icon">
            <Icon name="wallet" size={22} />
          </span>
          <h2>Connect your wallet to continue</h2>
          <p>
            Records are signed by an authorised service center, insurer, or
            government wallet. Connect MetaMask from the top bar.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Operate · Evidence"
          title="Add a history record"
          description="Append a signed event to a vehicle's permanent on-chain history."
        />
        <div className="state-panel state-panel-denied">
          <span className="state-icon">
            <Icon name="lock" size={22} />
          </span>
          <h2>Access denied</h2>
          <p>
            Your wallet is currently <strong>{roleName}</strong>. Only
            authorised operator roles can write history records.
          </p>
          <div className="role-requirement">
            {AUTHORIZED_ROLES.map((role) => (
              <span className="role-req" key={role}>
                <Icon name="check" size={13} />
                {role.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          <p className="state-panel-note">
            Ask the contract admin to assign your wallet a role in the admin
            console.
          </p>
        </div>
      </div>
    );
  }

  const statusTone =
    status === "confirmed" ? "confirmed" : status === "failed" ? "failed" : "pending";

  return (
    <div className="page">
      <PageHeader
        eyebrow="Operate · Evidence"
        title="Add a history record"
        description="Append a signed event to a vehicle's permanent history. Records can never be edited or deleted."
        meta={
          <>
            <span className="status-pill tone-success">
              <span className="status-dot" />
              Authorised as {roleName}
            </span>
            <span className="meta-item">
              <Icon name="lock" size={13} />
              Immutable on-chain write
            </span>
          </>
        }
      />

      <div className="form-layout">
        <form onSubmit={handleSubmit} className="form form-card">
          <section className="form-section">
            <div className="form-section-head">
              <span className="step-badge">01</span>
              <div>
                <h2>Record details</h2>
                <p>Identify the vehicle and the type of event being recorded.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group form-group-full">
                <label htmlFor="record-vin">VIN *</label>
                <input
                  id="record-vin"
                  type="text"
                  name="vin"
                  value={form.vin}
                  onChange={handleChange}
                  placeholder="Vehicle Identification Number"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group form-group-full">
                <span className="field-label">Record type *</span>
                <div className="type-picker" role="radiogroup" aria-label="Record type">
                  {RECORD_TYPES.map((type) => {
                    const selected = Number(form.recordType) === type.value;
                    return (
                      <label
                        key={type.value}
                        className={`type-option tone-${type.tone} ${
                          selected ? "is-selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="recordType"
                          value={type.value}
                          checked={selected}
                          onChange={handleChange}
                          className="native-radio"
                        />
                        <Icon name={type.icon} size={17} />
                        <span>{type.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="record-description">Description *</label>
                <textarea
                  id="record-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the event, findings, and any follow-up required…"
                  required
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="record-hash">Evidence hash (optional)</label>
                <input
                  id="record-hash"
                  type="text"
                  name="dataHash"
                  value={form.dataHash}
                  onChange={handleChange}
                  placeholder="SHA-256 of the supporting document"
                  className="mono-input"
                />
                <p className="field-hint">
                  Anchor an invoice, inspection sheet, or claim document without
                  exposing the file itself.
                </p>
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
                  ? "Writing record…"
                  : "Add record"}
            </button>
            <span className="form-actions-note">
              <Icon name="lock" size={13} />
              Cannot be edited or deleted
            </span>
          </div>
        </form>

        <aside className="form-aside">
          <section className="side-card">
            <span className="eyebrow">Write access</span>
            <h3>Authorised operator</h3>
            <p className="side-card-lede">
              Your connected wallet carries the <strong>{roleName}</strong> role.
            </p>
            <ul className="side-list">
              {AUTHORIZED_ROLES.map((role) => (
                <li key={role} className={role === roleName ? "is-current" : ""}>
                  <Icon
                    name={role === roleName ? "check" : "lock"}
                    size={14}
                  />
                  {role.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </section>

          <section className="side-card side-card-quiet">
            <span className="eyebrow">Immutable by design</span>
            <p className="side-card-lede">
              Once confirmed, this record becomes part of the vehicle&apos;s
              permanent evidence trail and feeds the trust score and buyer
              verdict.
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
            <strong>Record status</strong>
            <p>
              {status === "pending" && "Transaction is pending confirmation."}
              {status === "confirmed" && "Confirmed. The record is now permanent."}
              {status === "failed" && `Failed: ${errorMsg}`}
            </p>
            <span className="status-tx mono-line">tx {txHash.slice(0, 20)}…</span>
          </div>
        </div>
      )}

      {status === "failed" && errorMsg && !txHash && (
        <div className="error-msg">{errorMsg}</div>
      )}
    </div>
  );
}
