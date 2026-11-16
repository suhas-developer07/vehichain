import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { uploadVehiclePhoto } from "../api/client.js";
import {
  buildVehiclePhotoMessage,
  sha256File,
} from "../utils/vehiclePhoto.js";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function RegisterVehicle({ contract, account, signer }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vin: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoMeta, setPhotoMeta] = useState(null);
  // null | confirming | pending | signing-photo | uploading-photo | confirmed | photo-failed | failed
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [registeredOnChain, setRegisteredOnChain] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setErrorMsg(null);

    if (!file) {
      setPhoto(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhoto(null);
      setErrorMsg("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhoto(null);
      setErrorMsg("Vehicle photo must be 5 MB or smaller.");
      return;
    }

    setPhoto(file);
    setPhotoMeta(null);
  };

  const uploadPhoto = async (vin) => {
    if (!signer) {
      throw new Error(
        "Wallet signer is unavailable. Reconnect MetaMask and try again."
      );
    }

    const fileHash = await sha256File(photo);
    const timestamp = Date.now();
    // One wallet signature proves the uploader is the on-chain owner and binds
    // the authorization to this exact image.
    setStatus("signing-photo");
    const signature = await signer.signMessage(
      buildVehiclePhotoMessage(vin, fileHash, timestamp)
    );

    setStatus("uploading-photo");
    return uploadVehiclePhoto(vin, photo, signature, timestamp, fileHash);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }
    if (!photo) {
      setErrorMsg("Please choose a vehicle photo before registering.");
      return;
    }

    setStatus("confirming");
    setErrorMsg(null);
    setPhotoMeta(null);

    let registered = false;

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
      registered = true;
      setRegisteredOnChain(true);
      setTxHash(receipt.hash);

      // Registration is on-chain. The photo is stored off-chain and tied to
      // the vehicle using an owner-signed authorization message.
      setStatus("signing-photo");
      const meta = await uploadPhoto(form.vin);
      setPhotoMeta(meta);
      setStatus("confirmed");

      setTimeout(() => {
        navigate(`/vehicle/${encodeURIComponent(form.vin)}`);
      }, 2000);
    } catch (err) {
      const reason = err.reason || err.message || "Transaction failed";

      if (registered) {
        setStatus("photo-failed");
        setErrorMsg(
          `Vehicle was registered on-chain, but the photo upload failed: ${reason}`
        );
      } else {
        setStatus("failed");
        setErrorMsg(reason);
      }
    }
  };

  const handleRetryPhoto = async () => {
    setErrorMsg(null);
    setStatus("signing-photo");

    try {
      const meta = await uploadPhoto(form.vin);
      setPhotoMeta(meta);
      setStatus("confirmed");
      setTimeout(() => {
        navigate(`/vehicle/${encodeURIComponent(form.vin)}`);
      }, 2000);
    } catch (err) {
      setStatus("photo-failed");
      setErrorMsg(err.reason || err.message || "Photo upload failed");
    }
  };

  if (!account) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Operate · New asset"
          title="Register a vehicle"
          description="Create the on-chain identity for a vehicle and attach an owner-signed photo."
        />
        <div className="state-panel">
          <span className="state-icon">
            <Icon name="wallet" size={22} />
          </span>
          <h2>Connect your wallet to continue</h2>
          <p>
            Registration writes to the blockchain and makes you the first owner.
            Connect MetaMask from the top bar to get started.
          </p>
        </div>
      </div>
    );
  }

  const vehicleUrl = `/vehicle/${encodeURIComponent(form.vin)}`;
  const isBusy =
    status === "confirming" ||
    status === "pending" ||
    status === "signing-photo" ||
    status === "uploading-photo";

  const statusTone =
    status === "confirmed"
      ? "confirmed"
      : status === "failed" || status === "photo-failed"
        ? "failed"
        : "pending";

  return (
    <div className="page register-page">
      <PageHeader
        eyebrow="Operate · New asset"
        title="Register a vehicle"
        description="Create the on-chain identity for a vehicle and attach its owner-signed photo. You become the initial owner."
        meta={
          <span className="meta-item">
            <Icon name="lock" size={13} />
            Irreversible on-chain write
          </span>
        }
      />

      <div className="form-layout">
        <form onSubmit={handleSubmit} className="form form-card">
          <section className="form-section">
            <div className="form-section-head">
              <span className="step-badge">01</span>
              <div>
                <h2>Vehicle identity</h2>
                <p>These values are written to the contract and cannot be edited later.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group form-group-full">
                <label htmlFor="reg-vin">VIN *</label>
                <input
                  id="reg-vin"
                  type="text"
                  name="vin"
                  value={form.vin}
                  onChange={handleChange}
                  placeholder="Vehicle Identification Number"
                  autoComplete="off"
                  required
                />
                <p className="field-hint">
                  Use the exact VIN printed on the vehicle. Duplicate VINs are
                  rejected by the contract.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="reg-make">Make *</label>
                <input
                  id="reg-make"
                  type="text"
                  name="make"
                  value={form.make}
                  onChange={handleChange}
                  placeholder="e.g. Toyota"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-model">Model *</label>
                <input
                  id="reg-model"
                  type="text"
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                  placeholder="e.g. Camry"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-year">Year *</label>
                <input
                  id="reg-year"
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <span className="step-badge">02</span>
              <div>
                <h2>Vehicle photo</h2>
                <p>A signed fingerprint binds the image to this VIN.</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="vehicle-photo">Photo *</label>
              <label
                className={`photo-drop ${preview ? "has-preview" : ""}`}
                htmlFor="vehicle-photo"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Selected vehicle"
                    className="photo-preview"
                  />
                ) : (
                  <>
                    <span className="photo-drop-icon">
                      <Icon name="photo" size={24} />
                    </span>
                    <strong>Drop a photo here or browse</strong>
                    <span>JPEG, PNG, WebP, or GIF · up to 5 MB</span>
                  </>
                )}
                <input
                  id="vehicle-photo"
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  className="native-file"
                  required
                />
              </label>

              {preview && (
                <div className="photo-preview-meta">
                  <strong>{photo?.name}</strong>
                  <span>{formatBytes(photo?.size)}</span>
                  <label htmlFor="vehicle-photo" className="btn btn-ghost btn-sm">
                    Replace image
                  </label>
                </div>
              )}

              <p className="field-hint">
                Stored in the project&apos;s <code>uploads/vehicles</code> folder
                and linked to the VIN.
              </p>
            </div>
          </section>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isBusy || registeredOnChain}
            >
              {registeredOnChain && !isBusy && "Vehicle Registered ✓"}
              {status === "confirming" && "Confirm in MetaMask…"}
              {status === "pending" && "Registering on-chain…"}
              {status === "signing-photo" && "Sign photo upload…"}
              {status === "uploading-photo" && "Uploading photo…"}
              {!registeredOnChain &&
                (!status ||
                  status === "failed" ||
                  status === "photo-failed" ||
                  status === "confirmed") &&
                "Register vehicle"}
            </button>
            <span className="form-actions-note">
              <Icon name="lock" size={13} />
              Writes to the blockchain
            </span>
          </div>
        </form>

        <aside className="form-aside">
          <section className="side-card">
            <span className="eyebrow">Signing flow</span>
            <h3>What happens next</h3>
            <ol className="side-steps">
              <li>
                <span>1</span>
                <div>
                  <strong>Confirm registration</strong>
                  <p>MetaMask asks you to approve the registration transaction.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Wait for the block</strong>
                  <p>The vehicle identity is written on-chain.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Authorize the photo</strong>
                  <p>Sign a gas-free message to bind the image to the VIN.</p>
                </div>
              </li>
            </ol>
          </section>

          <section className="side-card side-card-quiet">
            <span className="eyebrow">Before you start</span>
            <ul className="side-list">
              <li>
                <Icon name="check" size={14} />
                MetaMask connected to chain 1337
              </li>
              <li>
                <Icon name="check" size={14} />
                A clear, front-facing vehicle photo
              </li>
              <li>
                <Icon name="check" size={14} />
                The exact VIN from the vehicle
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {txHash && (
        <div className={`status-msg ${statusTone}`}>
          <span className="status-msg-icon">
            {statusTone === "confirmed" ? (
              <Icon name="check" size={17} />
            ) : statusTone === "failed" ? (
              <Icon name="alert" size={17} />
            ) : (
              <span className="spinner" aria-hidden="true" />
            )}
          </span>
          <div>
            <strong>Registration status</strong>
            <p>
              {status === "pending" && "Registration is pending confirmation."}
              {status === "signing-photo" &&
                "On-chain registration confirmed. Waiting for photo authorization signature…"}
              {status === "uploading-photo" && "Uploading vehicle photo…"}
              {status === "confirmed" &&
                "Vehicle registered with photo. Redirecting to the dossier…"}
              {status === "photo-failed" &&
                "Vehicle registered, but the photo was not saved."}
              {status === "failed" && `Failed: ${errorMsg}`}
            </p>
            <span className="status-tx mono-line">tx {txHash.slice(0, 20)}…</span>
          </div>
        </div>
      )}

      {photoMeta && (
        <div className="success-msg">
          <span className="status-msg-icon">
            <Icon name="photo" size={17} />
          </span>
          <div>
            <strong>Photo stored successfully</strong>
            <p className="mono-line" title={photoMeta.photoHash}>
              SHA-256: {photoMeta.photoHash}
            </p>
            <img
              src={photoMeta.photoUrl}
              alt={`${form.vin} vehicle`}
              className="photo-preview"
            />
          </div>
        </div>
      )}

      {status === "photo-failed" && (
        <div className="photo-retry-box">
          <p>{errorMsg}</p>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetryPhoto}
              disabled={isBusy}
            >
              Retry photo upload
            </button>
            <Link to={vehicleUrl} className="btn btn-secondary">
              Continue to vehicle
            </Link>
          </div>
        </div>
      )}

      {status === "failed" && errorMsg && !txHash && (
        <div className="error-msg">{errorMsg}</div>
      )}

      {!txHash && errorMsg && status !== "failed" && (
        <div className="error-msg">{errorMsg}</div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
