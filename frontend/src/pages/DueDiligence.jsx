import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  dueDiligencePdfUrl,
  getDueDiligence,
  getDueDiligenceComparison,
} from "../api/client.js";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";

const CHECK_STYLE = {
  pass: { label: "Pass", icon: "check" },
  warn: { label: "Review", icon: "alert" },
  fail: { label: "Fail", icon: "x" },
  info: { label: "Info", icon: "info" },
};

const CHECK_GROUPS = [
  {
    icon: "network",
    title: "Chain truth",
    text: "Identity and history are read directly from the contract — not a cached database.",
  },
  {
    icon: "transfer",
    title: "Ownership trail",
    text: "Registration and transfer events, with clear from → to addresses.",
  },
  {
    icon: "file",
    title: "Evidence quality",
    text: "Accident follow-ups, inspections, service records, and anchored data hashes.",
  },
  {
    icon: "flag",
    title: "Watchlist",
    text: "Admin-signed flags on the VIN or the current owner wallet.",
  },
];

const RISK_TONE = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "critical",
};

function formatDate(value) {
  if (!value) return "Unknown";
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

function ownershipLabel(kind) {
  if (kind === "REGISTRATION") return "Registered";
  if (kind === "TRANSFER") return "Ownership transfer";
  return "Transfer record";
}

function ComparisonCard({ vehicle, isWinner }) {
  if (!vehicle) return null;
  const { verdict } = vehicle;
  const status = (verdict.status || "CAUTION").toLowerCase();

  return (
    <article className={`dd-compare-card ${isWinner ? "winner" : ""}`}>
      <header>
        <div className="dd-compare-title">
          <span className="dd-compare-vin">{vehicle.vin}</span>
          <strong>
            {vehicle.make} {vehicle.model}
          </strong>
          <span>{vehicle.year}</span>
        </div>
        <span className={`verdict-chip verdict-${status}`}>
          {verdict.label}
        </span>
      </header>

      {isWinner && (
        <div className="dd-winner-badge">
          <Icon name="check" size={13} />
          Better buy
        </div>
      )}

      <div className="dd-compare-score">
        <div className="dd-compare-score-main">
          <strong>{vehicle.trustScore}</strong>
          <span>/100</span>
        </div>
        <div className="dd-compare-score-meta">
          <span>Grade {vehicle.trustGrade}</span>
          <span
            className={`mini-risk tone-${
              RISK_TONE[vehicle.riskLevel] || "neutral"
            }`}
          >
            {vehicle.riskLabel}
          </span>
        </div>
      </div>

      <ul className="dd-compare-stats">
        <li>
          <span>Checks passed</span>
          <strong>
            {vehicle.scorecard.passed}/{vehicle.scorecard.total}
          </strong>
        </li>
        <li>
          <span>Failures</span>
          <strong>{vehicle.scorecard.failed}</strong>
        </li>
        <li>
          <span>Evidence anchored</span>
          <strong>{vehicle.evidenceCoverage}%</strong>
        </li>
        <li>
          <span>Verified photo</span>
          <strong>{vehicle.photoVerified ? "Yes" : "No"}</strong>
        </li>
        <li>
          <span>Transfers</span>
          <strong>{vehicle.transfers}</strong>
        </li>
        <li>
          <span>Accidents</span>
          <strong>{vehicle.accidents}</strong>
        </li>
      </ul>

      <Link
        to={`/due-diligence/${encodeURIComponent(vehicle.vin)}`}
        className="btn btn-secondary btn-sm"
      >
        Open full report
        <Icon name="arrowRight" size={14} />
      </Link>
    </article>
  );
}

export default function DueDiligence() {
  const { vin: vinParam } = useParams();
  const navigate = useNavigate();

  const [vinInput, setVinInput] = useState(vinParam || "");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(Boolean(vinParam));
  const [error, setError] = useState(null);

  const [compareVin, setCompareVin] = useState("");
  const [comparison, setComparison] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (vin) => {
    setLoading(true);
    setError(null);
    setReport(null);
    setComparison(null);
    try {
      const data = await getDueDiligence(vin);
      setReport(data);
      setVinInput(data.vin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (vinParam) {
      load(vinParam);
    } else {
      setReport(null);
      setError(null);
    }
  }, [vinParam, load]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const vin = vinInput.trim();
    if (!vin) return;
    navigate(`/due-diligence/${encodeURIComponent(vin)}`);
  };

  const handleCompare = async (event) => {
    event.preventDefault();
    if (!report) return;
    const other = compareVin.trim();
    if (!other) {
      setCompareError("Enter a second VIN to compare");
      return;
    }

    setCompareLoading(true);
    setCompareError(null);
    setComparison(null);
    try {
      const data = await getDueDiligenceComparison(report.vin, other);
      setComparison(data);
    } catch (err) {
      setCompareError(err.message);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCompareError("Could not access the clipboard. Copy the URL manually.");
    }
  };

  const winnerVin = comparison?.comparison?.winner || null;
  const isTie = Boolean(comparison?.comparison?.tie);
  const verdictStatus = (report?.verdict?.status || "CAUTION").toLowerCase();

  return (
    <div className="page dd-page">
      {!report && (
        <>
          <section className="dd-hero">
            <span className="hero-badge">
              <Icon name="shieldCheck" size={13} />
              Pre-purchase intelligence
            </span>
            <h1>
              Know the car
              <br />
              <span className="gradient-text">before you know the price.</span>
            </h1>
            <p className="hero-lede">
              A 12-point, fully explained verdict built from on-chain history,
              ownership events, photo integrity, and the admin watchlist. No
              wallet required.
            </p>

            <form onSubmit={handleSubmit} className="hero-search dd-search">
              <span className="hero-search-icon">
                <Icon name="search" size={20} />
              </span>
              <input
                type="text"
                value={vinInput}
                onChange={(event) => setVinInput(event.target.value)}
                placeholder="Enter a VIN — e.g. PHOTOTEST1"
                aria-label="Vehicle identification number"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  "Running checks…"
                ) : (
                  <>
                    Run buyer check <Icon name="arrowRight" size={16} />
                  </>
                )}
              </button>
            </form>

            {error && <div className="error-msg">{error}</div>}

            <p className="dd-hero-note">
              <Icon name="lock" size={13} />
              Read-only. We never move funds or ask you to connect a wallet.
            </p>
          </section>

          {loading && (
            <div className="loading-panel">
              <span className="spinner" aria-hidden="true" />
              <div>
                <strong>Running 12 checks…</strong>
                <span>Reading on-chain history, ownership events and watchlist flags.</span>
              </div>
            </div>
          )}

          {!loading && (
            <section className="dd-intro">
              <div className="section-head">
                <div>
                  <span className="eyebrow">What the report checks</span>
                  <h2>Twelve questions. One verdict.</h2>
                  <p>Every result explains itself — nothing is hidden in a black-box score.</p>
                </div>
              </div>

              <div className="dd-intro-grid">
                {CHECK_GROUPS.map((group) => (
                  <article key={group.title}>
                    <span className="dd-intro-icon">
                      <Icon name={group.icon} size={19} />
                    </span>
                    <strong>{group.title}</strong>
                    <p>{group.text}</p>
                  </article>
                ))}
              </div>

              <p className="dd-intro-note">
                <Icon name="info" size={15} />
                <span>
                  The report ends with one of three verdicts:{" "}
                  <strong className="verdict-text verdict-buy">
                    Cleared to buy
                  </strong>
                  ,{" "}
                  <strong className="verdict-text verdict-caution">
                    Proceed with caution
                  </strong>
                  , or{" "}
                  <strong className="verdict-text verdict-avoid">Do not buy</strong>.
                </span>
              </p>
            </section>
          )}
        </>
      )}

      {report && (
        <>
          <PageHeader
            eyebrow="Buyer report"
            title={`${report.make} ${report.model}`}
            description={`${report.year} · VIN ${report.vin} · Generated ${formatDateTime(
              report.generatedAt
            )}`}
            meta={
              <>
                <span className={`verdict-chip verdict-${verdictStatus}`}>
                  {report.verdict.label}
                </span>
                <span className="meta-item">
                  <Icon name="wallet" size={13} />
                  {shortAddress(report.currentOwner)}
                </span>
                <span className="meta-item">
                  <Icon name="shieldCheck" size={13} />
                  {report.scorecard.passed}/{report.scorecard.total} checks passed
                </span>
              </>
            }
            actions={
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCopy}
                >
                  <Icon name={copied ? "check" : "copy"} size={16} />
                  {copied ? "Link copied" : "Share report"}
                </button>
                <a
                  href={dueDiligencePdfUrl(report.vin)}
                  className="btn btn-secondary"
                >
                  <Icon name="download" size={16} />
                  PDF
                </a>
              </>
            }
          />

          <form onSubmit={handleSubmit} className="lookup-bar dd-search">
            <Icon name="search" size={17} />
            <input
              type="text"
              value={vinInput}
              onChange={(event) => setVinInput(event.target.value)}
              placeholder="Run a check on another VIN"
              aria-label="Vehicle identification number"
            />
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              {loading ? "Checking…" : "Run check"}
            </button>
          </form>

          <section className={`dd-verdict verdict-${verdictStatus}`}>
            <div className="dd-verdict-main">
              <span className="dd-eyebrow">
                <Icon name="shieldCheck" size={14} />
                Buyer verdict
              </span>
              <h2>{report.verdict.label}</h2>
              <h3>{report.verdict.headline}</h3>
              <p>{report.verdict.summary}</p>

              {report.verdict.reasons.length > 0 && (
                <ul className="dd-reasons">
                  {report.verdict.reasons.map((reason) => (
                    <li key={reason}>
                      <Icon name="alert" size={14} />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="dd-verdict-meta">
                <span>
                  <Icon name="wallet" size={13} />
                  Owner <strong>{shortAddress(report.currentOwner)}</strong>
                </span>
                <span>
                  <Icon name="clock" size={13} />
                  Registered <strong>{formatDate(report.registeredAt)}</strong>
                </span>
                <span>
                  <Icon name="fingerprint" size={13} />
                  Checked <strong>{formatDateTime(report.generatedAt)}</strong>
                </span>
              </div>
            </div>

            <div className="dd-verdict-score">
              <div
                className="dd-score-ring"
                style={{ "--score": report.trust.score }}
                aria-label={`Trust score ${report.trust.score} out of 100`}
              >
                <div className="dd-score-ring-inner">
                  <strong>{report.trust.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <span className="trust-grade">
                Grade {report.trust.grade}
              </span>
              <span className="risk-badge">
                <span className="risk-dot" />
                {report.trust.riskLabel}
              </span>
              <span className="dd-checks-line">
                <strong>{report.scorecard.passed}</strong> pass ·{" "}
                <strong>{report.scorecard.warnings}</strong> review ·{" "}
                <strong>{report.scorecard.failed}</strong> fail
              </span>
            </div>
          </section>

          <div className="dd-actions no-print">
            <Link
              to={`/passport/${encodeURIComponent(report.vin)}`}
              className="btn btn-secondary"
            >
              <Icon name="certificate" size={16} />
              Vehicle passport
            </Link>
            <Link
              to={`/vehicle/${encodeURIComponent(report.vin)}`}
              className="btn btn-ghost"
            >
              <Icon name="history" size={16} />
              Full history
            </Link>
            <a
              href={dueDiligencePdfUrl(report.vin)}
              className="btn btn-ghost"
            >
              <Icon name="download" size={16} />
              Download report
            </a>
          </div>

          {report.alerts.length > 0 && (
            <section className="panel dd-alerts">
              <div className="panel-head">
                <div>
                  <h2>Red flags &amp; watchlist alerts</h2>
                  <span className="panel-sub">
                    Admin-signed findings that affect this verdict
                  </span>
                </div>
                <span className="panel-badge">{report.alerts.length} alerts</span>
              </div>
              <ul>
                {report.alerts.map((alert, index) => (
                  <li
                    key={`${alert.type}-${index}`}
                    className={`severity-${alert.severity}`}
                  >
                    <span className="dd-alert-severity">{alert.severity}</span>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="dd-grid">
            <section className="panel dd-checklist">
              <div className="panel-head">
                <div>
                  <h2>Due diligence checklist</h2>
                  <span className="panel-sub">
                    Each check shows its evidence and outcome
                  </span>
                </div>
                <span className="panel-badge">
                  {report.scorecard.passed}/{report.scorecard.total} passed
                </span>
              </div>
              <ul>
                {report.checks.map((entry) => {
                  const style = CHECK_STYLE[entry.status] || CHECK_STYLE.info;
                  return (
                    <li key={entry.id} className={`dd-check status-${entry.status}`}>
                      <span className="dd-check-icon">
                        <Icon name={style.icon} size={15} />
                      </span>
                      <div>
                        <div className="dd-check-head">
                          <strong>{entry.label}</strong>
                          <span className="dd-check-status">{style.label}</span>
                        </div>
                        <p>{entry.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel dd-ownership">
              <div className="panel-head">
                <div>
                  <h2>Ownership timeline</h2>
                  <span className="panel-sub">
                    Every hand-off recorded on-chain
                  </span>
                </div>
                <span className="panel-badge">
                  {report.ownership.transferCount} transfer
                  {report.ownership.transferCount === 1 ? "" : "s"}
                </span>
              </div>

              {report.ownership.entries.length === 0 ? (
                <p className="empty-note">No ownership events indexed.</p>
              ) : (
                <ol className="dd-timeline">
                  {report.ownership.entries.map((entry, index) => (
                    <li key={`${entry.kind}-${entry.at}-${index}`}>
                      <span
                        className={`dd-timeline-dot ${
                          entry.kind === "REGISTRATION" ? "registration" : ""
                        }`}
                      />
                      <div>
                        <div className="dd-timeline-head">
                          <strong>{ownershipLabel(entry.kind)}</strong>
                          <span>{formatDate(entry.at)}</span>
                        </div>
                        <p>
                          {entry.kind === "TRANSFER" && entry.from
                            ? `${shortAddress(entry.from)} → ${shortAddress(entry.to)}`
                            : entry.to
                              ? `Owner ${shortAddress(entry.to)}`
                              : entry.note}
                        </p>
                        {entry.txHash && (
                          <span className="mono-line" title={entry.txHash}>
                            tx {entry.txHash.slice(0, 16)}…
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <div className="dd-ownership-current">
                <span>
                  <Icon name="wallet" size={13} />
                  Current owner
                </span>
                <strong title={report.currentOwner}>
                  {shortAddress(report.currentOwner)}
                </strong>
              </div>
            </section>
          </div>

          <section className="panel dd-compare no-print">
            <div className="panel-head">
              <div>
                <h2>Compare two vehicles</h2>
                <span className="panel-sub">
                  Side-by-side trust comparison against {report.vin}
                </span>
              </div>
            </div>

            <form onSubmit={handleCompare} className="dd-compare-form">
              <input
                type="text"
                value={compareVin}
                onChange={(event) => setCompareVin(event.target.value)}
                placeholder="Second VIN"
                aria-label="Second VIN to compare"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={compareLoading}
              >
                {compareLoading ? "Comparing…" : "Compare"}
              </button>
            </form>

            {compareError && <div className="error-msg">{compareError}</div>}

            {comparison && (
              <>
                <p className="dd-compare-result">
                  <Icon name="sparkle" size={15} />
                  {isTie
                    ? "Both vehicles score evenly on the checklist. Compare the specific failures before deciding."
                    : `Better buy: ${winnerVin} — it has the stronger verdict, trust score, or fewer failed checks.`}
                </p>
                <div className="dd-compare-grid">
                  <ComparisonCard
                    vehicle={comparison.vehicles[0]}
                    isWinner={!isTie && winnerVin === comparison.vehicles[0].vin}
                  />
                  <ComparisonCard
                    vehicle={comparison.vehicles[1]}
                    isWinner={!isTie && winnerVin === comparison.vehicles[1].vin}
                  />
                </div>
              </>
            )}
          </section>

          <div className="dd-footer">
            <span className="dd-footer-label">
              <Icon name="fingerprint" size={14} />
              Report SHA-256
            </span>
            <code>{report.reportHash}</code>
            <Link to={`/passport/${encodeURIComponent(report.vin)}`}>
              Verify with the vehicle passport
              <Icon name="arrowRight" size={13} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
