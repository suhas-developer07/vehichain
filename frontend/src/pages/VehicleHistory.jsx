import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getVehicle, uploadVehiclePhoto } from "../api/client.js";
import {
  buildVehiclePhotoMessage,
  sha256File,
} from "../utils/vehiclePhoto.js";
import RecordCard from "../components/RecordCard.jsx";
import TrustScoreCard from "../components/TrustScoreCard.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function shortAddress(address) {
  if (!address) return "Unknown";
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function formatDate(value) {
  if (!value) return "Not indexed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not indexed";
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

function statusTone(status) {
  const value = (status || "NORMAL").toLowerCase();
  if (value.includes("suspicious") || value.includes("flag")) return "danger";
  if (value.includes("verified")) return "success";
  return "neutral";
}

export default function VehicleHistory({ account, signer }) {
  const { vin: vinParam } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [vin, setVin] = useState("");
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [photoSuccess, setPhotoSuccess] = useState(null);

  const loadVehicle = useCallback(async (lookupVin) => {
    const trimmed = lookupVin.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setPhotoError(null);
    setPhotoSuccess(null);
    setVehicle(null);

    try {
      const data = await getVehicle(trimmed);
      setVehicle(data);
      setVin(data.vin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Deep links (/vehicle/:vin) and the redirect after registration load
  // automatically instead of requiring a second search.
  useEffect(() => {
    if (vinParam) {
      setVin(vinParam);
      loadVehicle(vinParam);
    }
  }, [vinParam, loadVehicle]);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = vin.trim();
    if (!trimmed) return;

    if (trimmed === vinParam) {
      loadVehicle(trimmed);
      return;
    }
    navigate(`/vehicle/${encodeURIComponent(trimmed)}`);
  };

  const isOwner =
    !!account &&
    !!vehicle &&
    account.toLowerCase() === vehicle.currentOwner?.toLowerCase();

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    setPhotoSuccess(null);

    if (!file) {
      setPhotoFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoFile(null);
      setPhotoError("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoFile(null);
      setPhotoError("Vehicle photo must be 5 MB or smaller.");
      return;
    }

    setPhotoFile(file);
  };

  const handlePhotoUpload = async () => {
    if (!vehicle || !photoFile) return;
    if (!signer) {
      setPhotoError("Reconnect MetaMask to sign the photo upload.");
      return;
    }

    setPhotoUploading(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    try {
      const fileHash = await sha256File(photoFile);
      const timestamp = Date.now();
      const signature = await signer.signMessage(
        buildVehiclePhotoMessage(vehicle.vin, fileHash, timestamp)
      );
      const meta = await uploadVehiclePhoto(
        vehicle.vin,
        photoFile,
        signature,
        timestamp,
        fileHash
      );

      setVehicle((prev) => ({
        ...prev,
        photoUrl: meta.photoUrl,
        photoHash: meta.photoHash,
        photoUploadedAt: meta.photoUploadedAt,
      }));
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPhotoSuccess("Vehicle photo saved and bound to the VIN.");
    } catch (err) {
      setPhotoError(err.reason || err.message || "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const status = (vehicle?.status || "NORMAL").toUpperCase();

  return (
    <div className="page lookup-page">
      {!vehicle && !loading && (
        <section className="home-hero">
          <div className="hero-orbit" aria-hidden="true" />
          <span className="hero-badge">
            <Icon name="sparkle" size={13} />
            Trust, made tangible
          </span>
          <h1>
            Every vehicle has a history.
            <br />
            <span className="gradient-text">Read it before you buy.</span>
          </h1>
          <p className="hero-lede">
            Vellum turns ownership, service, and incident records into one
            verifiable dossier — anchored on-chain and readable in seconds.
          </p>

          <form onSubmit={handleSearch} className="hero-search">
            <span className="hero-search-icon">
              <Icon name="search" size={20} />
            </span>
            <input
              id="hero-vin"
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Enter a VIN — e.g. PHOTOTEST1"
              aria-label="Vehicle identification number"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                "Searching…"
              ) : (
                <>
                  Look up vehicle <Icon name="arrowRight" size={16} />
                </>
              )}
            </button>
          </form>

          <div className="hero-samples">
            <span>Try a sample</span>
            <button
              type="button"
              onClick={() => navigate("/vehicle/PHOTOTEST1")}
            >
              <Icon name="car" size={13} />
              PHOTOTEST1
            </button>
            <Link to="/dashboard">
              Open the registry dashboard <Icon name="arrowRight" size={13} />
            </Link>
          </div>

          <div className="hero-proof">
            <article>
              <span className="proof-icon">
                <Icon name="shieldCheck" size={18} />
              </span>
              <div>
                <strong>Tamper-evident</strong>
                <span>Every event is written on-chain and cannot be rewritten.</span>
              </div>
            </article>
            <article>
              <span className="proof-icon">
                <Icon name="photo" size={18} />
              </span>
              <div>
                <strong>Owner-signed photos</strong>
                <span>Images are fingerprinted and bound to the VIN.</span>
              </div>
            </article>
            <article>
              <span className="proof-icon">
                <Icon name="gauge" size={18} />
              </span>
              <div>
                <strong>Buyer-ready reports</strong>
                <span>One verdict, twelve checks, zero guesswork.</span>
              </div>
            </article>
          </div>
        </section>
      )}

      {loading && !vehicle && (
        <div className="loading-panel">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Reading the chain…</strong>
            <span>Fetching identity, history and trust signals for {vin}.</span>
          </div>
        </div>
      )}

      {error && !vehicle && (
        <section className="state-panel state-panel-error">
          <span className="state-icon">
            <Icon name="alert" size={22} />
          </span>
          <h2>We couldn&apos;t open that dossier</h2>
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setError(null);
              document.getElementById("hero-vin")?.focus();
            }}
          >
            Try another VIN
          </button>
        </section>
      )}

      {vehicle && (
        <>
          <PageHeader
            eyebrow="Vehicle dossier"
            title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            description={`A complete, tamper-evident history for VIN ${vehicle.vin}.`}
            meta={
              <>
                <span className={`status-pill tone-${statusTone(status)}`}>
                  <span className="status-dot" />
                  {status}
                </span>
                {vehicle.registeredAt && (
                  <span className="meta-item">
                    <Icon name="clock" size={13} />
                    Indexed {formatDate(vehicle.registeredAt)}
                  </span>
                )}
                <span className="meta-item">
                  <Icon name="layers" size={13} />
                  {vehicle.history.length} history records
                </span>
              </>
            }
            actions={
              <>
                <Link
                  to={`/due-diligence/${encodeURIComponent(vehicle.vin)}`}
                  className="btn btn-primary"
                >
                  <Icon name="shieldCheck" size={16} />
                  Buyer check
                </Link>
                <Link
                  to={`/passport/${encodeURIComponent(vehicle.vin)}`}
                  className="btn btn-secondary"
                >
                  <Icon name="certificate" size={16} />
                  Passport
                </Link>
              </>
            }
          />

          <form onSubmit={handleSearch} className="lookup-bar">
            <Icon name="search" size={17} />
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Look up another VIN"
              aria-label="Look up another VIN"
            />
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              {loading ? "Searching…" : "Look up"}
            </button>
          </form>

          {error && <div className="error-msg">{error}</div>}

          <section className="vehicle-hero">
            <div
              className={`vehicle-media ${
                vehicle.photoUrl ? "" : "is-placeholder"
              }`}
            >
              {vehicle.photoUrl ? (
                <img
                  src={vehicle.photoUrl}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="vehicle-photo"
                />
              ) : (
                <div className="vehicle-photo-placeholder">
                  <span className="placeholder-ring">
                    <Icon name="car" size={40} />
                  </span>
                  <p>No verified photo yet</p>
                </div>
              )}

              <span className="vehicle-media-badge">
                <Icon
                  name={vehicle.photoHash ? "shieldCheck" : "photo"}
                  size={14}
                />
                {vehicle.photoHash
                  ? "Photo fingerprint on file"
                  : "Awaiting owner photo"}
              </span>

              {vehicle.photoHash && (
                <div className="vehicle-media-hash">
                  <span>SHA-256</span>
                  <code title={vehicle.photoHash}>
                    {vehicle.photoHash.slice(0, 20)}…
                  </code>
                </div>
              )}
            </div>

            <div className="vehicle-identity">
              <div className="identity-head">
                <span className="eyebrow">On-chain identity</span>
                <span className="vin-chip">
                  <Icon name="fingerprint" size={14} />
                  <code>{vehicle.vin}</code>
                </span>
              </div>

              <div className="identity-facts">
                <div className="fact">
                  <span>Make</span>
                  <strong>{vehicle.make}</strong>
                </div>
                <div className="fact">
                  <span>Model</span>
                  <strong>{vehicle.model}</strong>
                </div>
                <div className="fact">
                  <span>Model year</span>
                  <strong>{vehicle.year}</strong>
                </div>
                <div className="fact">
                  <span>Records</span>
                  <strong>{vehicle.recordCount}</strong>
                </div>
                <div className="fact">
                  <span>Registry status</span>
                  <strong className={`status-text tone-${statusTone(status)}`}>
                    {status}
                  </strong>
                </div>
                <div className="fact">
                  <span>Indexed</span>
                  <strong>{formatDate(vehicle.registeredAt)}</strong>
                </div>
              </div>

              <div className="owner-card">
                <span className="owner-avatar">
                  <Icon name="wallet" size={17} />
                </span>
                <div className="owner-copy">
                  <span>Current owner</span>
                  <strong title={vehicle.currentOwner}>
                    {shortAddress(vehicle.currentOwner)}
                  </strong>
                </div>
                {isOwner && <span className="owner-you">You</span>}
              </div>
            </div>
          </section>

          <TrustScoreCard trust={vehicle.trust} vin={vehicle.vin} />

          {isOwner && (
            <section className="upload-panel">
              <div className="upload-copy">
                <span className="eyebrow">Owner control</span>
                <h2>
                  {vehicle.photoUrl
                    ? "Replace the vehicle photo"
                    : "Add a verified vehicle photo"}
                </h2>
                <p>
                  You are the current owner. MetaMask will ask you to sign an
                  authorization message that binds this exact image to the VIN —
                  no gas fee.
                </p>
                {vehicle.photoUploadedAt && (
                  <span className="meta-item">
                    <Icon name="clock" size={13} />
                    Last updated {formatDateTime(vehicle.photoUploadedAt)}
                  </span>
                )}
              </div>

              <div className="upload-controls">
                <input
                  ref={fileInputRef}
                  id="owner-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  className="native-file"
                />
                <label htmlFor="owner-photo" className="file-picker-btn">
                  <Icon name="photo" size={16} />
                  Choose image
                </label>
                <span className="file-name">
                  {photoFile ? photoFile.name : "No file selected · max 5 MB"}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handlePhotoUpload}
                  disabled={!photoFile || photoUploading}
                >
                  {photoUploading ? "Uploading…" : "Upload photo"}
                </button>
              </div>

              {photoError && <div className="error-msg">{photoError}</div>}
              {photoSuccess && (
                <div className="success-msg">{photoSuccess}</div>
              )}
            </section>
          )}

          <section className="history-section">
            <div className="section-head">
              <div>
                <span className="eyebrow">Evidence trail</span>
                <h2>Vehicle history</h2>
                <p>Every entry is written on-chain and cannot be rewritten.</p>
              </div>
              <span className="count-pill">
                <Icon name="layers" size={14} />
                {vehicle.history.length} records
              </span>
            </div>

            {vehicle.history.length === 0 ? (
              <div className="empty-state">
                <span className="state-icon">
                  <Icon name="history" size={22} />
                </span>
                <h3>No records yet</h3>
                <p>
                  This vehicle is registered, but no service, incident, or
                  inspection events have been written.
                </p>
              </div>
            ) : (
              <div className="records-list">
                {vehicle.history.map((record, idx) => (
                  <RecordCard key={idx} record={record} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
