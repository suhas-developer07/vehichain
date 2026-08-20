const RECORD_TYPE_LABELS = {
  SERVICE: "🔧 Service",
  ACCIDENT: "💥 Accident",
  INSURANCE: "🛡️ Insurance",
  OWNERSHIP_TRANSFER: "🔄 Ownership Transfer",
  INSPECTION: "🔍 Inspection",
};

const RECORD_TYPE_COLORS = {
  SERVICE: "#28a745",
  ACCIDENT: "#dc3545",
  INSURANCE: "#fd7e14",
  OWNERSHIP_TRANSFER: "#007bff",
  INSPECTION: "#6f42c1",
};

export default function RecordCard({ record }) {
  const label = RECORD_TYPE_LABELS[record.recordType] || record.recordType;
  const color = RECORD_TYPE_COLORS[record.recordType] || "#6c757d";

  return (
    <div className="record-card">
      <div className="record-header">
        <span className="record-type" style={{ borderColor: color, color }}>
          {label}
        </span>
        <span className="record-date">
          {new Date(record.timestamp).toLocaleDateString()}{" "}
          {new Date(record.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="record-body">
        <p>{record.description}</p>
        {record.dataHash && (
          <p className="record-hash">
            <strong>Data Hash:</strong> {record.dataHash}
          </p>
        )}
        <p className="record-by">
          <strong>Recorded by:</strong>{" "}
          <span title={record.recordedBy}>
            {record.recordedBy?.slice(0, 6)}...{record.recordedBy?.slice(-4)}
          </span>
        </p>
      </div>
    </div>
  );
}
