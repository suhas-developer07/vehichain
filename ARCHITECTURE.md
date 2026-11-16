# Blockchain Vehicle Data Integrity System — Architecture

---

## 1. High-Level System Overview

```mermaid
graph TB
    subgraph Browser["User (Browser)"]
        MM["MetaMask Wallet"]
        FE["React Frontend (Vite)"]
    end

    FE -->|"GET /api/* (read-only)"| Proxy["Vite Proxy"]
    MM -->|"Signs Tx (user keys)"| Chain

    Proxy --> BE["Express Backend<br/>Port 4000"]
    BE -->|"reads only"| Chain["Ganache Chain<br/>Local EVM"]
    Chain -->|"VehicleRegistry<br/>Solidity"| Contract["Smart Contract"]

    EL["Event Listener"] -->|"chain → Mongo"| BE
    Contract -->|"Emits events"| EL
    BE --> DB["MongoDB Atlas"]

    FE -->|"contract.method()<br/>→ MetaMask → Tx"| Chain

    style Browser fill:#c8e6c9,stroke:#1b5e20,color:#000
    style MM fill:#1b5e20,stroke:#0d3311,color:#fff
    style FE fill:#2e7d32,stroke:#1b5e20,color:#fff
    style Proxy fill:#e8f5e9,stroke:#388e3c,color:#000
    style BE fill:#1565c0,stroke:#0d47a1,color:#fff
    style Chain fill:#e65100,stroke:#bf360c,color:#fff
    style Contract fill:#ef6c00,stroke:#e65100,color:#fff
    style EL fill:#6a1b9a,stroke:#4a148c,color:#fff
    style DB fill:#c62828,stroke:#b71c1c,color:#fff
```

---

## 2. Component Responsibilities

| Layer | Technology | Role |
|-------|-----------|------|
| **User** | MetaMask | Signs transactions with private key; never exposed to backend |
| **Frontend** | React + ethers.js | UI for all operations; sends write txs via MetaMask, reads via API |
| **Blockchain** | Ganache + Solidity | Source of truth; stores vehicles, records, roles, access control |
| **Backend** | Express + ethers.js (read-only) | REST API for reads; event listener syncs chain → MongoDB |
| **Database** | MongoDB Atlas | Read-optimized cache for search, filtering, pagination |

---

## 3. Data Flow

### 3a. Write Path (User → Chain)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant M as MetaMask
    participant C as Ganache Chain

    U->>F: Fill form + Submit
    F->>M: contract.method(args)
    M->>U: Popup: Review Transaction
    U->>M: Confirm (signs with private key)
    M->>C: Signed Tx broadcast
    C->>C: Contract executes + emits event
    C-->>F: Tx receipt
    F-->>U: "Confirmed!" + tx hash
```

### 3b. Sync Path (Chain → MongoDB)

```mermaid
sequenceDiagram
    participant C as Ganache Chain
    participant EL as Event Listener
    participant M as MongoDB

    C->>EL: VehicleRegistered / RecordAdded / OwnershipTransferred
    EL->>C: Read full data from contract
    EL->>M: Upsert document (VehicleIndex / RecordIndex)
```

### 3c. Read Path (User ← MongoDB/Chain)

```mermaid
flowchart LR
    U["User"] -->|Search / VIN lookup| F["Frontend"]
    F -->|"GET /api/*"| B["Backend"]
    B -->|"Single vehicle"| Chain["Blockchain<br/>fresh read"]
    B -->|"List / search / recent"| Mongo["MongoDB<br/>fast query"]
    Chain -->|Response| B
    Mongo -->|Response| B
    B -->|JSON| F
    F -->|Display| U

    style U fill:#e8f5e9,stroke:#2e7d32,color:#000
    style F fill:#2e7d32,stroke:#1b5e20,color:#fff
    style B fill:#1565c0,stroke:#0d47a1,color:#fff
    style Chain fill:#e65100,stroke:#bf360c,color:#fff
    style Mongo fill:#c62828,stroke:#b71c1c,color:#fff
