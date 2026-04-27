import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Crosshair, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { categories, mpCities } from "@/data/providers";
import { fetchProviders } from "@/lib/api";
import type { CategorySlug, Provider } from "@/data/types";
import { ProviderCard } from "@/components/provider-card";

const ProvidersMap = lazy(() =>
  import("@/components/providers-map").then((m) => ({ default: m.ProvidersMap }))
);

interface SearchParams {
  q?: string;
  category?: CategorySlug | "";
  city?: string;
  pincode?: string;
  near?: 1 | 0;
  radius?: number;
}

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? (s.category as CategorySlug) : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
    pincode: typeof s.pincode === "string" ? s.pincode : undefined,
    near: s.near === 1 || s.near === "1" ? 1 : 0,
    radius: typeof s.radius === "number" ? s.radius : s.radius ? Number(s.radius) : 10,
  }),
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "Browse local service pros — SewaMP" },
      { name: "description", content: "Filter and find verified local service providers across MP by category, city or pincode." },
    ],
  }),
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [showMap, setShowMap] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const center = useMemo(() => {
    if (userLoc && search.near) return userLoc;
    const c = mpCities.find((x) => x.name === search.city);
    return c ? { lat: c.lat, lng: c.lng } : { lat: 23.4733, lng: 77.9479 }; // MP centroid
  }, [search.city, search.near, userLoc]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchProviders({
      q: search.q,
      category: search.category,
      city: search.city,
      pincode: search.pincode,
      lat: search.near && userLoc ? userLoc.lat : undefined,
      lng: search.near && userLoc ? userLoc.lng : undefined,
      radius: search.near ? search.radius : undefined,
    })
      .then((data) => {
        if (active) setProviders(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load providers");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, userLoc]);

  const filtered = providers;

  // request geo if `near=1` is set
  useEffect(() => {
    if (!search.near || userLoc) return;
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGeoError(err.message)
    );
  }, [search.near, userLoc]);

  const updateSearch = (patch: Partial<SearchParams>) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch }) as SearchParams });
  };

  return (
    <div className="container-page py-8">
      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <h1 className="font-display text-lg font-semibold">Find a service pro</h1>
          </div>
          <button
            onClick={() => setShowMap((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
          >
            <MapIcon className="h-3.5 w-3.5" /> {showMap ? "Hide map" : "Show map"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={search.q ?? ""}
            onChange={(e) => updateSearch({ q: e.target.value || undefined })}
            placeholder="Search keyword…"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={search.category ?? ""}
            onChange={(e) => updateSearch({ category: (e.target.value as CategorySlug) || undefined })}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select
            value={search.city ?? ""}
            onChange={(e) => updateSearch({ city: e.target.value || undefined })}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">All MP cities</option>
            {mpCities.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <input
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={search.pincode ?? ""}
            onChange={(e) => updateSearch({ pincode: e.target.value.replace(/\D/g, "") || undefined })}
            placeholder="Pincode"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => updateSearch({ near: search.near ? 0 : 1 })}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold ${
              search.near
                ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow"
                : "border border-border bg-background hover:border-primary hover:text-primary"
            }`}
          >
            <Crosshair className="h-4 w-4" /> Near me
          </button>
        </div>

        {search.near && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Radius:</span>
            {[5, 10, 20, 50].map((r) => (
              <button
                key={r}
                onClick={() => updateSearch({ radius: r })}
                className={`rounded-full px-3 py-1 ${
                  (search.radius ?? 10) === r
                    ? "bg-foreground text-background"
                    : "border border-border hover:border-primary hover:text-primary"
                }`}
              >
                {r} km
              </button>
            ))}
            {geoError && <span className="text-destructive">· {geoError}</span>}
            {userLoc && <span>· {filtered.length} pros within {search.radius ?? 10} km</span>}
          </div>
        )}

        {(search.q || search.category || search.city || search.pincode) && (
          <button
            onClick={() => navigate({ search: {} })}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Results + Map */}
      <div className={`mt-6 grid gap-6 ${showMap ? "lg:grid-cols-[1fr_minmax(380px,1fr)]" : ""}`}>
        <div>
          <div className="mb-3 text-sm text-muted-foreground">
            {filtered.length} provider{filtered.length === 1 ? "" : "s"} found
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-medium">No providers match these filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try widening your search or clearing filters.</p>
              <Link to="/search" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                Reset search
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((provider) => (
                <div
                  key={provider.id}
                  onMouseEnter={() => setSelected(provider.id)}
                >
                  <ProviderCard provider={provider} distanceKm={provider.distance} />
                </div>
              ))}
            </div>
          )}
        </div>

        {showMap && (
          <div className="sticky top-20 h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-border">
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading map…</div>}>
              <ProvidersMap
                providers={filtered.map((f) => f.provider)}
                center={center}
                userLocation={userLoc}
                onSelect={setSelected}
                selectedId={selected}
                zoom={search.city || (userLoc && search.near) ? 12 : 7}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
