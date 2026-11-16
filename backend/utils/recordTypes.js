/**
 * Canonical on-chain record type order. The Solidity enum is positional, so
 * index N in this array is exactly enum value N on the contract.
 */
export const RECORD_TYPES = [
  "SERVICE",
  "ACCIDENT",
  "INSURANCE",
  "OWNERSHIP_TRANSFER",
  "INSPECTION",
];

export function recordTypeName(value) {
  return RECORD_TYPES[Number(value)] || "UNKNOWN";
}