```

### 3d. Photo Upload Path (Owner-Signed, Off-Chain File)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant M as MetaMask
    participant B as Backend
    participant C as Ganache Chain
    participant FS as uploads/vehicles

    F->>M: signMessage("Vehicle photo upload + file hash...")
    M-->>F: signature
    F->>B: POST /api/vehicles/:vin/photo (file + signature + fileHash + timestamp)
    B->>C: getVehicle(vin) → currentOwner
    B->>B: verifyMessage → signer == currentOwner
    B->>B: validate image bytes + SHA-256 hash
    B->>FS: store image (project root)
    B->>B: save photoUrl + hash in MongoDB VehicleIndex
    B-->>F: photoUrl + photoHash
```

The photo file is **not** written to the blockchain (too expensive). Instead the chain remains
the authority for ownership, while the owner signature authorizes the off-chain upload and is
bound to the image's SHA-256 hash. The hash stored in MongoDB can later be anchored on-chain
for stronger tamper evidence.

### 3e. Trust, Passport, Due Diligence & Analytics Read Path

```mermaid
flowchart LR
    R["GET /vehicles/:vin<br/>/trust<br/>/passport(.pdf)<br/>/due-diligence/:vin"] --> C["contract.getVehicle()<br/>contract.getHistory()"]
    R --> M["VehicleIndex<br/>photo metadata + status"]
    R --> W["WatchlistEntry<br/>admin-signed flags"]
    R --> EV["VehicleRegistered /<br/>OwnershipTransferred events"]
    C --> T["trustScore.js<br/>rules + flags"]
    M --> T
    T --> P["passport.js<br/>QR + PDF"]
    T --> D["dueDiligence.js<br/>verdict + 12 checks"]
    W --> D
    EV --> D
    D --> F["dueDiligenceReport.js<br/>buyer PDF"]
    T --> X["Best-effort trust cache<br/>VehicleIndex.trustScore"]
    X --> A["/api/analytics/summary<br/>/api/analytics/activity"]
```

- **Chain first:** the vehicle and its history are always read from the contract.
- **Explainable scoring:** every point and every fraud flag is returned, never an opaque number.
- **Ownership trail:** registration and transfer events provide from → to addresses; the report
  falls back to `OWNERSHIP_TRANSFER` history records when events are unavailable.
- **Off-chain rendering:** QR/PDF generation and dashboard aggregation never mutate chain state.
- **Watchlist:** MongoDB rows written only with an admin wallet signature; reads are public and
  feed the due-diligence verdict.
- **Best-effort cache:** trust scores are cached on `VehicleIndex` for fast dashboard queries; a
  failed cache write never fails the vehicle lookup.

---

## 4. Smart Contract: VehicleRegistry.sol

### Access Control

```mermaid
graph TD
    Admin["Deployer<br/>Admin"] -->|"assignRole()"| Roles

    subgraph Roles["Role Hierarchy"]
        O["OWNER"]
        SC["SERVICE_CENTER"]
        INS["INSURANCE"]
        GOV["GOVERNMENT"]
        BUY["BUYER"]
    end

    O -->|"registerVehicle()"| Contract["VehicleRegistry"]
    SC -->|"addRecord()"| Contract
    INS -->|"addRecord()"| Contract
    GOV -->|"addRecord()"| Contract
    BUY -->|"view only"| Contract

    Contract -->|"transferOwnership()"| O

    style Admin fill:#6a1b9a,stroke:#4a148c,color:#fff
    style Contract fill:#1565c0,stroke:#0d47a1,color:#fff
    style O fill:#2e7d32,stroke:#1b5e20,color:#fff
    style SC fill:#ef6c00,stroke:#e65100,color:#fff
    style INS fill:#c62828,stroke:#b71c1c,color:#fff
    style GOV fill:#00695c,stroke:#004d40,color:#fff
    style BUY fill:#546e7a,stroke:#37474f,color:#fff
    style Roles fill:#f5f5f5,stroke:#9e9e9e,color:#000
```

### Key Functions

