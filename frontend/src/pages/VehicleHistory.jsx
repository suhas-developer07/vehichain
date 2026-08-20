import { useState } from "react";
import { getVehicle } from "../api/client.js";
import RecordCard from "../components/RecordCard.jsx";

export default function VehicleHistory() {
  const [vin, setVin] = useState("");
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!vin.trim()) return;

    setLoading(true);
    setError(null);
    setVehicle(null);

    try {
      const data = await getVehicle(vin.trim());
      setVehicle(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>🔍 Vehicle History Lookup</h1>
      <p className="page-desc">
        Enter a VIN to view the full vehicle history. This works for anyone — no
        wallet connection required.
      </p>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="Enter VIN (e.g., VIN123)"
          className="vin-input"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Look Up"}
        </button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      {vehicle && (
        <div className="vehicle-details">
          <h2>Vehicle Details</h2>
          <div className="detail-grid">
            <div className="detail">
              <label>VIN</label>
              <span>{vehicle.vin}</span>
            </div>
            <div className="detail">
              <label>Make</label>
              <span>{vehicle.make}</span>
            </div>
            <div className="detail">
              <label>Model</label>
              <span>{vehicle.model}</span>
            </div>
            <div className="detail">
              <label>Year</label>
              <span>{vehicle.year}</span>
            </div>
            <div className="detail">
              <label>Current Owner</label>
              <span title={vehicle.currentOwner}>
                {vehicle.currentOwner?.slice(0, 6)}...{vehicle.currentOwner?.slice(-4)}
              </span>
            </div>
            <div className="detail">
              <label>Record Count</label>
              <span>{vehicle.recordCount}</span>
            </div>
          </div>

          <h3>History ({vehicle.history.length} records)</h3>
          {vehicle.history.length === 0 ? (
            <p className="no-records">No records found for this vehicle.</p>
          ) : (
            <div className="records-list">
              {vehicle.history.map((record, idx) => (
                <RecordCard key={idx} record={record} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
