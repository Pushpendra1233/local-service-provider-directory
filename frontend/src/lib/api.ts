import type { CategorySlug, Provider } from "@/data/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function buildQuery(params: Record<string, unknown>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

export interface ProviderSearchParams {
  q?: string;
  category?: CategorySlug;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  verified?: boolean;
  limit?: number;
}

export async function fetchProviders(params: ProviderSearchParams = {}) {
  const query = buildQuery({
    q: params.q,
    category: params.category,
    city: params.city,
    pincode: params.pincode,
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    verified: params.verified ? 1 : undefined,
    limit: params.limit,
  });

  const url = `${API_BASE}/api/providers${query ? `?${query}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load providers");
  }
  return (await res.json()) as Provider[];
}

export async function fetchProvider(id: string) {
  const res = await fetch(`${API_BASE}/api/providers/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error("Provider not found");
  }
  return (await res.json()) as Provider;
}
