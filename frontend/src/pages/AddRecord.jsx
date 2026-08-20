import { useState } from "react";

const RECORD_TYPES = [
  { value: 0, label: "SERVICE" },
  { value: 1, label: "ACCIDENT" },
  { value: 2, label: "INSURANCE" },
  { value: 3, label: "OWNERSHIP_TRANSFER" },
  { value: 4, label: "INSPECTION" },
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
        <h1>📋 Add Record</h1>
        <p className="warning-msg">Please connect your wallet to add a record.</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="page">
        <h1>📋 Add Record</h1>
        <div className="warning-msg">
          <p>
            <strong>Access Denied:</strong> Your current role is <strong>{roleName}</strong>.
          </p>
          <p>Only accounts with SERVICE_CENTER, INSURANCE, or GOVERNMENT roles can add records.</p>
          <p>Contact the admin to get your role assigned.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>📋 Add Record</h1>
      <p className="page-desc">
        Add a new record to a vehicle's history. This will be permanently stored on the blockchain.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>VIN *</label>
          <input
            type="text"
            name="vin"
            value={form.vin}
            onChange={handleChange}
            placeholder="Vehicle Identification Number"
            required
          />
        </div>
        <div className="form-group">
          <label>Record Type *</label>
          <select
            name="recordType"
            value={form.recordType}
            onChange={handleChange}
            required
          >
            {RECORD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the record..."
            required
          />
        </div>
        <div className="form-group">
          <label>Data Hash (optional)</label>
          <input
            type="text"
            name="dataHash"
            value={form.dataHash}
            onChange={handleChange}
            placeholder="Optional data hash"
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
            : "Add Record"}
        </button>
      </form>

      {txHash && (
        <div className={`status-msg ${status}`}>
          <p>
            <strong>Status:</strong>{" "}
            {status === "pending" && `Pending (tx: ${txHash.slice(0, 10)}...)`}
            {status === "confirmed" && `Confirmed!`}
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
