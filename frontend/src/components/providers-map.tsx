import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Provider } from "@/data/types";

interface Props {
  providers: Provider[];
  center: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number } | null;
  zoom?: number;
  height?: string;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

export function ProvidersMap({
  providers,
  center,
  userLocation,
  zoom = 12,
  height = "100%",
  onSelect,
  selectedId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recenter
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom]);

  // provider pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    for (const p of providers) {
      seen.add(p.id);
      const existing = markersRef.current.get(p.id);
      const html = `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:linear-gradient(135deg,var(--primary),var(--primary-glow));
        border:2px solid var(--background);
        box-shadow:0 4px 12px oklch(0 0 0 / 0.25);
        display:grid;place-items:center;color:var(--primary-foreground);
        font-weight:700;font-size:12px;font-family:var(--font-sans);
      "><span style="transform:rotate(45deg)">${p.rating}</span></div>`;
      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      if (existing) {
        existing.setLatLng([p.lat, p.lng]);
        existing.setIcon(icon);
      } else {
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.bindPopup(
          `<div style="min-width:180px">
            <div style="font-weight:600;font-size:14px">${p.name}</div>
            <div style="font-size:12px;color:var(--muted-foreground);margin-top:2px">
              ${p.area}, ${p.city}
            </div>
            <div style="font-size:12px;margin-top:6px">⭐ ${p.rating} · ₹${p.priceFrom}+</div>
          </div>`
        );
        m.on("click", () => onSelect?.(p.id));
        markersRef.current.set(p.id, m);
      }
    }
    // remove stale
    for (const [id, m] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
  }, [providers, onSelect]);

  // open popup for selected
  useEffect(() => {
    if (!selectedId) return;
    const m = markersRef.current.get(selectedId);
    if (m && mapRef.current) {
      mapRef.current.flyTo(m.getLatLng(), Math.max(mapRef.current.getZoom(), 14), { duration: 0.5 });
      m.openPopup();
    }
  }, [selectedId]);

  // user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userLocation) {
      const icon = L.divIcon({
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:var(--accent);border:3px solid var(--background);
          box-shadow:0 0 0 6px color-mix(in oklab, var(--accent) 25%, transparent);
        "></div>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon }).addTo(map);
    }
  }, [userLocation]);

  return <div ref={containerRef} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden" />;
}