| Function | Caller | Action |
|----------|--------|--------|
| `registerVehicle(vin, make, model, year)` | Anyone | Creates vehicle, assigns OWNER |
| `addRecord(vin, type, hash, desc)` | SERVICE_CENTER / INSURANCE / GOVERNMENT | Appends immutable record |
| `transferOwnership(vin, newOwner)` | Current owner | Transfers ownership + logs transfer |
| `assignRole(user, role)` | Admin only | Grants role to address |
| `getVehicle(vin)` / `getHistory(vin)` | Public | Read-only queries |

### Events (Bridge to Backend)

| Event | Triggered By | Listener Action |
|-------|-------------|-----------------|
| `VehicleRegistered` | `registerVehicle()` | Create VehicleIndex doc |
| `RecordAdded` | `addRecord()` | Create RecordIndex doc |
| `OwnershipTransferred` | `transferOwnership()` | Update VehicleIndex owner |
| `RoleAssigned` | `assignRole()` | (logged only) |

---

## 5. Backend Structure

```
backend/
├── server.js                    # Express entry point + /uploads static files
├── config/
│   ├── contract.js              # ethers.JsonRpcProvider + read-only Contract
│   ├── db.js                    # Mongoose → MongoDB Atlas
│   ├── env.js                   # Root .env loader
│   ├── paths.js                 # Project-root uploads directory paths
│   └── abi.json                 # Contract ABI (auto-copied)
├── models/
│   ├── VehicleIndex.js          # { vin, owner, recordCount, status, photo metadata }
│   ├── RecordIndex.js           # { vin, type, description, txHash }
│   └── WatchlistEntry.js        # { vin?, owner?, reason, severity, active, addedBy }
├── listeners/
│   └── eventListener.js         # Subscribes to chain events, syncs to Mongo
├── controllers/
│   ├── vehicleController.js     # Vehicle detail, trust, passport, list
│   ├── recordController.js      # getVehicleRecords (mongo), getRecentRecords
│   ├── photoController.js       # Owner-signed photo upload + hashing
│   ├── analyticsController.js   # Dashboard summary + merged activity feed
│   ├── dueDiligenceController.js # Buyer report, comparison, report PDF
│   └── watchlistController.js   # Admin-signed watchlist CRUD
├── services/
│   ├── trustScore.js            # Explainable 0-100 score + fraud flags
│   ├── passport.js              # Passport JSON, QR codes, PDF generation
│   ├── dueDiligence.js          # Verdict engine, 12 checks, timeline, comparison
│   └── dueDiligenceReport.js    # Buyer due-diligence PDF
├── middleware/
│   ├── errorHandler.js          # Error response formatting
│   └── upload.js                # Multer disk storage + image validation
├── routes/
│   ├── vehicles.js              # Detail, trust, passport, PDF, photo routes
│   ├── analytics.js             # /summary + /activity
│   ├── dueDiligence.js          # /:vin, /:vin/report.pdf, /compare
│   ├── watchlist.js             # list, add, resolve
│   └── records.js               # GET /recent
└── utils/
    ├── photoMessage.js          # Canonical message signed by photo uploader
    ├── watchlistMessage.js      # Canonical message signed by admin
    └── recordTypes.js           # Solidity enum ↔ string mapping
```

### Dual Data Source

```mermaid
flowchart LR
    API["API Request"] --> Router{"Endpoint?"}
    Router -->|"/vehicles/:vin"| Chain["Blockchain"]
    Router -->|"/vehicles<br/>search"| Mongo["MongoDB"]
    Router -->|"/vehicles/:vin<br/>records"| Mongo
    Router -->|"/vehicles/:vin/trust<br/>passport"| Both
    Router -->|"/due-diligence/*"| Both
    Router -->|"/watchlist"| Mongo
    Router -->|"/analytics/*"| Mongo
    Router -->|"/records/recent"| Mongo
    Router -->|"/health"| Both["Both"]

    Chain --> Fresh["Always fresh<br/>tamper-proof"]
    Mongo --> Fast["Fast filtering<br/>indexed"]

    style API fill:#1565c0,stroke:#0d47a1,color:#fff
    style Router fill:#6a1b9a,stroke:#4a148c,color:#fff
    style Chain fill:#e65100,stroke:#bf360c,color:#fff
    style Mongo fill:#c62828,stroke:#b71c1c,color:#fff
    style Both fill:#00695c,stroke:#004d40,color:#fff
    style Fresh fill:#fff3e0,stroke:#ef6c00,color:#000
    style Fast fill:#fce4ec,stroke:#c62828,color:#000
```

