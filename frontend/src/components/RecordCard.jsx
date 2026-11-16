import Icon from "./Icon.jsx";

const RECORD_META = {
  SERVICE: { label: "Service", icon: "wrench", tone: "success" },
  ACCIDENT: { label: "Accident", icon: "alert", tone: "danger" },
  INSURANCE: { label: "Insurance", icon: "shield", tone: "warning" },
  OWNERSHIP_TRANSFER: {
    label: "Ownership transfer",
    icon: "transfer",
    tone: "info",
  },
  INSPECTION: { label: "Inspection", icon: "search", tone: "accent" },
};

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecordCard({ record }) {
  const meta = RECORD_META[record.recordType] || {
    label: record.recordType,
    icon: "file",
    tone: "neutral",
  };

  return (
    <article className={`record-card tone-${meta.tone}`}>
      <div className="record-rail" aria-hidden="true">
        <span className="record-icon">
          <Icon name={meta.icon} size={16} />
        </span>
        <span className="record-line" />
      </div>

      <div className="record-panel">
        <header className="record-header">
          <span className="record-type">{meta.label}</span>
          <span className="record-date">
            <Icon name="clock" size={12} />
            {formatDateTime(record.timestamp)}
          </span>
        </header>

        <p className="record-description">{record.description}</p>

        <footer className="record-body">
          {record.dataHash && (
            <span className="record-hash" title={record.dataHash}>
              <Icon name="fingerprint" size={12} />
              <code>
                {record.dataHash.length > 30
                  ? `${record.dataHash.slice(0, 30)}…`
                  : record.dataHash}
              </code>
            </span>
          )}
          <span className="record-by">
            Recorded by{" "}
            <strong title={record.recordedBy}>
              {record.recordedBy?.slice(0, 6)}…{record.recordedBy?.slice(-4)}
            </strong>
          </span>
        </footer>
      </div>
    </article>
  );
}
