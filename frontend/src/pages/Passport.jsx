import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPassport, passportPdfUrl } from "../api/client.js";
import TrustScoreCard from "../components/TrustScoreCard.jsx";
import Icon from "../components/Icon.jsx";

const RECORD_META = {
  SERVICE: { label: "Service", tone: "success" },
  ACCIDENT: { label: "Accident", tone: "danger" },
  INSURANCE: { label: "Insurance", tone: "warning" },
  OWNERSHIP_TRANSFER: { label: "Ownership transfer", tone: "info" },
  INSPECTION: { label: "Inspection", tone: "accent" },
};

function formatDate(value) {
  if (!value) return "Not indexed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function shortAddress(address) {
  if (!address) return "Unknown";
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default function Passport() {
  const { vin } = useParams();
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPassport(vin);
      setPassport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vin]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page passport-page">
      <div className="passport-toolbar no-print">
        <Link
          to={`/vehicle/${encodeURIComponent(vin)}`}
          className="btn btn-ghost"
        >
          <Icon name="arrowLeft" size={16} />
          Back to dossier
        </Link>

        <div className="passport-toolbar-actions">
          <Link
            to={`/due-diligence/${encodeURIComponent(vin)}`}
            className="btn btn-secondary"
          >
            <Icon name="shieldCheck" size={16} />
            Buyer report
          </Link>
          <a href={passportPdfUrl(vin)} className="btn btn-secondary">
            <Icon name="download" size={16} />
            Download PDF
          </a>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            disabled={!passport}
          >
            <Icon name="printer" size={16} />
            Print passport
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-panel">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Building the passport…</strong>
            <span>Resolving on-chain records, trust score, and document fingerprint.</span>
          </div>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {passport && (
        <article className="passport-doc">
          <div className="passport-guilloche" aria-hidden="true" />

          <header className="passport-header">
            <div className="passport-brand">
              <span className="passport-seal">
                <Icon name="shieldCheck" size={26} />
              </span>
              <div>
                <p className="passport-eyebrow">
                  Vellum · Blockchain Vehicle Registry
                </p>
                <h1>Vehicle Passport</h1>
                <p className="passport-subtitle">
                  A tamper-evident summary of on-chain ownership and history.
                </p>
              </div>
            </div>
            <div className="passport-qr">
              <img
                src={passport.qrDataUrl}
                alt="QR code linking to this public passport"
              />
              <span>Scan to verify</span>
            </div>
          </header>

          <div className="passport-rule" aria-hidden="true" />

          <section className="passport-identity">
            <div className="passport-photo-wrap">
              {passport.photoUrl ? (
                <img
                  src={passport.photoUrl}
                  alt={`${passport.year} ${passport.make} ${passport.model}`}
                  className="passport-photo"
                />
              ) : (
                <div className="passport-photo-placeholder">
                  <Icon name="car" size={40} />
                  <span>No photo on file</span>
                </div>
              )}
              <span className="passport-photo-label">Registry photo</span>
              {passport.photoHash && (
                <p className="passport-photo-hash">
                  <span>Photo SHA-256</span>
                  <code title={passport.photoHash}>
                    {passport.photoHash.slice(0, 24)}…
                  </code>
                </p>
              )}
            </div>

            <div className="passport-facts">
              <div className="passport-fact">
                <span>VIN</span>
                <strong className="passport-vin">{passport.vin}</strong>
              </div>
              <div className="passport-fact">
                <span>Make / model</span>
                <strong>
                  {passport.make} {passport.model}
                </strong>
              </div>
              <div className="passport-fact">
                <span>Year</span>
                <strong>{passport.year}</strong>
              </div>
              <div className="passport-fact">
                <span>Current owner</span>
                <strong title={passport.currentOwner}>
                  {shortAddress(passport.currentOwner)}
                </strong>
              </div>
              <div className="passport-fact">
                <span>Registered</span>
                <strong>{formatDate(passport.registeredAt)}</strong>
              </div>
              <div className="passport-fact">
                <span>On-chain records</span>
                <strong>{passport.recordCount}</strong>
              </div>
            </div>
          </section>

          <TrustScoreCard
            trust={passport.trust}
            vin={passport.vin}
            showActions={false}
          />

          <section className="passport-history">
            <div className="passport-section-head">
              <h2>Vehicle history</h2>
              <span>{passport.history.length} on-chain records</span>
            </div>

            {passport.history.length === 0 ? (
              <p className="empty-note">No on-chain records for this vehicle.</p>
            ) : (
              <ol className="passport-timeline">
                {passport.history.map((record) => {
                  const meta = RECORD_META[record.recordType] || {
                    label: record.recordType,
                    tone: "neutral",
                  };
                  return (
                    <li key={record.index} className={`tone-${meta.tone}`}>
                      <span className="timeline-dot" aria-hidden="true" />
                      <div className="timeline-body">
                        <div className="timeline-head">
                          <span className="timeline-type">{meta.label}</span>
                          <span className="timeline-date">
                            {formatDateTime(record.timestamp)}
                          </span>
                        </div>
                        <p>{record.description}</p>
                        <div className="timeline-meta">
                          <span title={record.recordedBy}>
                            <Icon name="wallet" size={11} />
                            Recorded by {shortAddress(record.recordedBy)}
                          </span>
                          {record.dataHash && (
                            <span className="mono-line" title={record.dataHash}>
                              <Icon name="fingerprint" size={11} />
                              Evidence: {record.dataHash.slice(0, 20)}…
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <footer className="passport-footer">
            <div className="passport-footer-grid">
              <div>
                <span>Document SHA-256</span>
                <code>{passport.documentHash}</code>
              </div>
              <div>
                <span>Generated</span>
                <strong>{formatDateTime(passport.generatedAt)}</strong>
              </div>
              <div>
                <span>Public verification URL</span>
                <code>{passport.passportUrl}</code>
              </div>
            </div>
            <p className="passport-footnote">
              <Icon name="lock" size={12} />
              This passport is generated from live on-chain state. Scan the QR
              code or compare the document hash to verify authenticity.
            </p>
          </footer>
        </article>
      )}
    </div>
  );
}
