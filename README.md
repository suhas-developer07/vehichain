# Blockchain-Enabled Vehicle Data Integrity System

A decentralized application (dApp) where vehicles are registered on-chain by VIN, and authorized stakeholders append immutable records (service history, accident reports, insurance claims, ownership transfers) to that vehicle's history.

> **Vellum** is the frontend experience: a premium vehicle-trust console with an editorial
> dossier, 12-check buyer reports, certificate-grade passports, a live registry dashboard,
> and dark/light themes. See `UI_REDESIGN.md` for the design system and screen treatments.

## Tech Stack

| Layer | Choice |
|---|---|
| Local blockchain | Ganache (port 7545, chainId 1337) |
| Smart contract language | Solidity ^0.8.24 |
| Contract dev framework | Hardhat |
| Contract client library | ethers.js v6 |
| Backend | Node.js + Express |
| Off-chain database | MongoDB via Mongoose |
| Frontend | React + Vite + ethers.js v6 + MetaMask |

## Frontend experience (Vellum)

- **Design language:** "Trust, made tangible" — obsidian surfaces, mint/indigo signal
  accents, Space Grotesk display type, Inter body, JetBrains Mono evidence.
- **Shell:** persistent 272 px navigation rail, breadcrumb top bar, quick VIN lookup, live
  chain pill, wallet identity, and an overlay drawer on mobile.
- **Themes:** dark by default and a warm porcelain light theme, persisted in
  `localStorage` with an inline boot script to prevent a flash of the wrong theme.
- **Screens:** editorial lookup/dossier, registry dashboard, buyer due-diligence verdict
  report, certificate-grade vehicle passport, operator forms, and admin console.
- **Design system:** token-driven CSS in `frontend/src/styles/` imported from `App.css`,
  with shared `Icon`, `PageHeader`, `TrustScoreCard`, and `RecordCard` components.

## Project Structure

```
├── contracts/VehicleRegistry.sol    # Solidity smart contract
├── scripts/deploy.js                # Deployment script
├── test/VehicleRegistry.test.js     # Contract tests
├── hardhat.config.js                # Hardhat configuration
├── uploads/                         # Uploaded vehicle photos (gitignored)
│   └── vehicles/                    # One image per vehicle, named by VIN
├── backend/                         # Express API server
│   ├── server.js                    # Entry point + static /uploads serving
│   ├── config/                      # DB, contract, env, filesystem paths
│   ├── models/                      # Mongoose schemas (vehicle, records, watchlist)
│   ├── listeners/                   # Event listener (chain → Mongo)
│   ├── routes/                      # API routes
│   ├── controllers/                 # Route handlers (vehicle, record, photo, analytics, due diligence, watchlist)
│   ├── services/                    # Trust scoring, passport + due-diligence verdict/PDF generation
│   ├── middleware/                   # Error handling + multer upload
│   └── utils/                       # Record types + signed photo/watchlist message helpers
└── frontend/                        # React app (Vite)
    └── src/
        ├── contract/                # ABI + config
        ├── hooks/useWallet.js       # MetaMask connection
        ├── api/client.js            # Backend API client
        ├── utils/vehiclePhoto.js    # Shared photo-signing message
        ├── utils/watchlist.js       # Shared admin watchlist signing message
        ├── pages/                   # 8 pages (history, dashboard, passport, due diligence, writes)
        └── components/              # Reusable UI (TrustScoreCard, WatchlistPanel)
```

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- MetaMask browser extension
- MongoDB Atlas connection (provided in .env)

### 1. Install Dependencies

