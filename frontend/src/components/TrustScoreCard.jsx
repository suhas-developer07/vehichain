import { Link } from "react-router-dom";
import { passportPdfUrl } from "../api/client.js";
import Icon from "./Icon.jsx";

const SEVERITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const RISK_TONES = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "critical",
};

export default function TrustScoreCard({ trust, vin, showActions = true }) {
  if (!trust) return null;

  const flags = trust.flags || [];
  const factors = trust.factors || [];
  const riskTone = RISK_TONES[trust.riskLevel] || "neutral";

  return (
    <section className={`trust-card tone-${riskTone}`}>
      <div className="trust-main">
        <div className="trust-gauge-wrap">
          <div
            className="trust-gauge"
            style={{ "--score": trust.score }}
            aria-label={`Trust score ${trust.score} out of 100`}
          >
            <div className="trust-gauge-inner">
              <strong>{trust.score}</strong>
              <span>/100</span>
            </div>
          </div>
          <span className="trust-gauge-caption">Trust score</span>
        </div>

        <div className="trust-summary">
          <div className="trust-badges">
            <span className="trust-grade">Grade {trust.grade}</span>
            <span className="risk-badge">
              <span className="risk-dot" />
              {trust.riskLabel}
            </span>
            <span className="trust-rating">{trust.rating}</span>
          </div>

          <h3>Trust &amp; fraud radar</h3>
          <p>{trust.summary}</p>

          <div className="trust-quick-stats">
            <span>
              <strong>{trust.stats.totalRecords}</strong>
              <small>records</small>
            </span>
            <span>
              <strong>{trust.stats.evidenceCoverage}%</strong>
              <small>anchored</small>
            </span>
            <span>
              <strong>{trust.stats.ownershipTransfers}</strong>
              <small>transfers</small>
            </span>
            <span>
              <strong>{trust.stats.accidents}</strong>
              <small>accidents</small>
            </span>
          </div>

          {showActions && (
            <div className="trust-actions">
              <Link
                to={`/due-diligence/${encodeURIComponent(vin)}`}
                className="btn btn-primary btn-sm"
              >
                <Icon name="shieldCheck" size={15} />
                Buyer check
              </Link>
              <Link
                to={`/passport/${encodeURIComponent(vin)}`}
                className="btn btn-secondary btn-sm"
              >
                <Icon name="certificate" size={15} />
                Passport
              </Link>
              <a href={passportPdfUrl(vin)} className="btn btn-ghost btn-sm">
                <Icon name="download" size={15} />
                PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {flags.length > 0 ? (
        <div className="fraud-radar">
          <div className="fraud-radar-head">
            <h4>Fraud radar</h4>
            <span className="fraud-count">
              {flags.length} indicator{flags.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul>
            {flags.map((flag) => (
              <li
                key={flag.code}
                className={`fraud-flag severity-${flag.severity}`}
              >
                <span className="fraud-severity">
                  {SEVERITY_LABELS[flag.severity] || flag.severity}
                </span>
                <div>
                  <strong>{flag.title}</strong>
                  <p>{flag.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="fraud-radar fraud-radar-clear">
          <span className="fraud-clear-icon">
            <Icon name="shieldCheck" size={20} />
          </span>
          <div>
            <h4>Fraud radar clear</h4>
            <p>No fraud indicators detected in this vehicle&apos;s record.</p>
          </div>
        </div>
      )}

      {factors.length > 0 && (
        <details className="trust-factors">
          <summary>
            <span>How this score was calculated</span>
            <Icon name="chevronDown" size={16} className="details-chevron" />
          </summary>
          <ul>
            {factors.map((factor) => (
              <li key={factor.label} className={factor.tone}>
                <span className="factor-impact">
                  {factor.impact > 0 ? "+" : ""}
                  {factor.impact}
                </span>
                <span className="factor-label">{factor.label}</span>
                <span className="factor-detail">{factor.detail}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
