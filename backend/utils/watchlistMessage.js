/**
 * Canonical message signed by the contract admin before adding a watchlist
 * entry or resolving one. Must match frontend/src/utils/watchlist.js exactly.
 */
export function buildWatchlistMessage({ vin, owner, reason, severity, timestamp }) {
  return [
    "Watchlist entry",
    `VIN: ${vin || "-"}`,
    `Owner: ${owner || "-"}`,
    `Reason: ${reason}`,
    `Severity: ${severity}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

export function buildWatchlistResolveMessage(id, timestamp) {
  return ["Watchlist resolve", `ID: ${id}`, `Timestamp: ${timestamp}`].join("\n");
}