---

## 6. Frontend Structure

```
frontend/src/
├── App.jsx                      # Router + Navbar + Routes
├── contract/
│   ├── abi.json                 # Contract ABI
│   └── config.js                # Contract address + chain ID
├── hooks/
│   └── useWallet.js             # MetaMask connect, role fetch, state
├── api/
│   └── client.js                # fetch() wrappers for all endpoints
│   ├── utils/
│   │   ├── vehiclePhoto.js      # Canonical photo-upload signing message
│   │   └── watchlist.js         # Canonical admin watchlist signing message
│   ├── pages/
│   │   ├── VehicleHistory.jsx   # VIN search + history + photo + trust (no wallet needed)
│   │   ├── RegisterVehicle.jsx  # Register vehicle + required photo (on-chain write)
│   │   ├── AddRecord.jsx        # Add record (role-gated)
│   │   ├── TransferOwnership.jsx # Transfer ownership (owner-only)
│   │   ├── AdminRoles.jsx       # Assign roles + manage watchlist (admin-only)
│   │   ├── Dashboard.jsx        # Live registry analytics + activity feed
│   │   ├── Passport.jsx         # Public QR/PDF vehicle passport
│   │   └── DueDiligence.jsx     # Buyer report + comparison + share/PDF
│   └── components/
│       ├── ConnectWalletButton.jsx # Wallet connection UI
│       ├── RoleBadge.jsx        # Color-coded role display
│       ├── RecordCard.jsx       # Record display card
│       ├── TrustScoreCard.jsx   # Trust gauge + fraud radar + score factors
│       └── WatchlistPanel.jsx   # Admin watchlist add/resolve UI
```

### Write Pattern (All Write Pages)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Confirming: Form Submit → contract.method()
    Confirming --> Pending: User signs in MetaMask
    Pending --> Confirmed: Tx mined on chain
    Pending --> Failed: Tx reverted
    Confirmed --> Redirect: Navigate to history
    Failed --> Idle: Retry
```

---

## 7. Contract ↔ Backend ↔ Frontend Integration

```mermaid
flowchart LR
    H["Hardhat compile"] --> Artifacts["artifacts/"]
    Artifacts --> D["deploy.js"]
    D -->|"copies ABI"| BE["backend/<br/>config/abi.json"]
    D -->|"copies ABI"| FE["frontend/src/<br/>contract/abi.json"]
    D -->|"updates address"| CFG["frontend/src/<br/>contract/config.js"]
    D -->|"updates address"| ENV[".env"]

    style H fill:#6a1b9a,stroke:#4a148c,color:#fff
    style Artifacts fill:#424242,stroke:#212121,color:#fff
    style D fill:#1565c0,stroke:#0d47a1,color:#fff
    style BE fill:#ef6c00,stroke:#e65100,color:#fff
    style FE fill:#2e7d32,stroke:#1b5e20,color:#fff
    style CFG fill:#2e7d32,stroke:#1b5e20,color:#fff
    style ENV fill:#546e7a,stroke:#37474f,color:#fff
```

---

## 8. Key Architectural Principles

```mermaid
mindmap
  root((Architecture))
    Blockchain = Source of Truth
      All mutations on-chain
      Immutable records
    User-Signed Transactions
      Private keys in MetaMask
      Never exposed to backend
    Backend is Read-Only
      No private key
      No signer
    Event-Driven Cache
      Chain events to MongoDB
      Fast indexed queries
    Public Verification
      No wallet needed to view
      Anyone can audit history
    Role-Based Access
      Enforced at contract level
      5 roles plus admin
    Explainable Trust
      Every score factor returned
      Fraud radar with severities
    Public Passport
      QR + printable PDF
      Stable document fingerprint
    Buyer Due Diligence
      Rule-based verdict
      Side-by-side comparison
    Admin Watchlist
      Wallet-signed writes
      Public reads in reports