```bash
# Root (Hardhat + contract deps)
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configure Environment

The `.env` file is pre-configured with:
- Ganache RPC URL
- Deployer private key (deterministic Ganache account)
- MongoDB Atlas connection string
- Backend port

### 3. Start Ganache

```bash
npx ganache --port 7545 --chain.chainId 1337 --wallet.deterministic
```

### 4. Compile & Test Contracts

```bash
npx hardhat compile
npx hardhat test
```

### 5. Deploy Contract

```bash
npx hardhat run scripts/deploy.js --network ganache
```

```bash
npx hardhat compile
npx ganache --port 7545 --chain.chainId 1337 --wallet.deterministic
npx hardhat run scripts/deploy.js --network ganache
```

This automatically:
- Deploys VehicleRegistry to Ganache
- Updates `.env` with CONTRACT_ADDRESS
- Copies ABI to frontend and backend

### 6. Start Backend

```bash
cd backend && node server.js
```

Backend runs on port 4000 and connects to both Ganache and MongoDB.

### 7. Start Frontend

```bash
cd frontend && npm run dev
```

Frontend runs on port 5173 and proxies API requests to the backend.

### 8. Configure MetaMask

1. Add Ganache network:
   - Network Name: Ganache
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. Import a Ganache account using its private key

## Demo Walkthrough

### Step 1: Register a Vehicle (Account A)

1. Open the app at http://localhost:5173
2. Connect MetaMask with Account A (the deployer)
3. Go to "Register" page
4. Fill in: VIN=VIN1001, Make=Toyota, Model=Camry, Year=2023
5. Click "Register Vehicle" and confirm in MetaMask
6. Wait for confirmation → redirected to vehicle history

### Step 2: Assign Roles via Admin (Account A)

1. Go to "Admin" page (Account A is the admin)
2. Enter Account B's address and select "SERVICE_CENTER"
3. Click "Assign Role" and confirm in MetaMask

### Step 3: Add Service Record (Account B)

1. Switch MetaMask to Account B
2. Go to "Add Record" page
3. Fill in: VIN=VIN1001, Type=SERVICE, Description="Regular oil change"
4. Click "Add Record" and confirm in MetaMask

### Step 4: Transfer Ownership (Account A → Account C)

1. Switch MetaMask to Account A
2. Go to "Transfer" page
3. Enter VIN=VIN1001, click "Check" to verify ownership
4. Enter Account C's address as new owner
5. Click "Transfer Ownership" and confirm in MetaMask

### Step 5: Verify History (Account D - No Role)

1. Switch MetaMask to Account D (or disconnect wallet)
2. Go to "History" page
3. Enter VIN=VIN1001
4. View the complete vehicle history:
   - Registration by Account A
   - Service record by Account B
   - Ownership transfer from A to C

### Step 6: Review Trust & Fraud Radar

1. On the vehicle lookup page, review the **Trust Score** gauge, grade, and risk level
2. Open **How this score was calculated** to see every positive and negative factor
3. Review the **Fraud Radar** flags for gaps such as accidents without follow-up inspections

### Step 7: Share the Public Passport

1. Click **Public passport** on the vehicle page (no wallet required)
2. Scan the QR code or use **Download PDF** / **Print passport**
3. Open **Dashboard** in the navbar to see live registry KPIs, trust distribution, and activity

### Step 8: Run a Buyer Due-Diligence Check

1. Click **Buyer Check** in the navbar (or open `/due-diligence`)
2. Enter a VIN and run the check — the report returns a **Cleared to buy / Proceed with caution / Do not buy** verdict, a 12-point checklist, red-flag alerts, and an ownership timeline
3. Use **Copy share link**, **Download report PDF**, or compare a second VIN side by side
4. Connect the admin wallet on the **Admin** page to add or resolve watchlist entries; an active high/critical match flips the verdict to **Do not buy**

## API Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/vehicles/:vin` | Full vehicle detail + live history + photo + trust score (from chain + Mongo metadata) |
| GET | `/api/vehicles` | List/search vehicles (query: make, model, owner, status) |
| GET | `/api/vehicles/:vin/records` | Record list for a VIN (from Mongo) |
| GET | `/api/vehicles/:vin/trust` | Explainable Trust Score + Fraud Radar |
| GET | `/api/vehicles/:vin/passport` | Public passport JSON + QR code |
| GET | `/api/vehicles/:vin/passport.pdf` | Downloadable/printable passport PDF |
| POST | `/api/vehicles/:vin/photo` | Upload or replace a vehicle photo (owner-signed) |
| GET | `/uploads/vehicles/:file` | Serve a stored vehicle photo |
| GET | `/api/records/recent` | Recent records (query: limit, default 20) |
| GET | `/api/analytics/summary` | Registry KPIs, trust distribution, 14-day activity |
| GET | `/api/analytics/activity` | Live feed of registrations, records, and photos |
| GET | `/api/due-diligence/:vin` | Buyer due-diligence report: verdict, 12 checks, alerts, ownership timeline |
| GET | `/api/due-diligence/:vin/report.pdf` | Downloadable/printable due-diligence report PDF |
| GET | `/api/due-diligence/compare?vins=VIN1,VIN2` | Side-by-side trust comparison + recommended winner |
| GET | `/api/watchlist` | Read active watchlist entries (query: includeResolved, vin, owner) |
| POST | `/api/watchlist` | Add a watchlist entry (contract-admin wallet signature required) |
| POST | `/api/watchlist/:id/resolve` | Resolve/deactivate an entry (contract-admin wallet signature required) |
| GET | `/api/health` | Health check (chain + DB status) |

### Vehicle Photos

Vehicle photos are stored off-chain in `uploads/vehicles/` at the project root and served at `/uploads/vehicles/<file>`.

- **Registration:** the Register page requires a photo (JPEG, PNG, WebP, or GIF, max 5 MB). After the on-chain registration transaction confirms, the frontend signs a short-lived authorization message with the owner wallet and uploads the image.
- **Authorization:** the backend reads the current owner directly from the smart contract and verifies the wallet signature, so only the vehicle owner can upload or replace the photo.
- **Integrity:** the signature covers the image's SHA-256 hash, the backend re-computes the hash from the received bytes, and stores it in MongoDB alongside the file URL and upload metadata. The image is also checked for a valid image signature, not just the browser-supplied MIME type.
- **Retrieval:** `GET /api/vehicles/:vin` returns `photoUrl`, `photoHash`, `photoUploadedAt`, and `photoUploadedBy` alongside the on-chain vehicle data. The History page displays the image and hash.
- **Replacement:** current owners can upload a new photo from the Vehicle History page; the previous file is deleted after the new one is safely persisted.

