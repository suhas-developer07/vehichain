# Development Diary — Blockchain Vehicle Data Integrity System

---

## Phase 1 — Project Scaffolding

1. Set up the project structure with three layers — blockchain contracts, backend server, and frontend app — all connected through shared configuration.
2. Installed all the necessary tools like Hardhat for smart contracts, Ganache as a local blockchain for testing, and configured the environment variables for easy setup.
3. Got stuck with Ganache's CLI changes and had to figure out how to share environment files across all three layers without breaking anything.

## Phase 2 — Smart Contract

1. Wrote the core smart contract that handles vehicle registration, record management, ownership transfers, and role-based permissions — all stored permanently on the blockchain.
2. Designed six different user roles so that only authorized people can perform specific actions, like service centers adding service records or only owners transferring vehicles.
3. Had trouble with how Solidity handles enums in events and had to rethink how roles are assigned so that registering a vehicle doesn't accidentally remove someone's existing permissions.

## Phase 3 — Testing & Deployment

1. Wrote comprehensive tests covering every function — registration, role assignment, record addition, ownership transfer — and made sure error cases like duplicate VINs and unauthorized access are properly handled.
2. Built an automated deployment script that not only deploys the contract but also copies the ABI and updates the frontend config automatically so everything stays in sync.
3. Created a demo script that runs the entire workflow end-to-end and had to solve nonce management issues when multiple transactions come from the same account.

## Phase 4 — Backend

1. Built the Express backend with a dual data source approach — reads directly from the blockchain for accuracy and uses MongoDB as a fast cache for search and listing.
2. Implemented an event listener that runs in the background, listening to blockchain events and automatically syncing new vehicles, records, and ownership changes into the database.
3. Faced issues with ESM module loading order — the environment config must load before anything else, and dealing with module syntax differences between CommonJS and ESM caused unexpected errors.

## Phase 5 — Frontend

1. Created the main wallet connection hook that handles MetaMask integration, account switching, network validation, and provides the contract instance to all pages.
2. Set up React Router with five pages and a navigation bar, plus configured the Vite dev server to proxy API requests to the backend to avoid CORS problems during development.
3. Struggled with the ethers.js version upgrade from v5 to v6 which changed many APIs, and had to fix infinite re-render loops caused by event listeners not being properly cleaned up.

## Phase 6 — Feature Pages

1. Built all five pages — vehicle history lookup that works without a wallet, vehicle registration with MetaMask flow, record addition with role-based access control, ownership transfer with ownership verification, and admin panel for role assignment.
2. Each page follows the same pattern of showing a form, sending the transaction through MetaMask, and displaying the transaction status through three stages — confirming, pending, and confirmed.
3. Learned that users need clear feedback at each step — the "Confirm in MetaMask" state was missing initially which confused users since MetaMask popup takes time to appear.

## Phase 7 — Integration

1. Connected all layers together — frontend sends transactions, blockchain executes them and emits events, backend listens to events and syncs to MongoDB, and the frontend reads back the results.
2. Validated the complete workflow end-to-end using the demo script, catching issues like timestamps being in seconds instead of milliseconds which caused dates showing 1970.
3. Discovered that restarting the backend doesn't replay missed events, so vehicles registered while the backend was down won't appear in MongoDB until new activity happens.

## Phase 8 — Polish & Documentation

1. Wrote two documentation files — a hands-on developer guide with setup instructions and a professional system documentation covering architecture, data flows, and security model.
2. Fixed several bugs including ABI not being copied on first deploy, frontend showing stale contract addresses after redeployment, and error messages not being user-friendly enough.
3. Polished the demo script with clean formatted output and added Mermaid diagrams throughout the documentation to make the architecture easier to understand visually.

## Phase 9 — Trust, Passports & Live Analytics

1. Built an explainable Trust Score and Fraud Radar as a pure rule-based service over the on-chain vehicle and history — every positive and negative point is returned as a labelled factor, and risks like accidents without follow-up inspections, ownership flipping, duplicate records, weak evidence, and suspicious status become severity-ranked flags with plain-language explanations.
2. Added a public Vehicle Passport that works without a wallet — a shareable page at `/passport/:vin`, a JSON API with a server-rendered QR code, and a print-ready PDF (via `pdfkit`) containing the photo, trust gauge, fraud radar, paginated history table, QR code, and a stable SHA-256 document fingerprint so the same chain state always produces the same identity.
3. Built a live registry dashboard with MongoDB aggregations — KPI cards, a 14-day activity chart, trust-risk distribution, records by type, top makes, and a merged activity feed of registrations, records, and photo updates that refreshes every 8 seconds, with best-effort trust caching back onto `VehicleIndex` so it stays fast.
4. Solved a subtle integrity bug where duplicate records could still earn history-depth and evidence points — duplicates are now collapsed before scoring and penalised, and the same owner-signed photo flow (file SHA-256 bound to the wallet signature) feeds `photoVerified` into the score and the passport PDF.

## Phase 10 — Buyer Due Diligence

1. Turned the trust engine into a buyer-facing decision — a 12-check due-diligence report that returns **Cleared to buy**, **Proceed with caution**, or **Do not buy**, with every check explaining itself and up to four concrete reasons behind the verdict.
2. Reconstructed the ownership trail from `VehicleRegistered` and `OwnershipTransferred` chain events so the report shows real from → to addresses and transaction hashes, with a fallback to transfer history records when events are unavailable.
3. Added an admin-signed watchlist stored in MongoDB — VIN or owner flags can only be written with a fresh EIP-191 signature from the contract admin wallet, and a high/critical match immediately flips the verdict to **Do not buy**. Resolved entries stay for audit but stop affecting reports.
4. Built side-by-side comparison for exactly two VINs — the winner is chosen by verdict rank, then trust score, then fewer failed checks, and genuine ties return `winner: null` instead of inventing a result.
5. Shipped a shareable `/due-diligence/:vin` page with a stable report fingerprint, copy-link and print/PDF actions, plus an in-memory A4 PDF containing the verdict, photo, red flags, checklist, timeline, and QR code — mirroring the passport design.

---

## Summary

| Phase | Focus |
|-------|-------|
| 1 | Project setup and configuration |
| 2 | Smart contract with roles and permissions |
| 3 | Testing and automated deployment |
| 4 | Backend with blockchain event sync |
| 5 | Frontend with MetaMask wallet integration |
| 6 | All five feature pages |
| 7 | Connecting everything end-to-end |
| 8 | Documentation, bug fixes, and polish |
| 9 | Trust scores, public passports, and live analytics |
| 10 | Buyer due diligence, admin watchlist, and comparison |