```

---

## 9. API Reference

| Method | Endpoint | Source | Purpose |
|--------|----------|--------|---------|
| GET | `/api/vehicles/:vin` | Chain + Mongo | Vehicle detail + live history + photo metadata + trust score |
| GET | `/api/vehicles` | Mongo | Search/filter vehicles |
| GET | `/api/vehicles/:vin/records` | Mongo | Record list for VIN |
| GET | `/api/vehicles/:vin/trust` | Chain + Mongo | Explainable trust score + fraud flags |
| GET | `/api/vehicles/:vin/passport` | Chain + Mongo | Public passport JSON + QR data URL |
| GET | `/api/vehicles/:vin/passport.pdf` | Chain + Mongo | Printable A4 passport PDF |
| POST | `/api/vehicles/:vin/photo` | File + Mongo | Owner-signed photo upload/replacement |
| GET | `/uploads/vehicles/:file` | Filesystem | Serve stored vehicle photo |
| GET | `/api/records/recent` | Mongo | Recent records globally |
| GET | `/api/analytics/summary` | Mongo | Registry KPIs, trust distribution, daily activity |
| GET | `/api/analytics/activity` | Mongo | Merged live feed (registrations, records, photos) |
| GET | `/api/due-diligence/:vin` | Chain + Mongo | Buyer verdict, 12 checks, alerts, ownership timeline |
| GET | `/api/due-diligence/:vin/report.pdf` | Chain + Mongo | Printable buyer due-diligence PDF |
| GET | `/api/due-diligence/compare` | Chain + Mongo | Two-VIN comparison + recommended winner |
| GET | `/api/watchlist` | Mongo | List active/resolved watchlist entries |
| POST | `/api/watchlist` | Mongo (admin-signed) | Add a watchlist entry |
| POST | `/api/watchlist/:id/resolve` | Mongo (admin-signed) | Resolve a watchlist entry |
| GET | `/api/health` | Both | Chain + DB health check |

---

## 10. Technology Stack Summary

```mermaid
block-beta
    columns 1
    block:FE["Frontend Layer"]:1
        columns 3
        R["React 18"]
        V["Vite 5"]
        E1["ethers.js v6"]
    end
    block:BE["Backend Layer"]:1
        columns 3
        N["Node.js"]
        X["Express"]
        MG["Mongoose"]
    end
    block:BC["Blockchain Layer"]:1
        columns 3
        G["Ganache"]
        S["Solidity 0.8.24"]
        H2["Hardhat"]
    end
    block:DB["Database Layer"]:1
        columns 1
        MA["MongoDB Atlas"]
    end

    style FE fill:#2e7d32,stroke:#1b5e20,color:#fff
    style R fill:#c8e6c9,stroke:#2e7d32,color:#000
    style V fill:#c8e6c9,stroke:#2e7d32,color:#000
    style E1 fill:#c8e6c9,stroke:#2e7d32,color:#000
    style BE fill:#1565c0,stroke:#0d47a1,color:#fff
    style N fill:#bbdefb,stroke:#1565c0,color:#000
    style X fill:#bbdefb,stroke:#1565c0,color:#000
    style MG fill:#bbdefb,stroke:#1565c0,color:#000
    style BC fill:#e65100,stroke:#bf360c,color:#fff
    style G fill:#ffe0b2,stroke:#e65100,color:#000
    style S fill:#ffe0b2,stroke:#e65100,color:#000
    style H2 fill:#ffe0b2,stroke:#e65100,color:#000
    style DB fill:#c62828,stroke:#b71c1c,color:#fff
    style MA fill:#ffcdd2,stroke:#c62828,color:#000
```