### Trust Score & Fraud Radar

Every vehicle detail response includes an explainable `trust` object. The score is computed from the live on-chain history plus photo/status metadata, so it updates automatically as new records are added.

- **Score range:** 0–100 with grades A+ through E and risk levels LOW / MEDIUM / HIGH / CRITICAL.
- **Positive signals:** history depth, evidence anchoring (data hashes), service/inspection/insurance records, verified photo, recent activity, established registration.
- **Risk penalties:** accident disclosures, missing post-accident inspection, ownership churn/rapid flipping, duplicate records, stale history, weak evidence, missing photo, suspicious status.
- **Transparency:** the API returns every score factor and every fraud flag with a severity and explanation, and the UI shows them in a collapsible breakdown.
- **Caching:** lookup triggers a best-effort write of `trustScore`, `trustGrade`, and `riskLevel` onto `VehicleIndex` so the dashboard can aggregate ratings quickly. The chain remains the source of truth.

### Public Vehicle Passport (QR + PDF)

- `GET /api/vehicles/:vin/passport` returns the complete public passport: vehicle identity, photo URL/hash, history, trust score, fraud flags, a stable document SHA-256, and a QR code data URL.
- `GET /api/vehicles/:vin/passport.pdf` generates a print-ready A4 PDF with the photo, trust gauge, fraud radar, full history table, QR code, and document fingerprint. Long histories paginate automatically.
- The React page at `/passport/:vin` renders the same document for sharing and printing. It works without a wallet.
- The QR code points at `${PUBLIC_APP_URL}/passport/:vin` (defaults to `http://localhost:5173`). Set `PUBLIC_APP_URL` in the root `.env` when deploying so shared QR codes resolve to the public site.

### Live Registry Dashboard

The `/dashboard` page polls every 8 seconds and shows:

- totals for vehicles, records, verified photos, owners, and suspicious vehicles;
- average trust score and trust-risk distribution;
- 14-day activity bar chart;
- records by type and top vehicle makes;
- a live feed merging registrations, record writes, and photo updates;
- recently indexed vehicles with risk badges.

Backend endpoints are `GET /api/analytics/summary` and `GET /api/analytics/activity?limit=24`.

### Buyer Due Diligence & Watchlist

The `/due-diligence` page turns the live chain history into a pre-purchase decision. It works without a wallet and is designed to be shared with a buyer.

- **Verdict:** rule-based over 12 explicit checks (registration, ownership trail, accidents, service, inspection, insurance, evidence anchoring, photo integrity, record freshness, duplicates, registry status, watchlist). Each check returns `pass`, `warn`, or `fail` with a plain-language explanation.
- **Outcome:** **Cleared to buy** (BUY), **Proceed with caution** (CAUTION), or **Do not buy** (AVOID). Blocking signals include a suspicious registry status, critical/high watchlist match, critical trust risk, three or more failed checks, or a critical failed check.
- **Ownership timeline:** built from the chain's `VehicleRegistered` and `OwnershipTransferred` events, including from → to addresses and transaction hashes. If events are unavailable, the report falls back to `OWNERSHIP_TRANSFER` history records.
- **Red flags:** high/critical fraud-radar flags and watchlist matches are surfaced as severity-ranked alerts.
- **Comparison:** `GET /api/due-diligence/compare?vins=VIN1,VIN2` returns both vehicles side by side and a winner chosen by verdict rank, then trust score, then fewer failed checks. A tie returns `winner: null`.
- **Report identity:** a stable report SHA-256 is computed from the canonical VIN, verdict, check statuses, watchlist matches, trust score, and ownership entries.
- **Share link:** `${PUBLIC_APP_URL}/due-diligence/:vin` (defaults to `http://localhost:5173`).

Watchlist entries live in MongoDB but can only be written with an EIP-191 signature from the contract admin wallet. A VIN and/or owner address can be flagged with a reason and severity; entries can later be resolved. Reads are public and feed directly into the due-diligence verdict.

### Optional Environment Variable

| Variable | Description | Default |
|---|---|---|
| `PUBLIC_APP_URL` | Public frontend origin used inside passport QR codes, due-diligence share links, and PDF footers | `http://localhost:5173` |

## Architecture Notes

- **Blockchain is the source of truth.** MongoDB is a read-optimized cache built from contract events.
- **Writes are signed by the user's wallet**, never by the backend.
- **The event listener** keeps MongoDB in sync with on-chain events for fast queries.
- **Public verification** is a core feature — anyone can look up a vehicle's full history without a wallet.

## Future Scope

- IPFS document storage for service invoices and accident photos
- Advanced ML anomaly detection on top of the current explainable rule engine
- Mobile app with passport QR scanning
- GPS/IoT integration for real-time tracking
- Cross-chain interoperability
- NFT ownership certificates
- Government portal integration
- Automated insurance premium calculation
