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
