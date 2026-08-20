import { useState } from "react";
import { getVehicle } from "../api/client.js";

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
        <h1>🔄 Transfer Ownership</h1>
        <p className="warning-msg">Please connect your wallet to transfer ownership.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>🔄 Transfer Ownership</h1>
      <p className="page-desc">
        Transfer vehicle ownership to another wallet address.
      </p>

      <div className="form">
        <div className="form-group">
          <label>VIN *</label>
          <div className="input-group">
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Vehicle Identification Number"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={checkOwnership}
              disabled={checking}
            >
              {checking ? "Checking..." : "Check"}
            </button>
          </div>
        </div>

        {vehicle && (
          <div className="ownership-info">
            <p>
              <strong>Current Owner:</strong>{" "}
              <span title={vehicle.currentOwner}>
                {vehicle.currentOwner?.slice(0, 6)}...{vehicle.currentOwner?.slice(-4)}
              </span>
            </p>
            {isOwner ? (
              <p className="success-msg">✅ You are the current owner</p>
            ) : (
              <p className="warning-msg">⚠️ You are not the current owner of this vehicle</p>
            )}
          </div>
        )}

        {vehicle && isOwner && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Owner Address *</label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === "confirming" || status === "pending"}
            >
              {status === "confirming"
                ? "Confirm in MetaMask..."
                : status === "pending"
                ? "Pending..."
                : "Transfer Ownership"}
            </button>
          </form>
        )}
      </div>

      {txHash && (
        <div className={`status-msg ${status}`}>
          <p>
            <strong>Status:</strong>{" "}
            {status === "pending" && `Pending (tx: ${txHash.slice(0, 10)}...)`}
            {status === "confirmed" && `Confirmed! Ownership transferred.`}
            {status === "failed" && `Failed: ${errorMsg}`}
          </p>
        </div>
      )}

      {status === "failed" && errorMsg && (
        <div className="error-msg">{errorMsg}</div>
      )}
    </div>
  );
}
