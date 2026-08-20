import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterVehicle({ contract, account }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vin: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
  });
  const [status, setStatus] = useState(null); // null | "pending" | "confirming" | "confirmed" | "failed"
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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
      const tx = await contract.registerVehicle(
        form.vin,
        form.make,
        form.model,
        parseInt(form.year)
      );
      setStatus("pending");
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      setStatus("confirmed");
      setTxHash(receipt.hash);

      // Redirect to vehicle history after 2 seconds
      setTimeout(() => {
        navigate(`/vehicle/${form.vin}`);
      }, 2000);
    } catch (err) {
      setStatus("failed");
      setErrorMsg(err.reason || err.message || "Transaction failed");
    }
  };

  if (!account) {
    return (
      <div className="page">
        <h1>📝 Register Vehicle</h1>
        <p className="warning-msg">Please connect your wallet to register a vehicle.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>📝 Register Vehicle</h1>
      <p className="page-desc">
        Register a new vehicle on the blockchain. You will become the initial owner.
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
          <label>Make *</label>
          <input
            type="text"
            name="make"
            value={form.make}
            onChange={handleChange}
            placeholder="e.g., Toyota"
            required
          />
        </div>
        <div className="form-group">
          <label>Model *</label>
          <input
            type="text"
            name="model"
            value={form.model}
            onChange={handleChange}
            placeholder="e.g., Camry"
            required
          />
        </div>
        <div className="form-group">
          <label>Year *</label>
          <input
            type="number"
            name="year"
            value={form.year}
            onChange={handleChange}
            min="1900"
            max={new Date().getFullYear() + 1}
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
            : "Register Vehicle"}
        </button>
      </form>

      {txHash && (
        <div className={`status-msg ${status}`}>
          <p>
            <strong>Status:</strong>{" "}
            {status === "pending" && `Pending (tx: ${txHash.slice(0, 10)}...)`}
            {status === "confirmed" && `Confirmed! Redirecting...`}
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
