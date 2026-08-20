# Blockchain-Enabled Vehicle Data Integrity System

A decentralized application (dApp) where vehicles are registered on-chain by VIN, and authorized stakeholders append immutable records (service history, accident reports, insurance claims, ownership transfers) to that vehicle's history.

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

## Project Structure

```
├── contracts/VehicleRegistry.sol    # Solidity smart contract
├── scripts/deploy.js                # Deployment script
├── test/VehicleRegistry.test.js     # Contract tests
├── hardhat.config.js                # Hardhat configuration
├── backend/                         # Express API server
│   ├── server.js                    # Entry point
│   ├── config/                      # DB + contract config
│   ├── models/                      # Mongoose schemas
│   ├── listeners/                   # Event listener (chain → Mongo)
│   ├── routes/                      # API routes
│   ├── controllers/                 # Route handlers
│   └── middleware/                   # Error handling
└── frontend/                        # React app (Vite)
    └── src/
        ├── contract/                # ABI + config
        ├── hooks/useWallet.js       # MetaMask connection
        ├── api/client.js            # Backend API client
        ├── pages/                   # 5 pages
        └── components/              # Reusable UI components
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

## API Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/vehicles/:vin` | Full vehicle detail + live history (from chain) |
| GET | `/api/vehicles` | List/search vehicles (query: make, model, owner, status) |
| GET | `/api/vehicles/:vin/records` | Record list for a VIN (from Mongo) |
| GET | `/api/records/recent` | Recent records (query: limit, default 20) |
| GET | `/api/health` | Health check (chain + DB status) |

## Architecture Notes

- **Blockchain is the source of truth.** MongoDB is a read-optimized cache built from contract events.
- **Writes are signed by the user's wallet**, never by the backend.
- **The event listener** keeps MongoDB in sync with on-chain events for fast queries.
- **Public verification** is a core feature — anyone can look up a vehicle's full history without a wallet.

## Future Scope

- IPFS document storage for service invoices and accident photos
- AI/ML fraud detection for suspicious patterns
- Mobile app with QR code scanning
- GPS/IoT integration for real-time tracking
- Cross-chain interoperability
- NFT ownership certificates
- Government portal integration
- Automated insurance premium calculation
