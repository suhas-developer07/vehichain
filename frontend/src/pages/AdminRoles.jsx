import { useState, useEffect } from "react";

const ROLES = [
  { value: 0, label: "NONE" },
  { value: 1, label: "OWNER" },
  { value: 2, label: "SERVICE_CENTER" },
  { value: 3, label: "INSURANCE" },
  { value: 4, label: "GOVERNMENT" },
  { value: 5, label: "BUYER" },
];

export default function AdminRoles({ contract, account }) {
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
        <h1>⚙️ Admin — Assign Roles</h1>
        <p className="warning-msg">Please connect your wallet to access admin functions.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <h1>⚙️ Admin — Assign Roles</h1>
        <div className="warning-msg">
          <p>
            <strong>Access Denied:</strong> Only the contract admin can assign roles.
          </p>
          <p>
            Your address: <code>{account}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>⚙️ Admin — Assign Roles</h1>
      <p className="page-desc">
        Assign roles to addresses for demo accounts. Use this to set up Service
        Center, Insurance, or Government roles for other Ganache test accounts.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Wallet Address *</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="0x..."
            required
          />
        </div>
        <div className="form-group">
          <label>Role *</label>
          <select name="role" value={form.role} onChange={handleChange} required>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
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
            : "Assign Role"}
        </button>
      </form>

      {txHash && (
        <div className={`status-msg ${status}`}>
          <p>
            <strong>Status:</strong>{" "}
            {status === "pending" && `Pending (tx: ${txHash.slice(0, 10)}...)`}
            {status === "confirmed" && `Confirmed! Role assigned.`}
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
