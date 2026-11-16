import { useState } from "react";
import { getVehicle } from "../api/client.js";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";

function shortAddress(address) {
  if (!address) return "Unknown";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function TransferOwnership({ contract, account }) {
  const [vin, setVin] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [vehicle, setVehicle] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkOwnership = async () => {
    if (!vin.trim()) return;
    setChecking(true);
    setErrorMsg(null);

    try {
      const data = await getVehicle(vin.trim());
      setVehicle(data);
      setIsOwner(
        data.currentOwner?.toLowerCase() === account?.toLowerCase()
      );
    } catch (err) {
      setErrorMsg(err.message);
      setVehicle(null);
      setIsOwner(false);
    } finally {
      setChecking(false);
    }
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
      const tx = await contract.transferOwnership(vin.trim(), newOwner);
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
          eyebrow="Operate · Hand-off"
          title="Transfer ownership"
          description="Move a vehicle to a new owner wallet. Verify the vehicle first, then sign the hand-off."
        />
        <div className="state-panel">
          <span className="state-icon">
            <Icon name="wallet" size={22} />
          </span>
          <h2>Connect your wallet to continue</h2>
          <p>
            Ownership transfers are signed by the current owner. Connect
            MetaMask from the top bar to get started.
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
        eyebrow="Operate · Hand-off"
        title="Transfer ownership"
        description="Move a vehicle to a new owner wallet. Verify the vehicle first, then sign the irreversible hand-off."
        meta={
          <span className="meta-item">
            <Icon name="alert" size={13} />
            Ownership changes cannot be undone
          </span>
        }
      />

      <div className="form-layout">
        <div className="form-card">
          <section className="form-section">
            <div className="form-section-head">
              <span className="step-badge">01</span>
              <div>
                <h2>Verify the vehicle</h2>
                <p>Look up the VIN and confirm you are the current owner.</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="transfer-vin">VIN *</label>
              <div className="input-group">
                <input
                  id="transfer-vin"
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="Vehicle Identification Number"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={checkOwnership}
                  disabled={checking}
                >
                  {checking ? "Checking…" : "Verify"}
                </button>
              </div>
            </div>

            {vehicle && (
              <div
                className={`verify-banner ${
                  isOwner ? "is-owner" : "is-not-owner"
                }`}
              >
                <span className="verify-icon">
                  <Icon name={isOwner ? "check" : "alert"} size={18} />
                </span>
                <div>
                  <strong>
                    {isOwner
                      ? "You are the current owner"
                      : "This vehicle belongs to another wallet"}
                  </strong>
                  <p>
                    {vehicle.year} {vehicle.make} {vehicle.model} · current owner{" "}
                    <code title={vehicle.currentOwner}>
                      {shortAddress(vehicle.currentOwner)}
                    </code>
                  </p>
                </div>
              </div>
            )}
          </section>

          {vehicle && isOwner && (
            <form onSubmit={handleSubmit} className="form-section transfer-form">
              <div className="form-section-head">
                <span className="step-badge">02</span>
                <div>
                  <h2>New owner</h2>
                  <p>Enter the wallet address that will receive this vehicle.</p>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="new-owner">New owner address *</label>
                <input
                  id="new-owner"
                  type="text"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="0x…"
                  className="mono-input"
                  autoComplete="off"
                  required
                />
                <p className="field-hint">
                  Double-check the address — a transfer cannot be reversed by
                  the registry.
                </p>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-danger btn-lg"
                  disabled={status === "confirming" || status === "pending"}
                >
                  {status === "confirming"
                    ? "Confirm in MetaMask…"
                    : status === "pending"
                      ? "Transferring…"
                      : "Transfer ownership"}
                </button>
                <span className="form-actions-note">
                  <Icon name="alert" size={13} />
                  Cannot be undone
                </span>
              </div>
            </form>
          )}
        </div>

        <aside className="form-aside">
          <section className="side-card">
            <span className="eyebrow">Before you transfer</span>
            <h3>Checklist</h3>
            <ul className="side-list">
              <li>
                <Icon name="check" size={14} />
                Payment or agreement is settled
              </li>
              <li>
                <Icon name="check" size={14} />
                The buyer address is correct
              </li>
              <li>
                <Icon name="check" size={14} />
                The buyer understands the vehicle&apos;s history
              </li>
            </ul>
          </section>

          <section className="side-card side-card-quiet">
            <span className="eyebrow">What changes</span>
            <p className="side-card-lede">
              The new address becomes the on-chain owner and gains photo-upload
              rights. All history stays attached to the vehicle.
            </p>
          </section>
        </aside>
      </div>

      {errorMsg && status !== "failed" && (
        <div className="error-msg">{errorMsg}</div>
      )}

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
            <strong>Transfer status</strong>
            <p>
              {status === "pending" && "Transfer is pending confirmation."}
              {status === "confirmed" &&
                "Confirmed. Ownership has moved to the new wallet."}
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
