const API_BASE = "/api";

export async function getVehicle(vin) {
  const res = await fetch(`${API_BASE}/vehicles/${vin}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch vehicle");
  }
  return res.json();
}

export async function listVehicles(filters = {}) {
  const params = new URLSearchParams();
  if (filters.make) params.set("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.status) params.set("status", filters.status);

  const res = await fetch(`${API_BASE}/vehicles?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to list vehicles");
  }
  return res.json();
}

export async function getVehicleRecords(vin) {
  const res = await fetch(`${API_BASE}/vehicles/${vin}/records`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch records");
  }
  return res.json();
}

export async function getVehicleTrust(vin) {
  const res = await fetch(`${API_BASE}/vehicles/${encodeURIComponent(vin)}/trust`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch trust score");
  }
  return res.json();
}

export async function getPassport(vin) {
  const res = await fetch(`${API_BASE}/vehicles/${encodeURIComponent(vin)}/passport`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch vehicle passport");
  }
  return res.json();
}

export function passportPdfUrl(vin) {
  return `${API_BASE}/vehicles/${encodeURIComponent(vin)}/passport.pdf`;
}

export async function getDueDiligence(vin) {
  const res = await fetch(
    `${API_BASE}/due-diligence/${encodeURIComponent(vin)}`
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to run due diligence");
  }
  return res.json();
}

export async function getDueDiligenceComparison(vinA, vinB) {
  const vins = [vinA, vinB].map((vin) => encodeURIComponent(vin)).join(",");
  const res = await fetch(`${API_BASE}/due-diligence/compare?vins=${vins}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to compare vehicles");
  }
  return res.json();
}

export function dueDiligencePdfUrl(vin) {
  return `${API_BASE}/due-diligence/${encodeURIComponent(vin)}/report.pdf`;
}

export async function getWatchlist({ includeResolved = false } = {}) {
  const params = new URLSearchParams();
  if (includeResolved) params.set("includeResolved", "true");

  const res = await fetch(`${API_BASE}/watchlist?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch watchlist");
  }
  return res.json();
}

export async function addWatchlistEntry(payload) {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to add watchlist entry");
  }
  return res.json();
}

export async function resolveWatchlistEntry(id, signature, timestamp) {
  const res = await fetch(
    `${API_BASE}/watchlist/${encodeURIComponent(id)}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, timestamp }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      err.details || err.error || "Failed to resolve watchlist entry"
    );
  }
  return res.json();
}

export async function getAnalyticsSummary() {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch analytics");
  }
  return res.json();
}

export async function getActivityFeed(limit = 20) {
  const res = await fetch(`${API_BASE}/analytics/activity?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch activity");
  }
  return res.json();
}

/**
 * Upload (or replace) the photo for a vehicle.
 * `signature` must be produced by the current owner over the message built by
 * buildVehiclePhotoMessage(vin, timestamp).
 */
export async function uploadVehiclePhoto(
  vin,
  file,
  signature,
  timestamp,
  fileHash
) {
  const body = new FormData();
  body.append("photo", file);
  body.append("signature", signature);
  body.append("timestamp", String(timestamp));
  body.append("fileHash", fileHash);

  const res = await fetch(
    `${API_BASE}/vehicles/${encodeURIComponent(vin)}/photo`,
    {
      method: "POST",
      body,
    }
  );

  if (!res.ok) {
    let err = {};
    try {
      err = await res.json();
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(err.details || err.error || "Failed to upload vehicle photo");
  }

  return res.json();
}

export async function getRecentRecords(limit = 20) {
  const res = await fetch(`${API_BASE}/records/recent?limit=${limit}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.details || err.error || "Failed to fetch recent records");
  }
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
