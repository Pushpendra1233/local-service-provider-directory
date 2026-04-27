import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Phone, Star } from "lucide-react";
import type { Provider } from "@/data/types";
import { getCategory } from "@/data/providers";

interface Props {
  provider: Provider;
  distanceKm?: number;
}

export function ProviderCard({ provider, distanceKm }: Props) {
  const cat = getCategory(provider.category);
  return (
    <Link
      to="/provider/$id"
      params={{ id: provider.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={`https://picsum.photos/seed/${provider.photoSeed}/600/400`}
          alt={provider.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: provider.available ? "var(--success)" : "var(--muted-foreground)" }} />
          {provider.available ? "Available now" : "Busy"}
        </div>
        {provider.verified && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--verified)] px-2.5 py-1 text-xs font-semibold text-white">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-primary">{cat?.name}</div>
            <h3 className="mt-0.5 font-display text-lg font-semibold leading-tight">{provider.name}</h3>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-sm font-semibold">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            {provider.rating}
            <span className="text-xs font-normal text-muted-foreground">({provider.reviewCount})</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {provider.area}, {provider.city}
          </span>
          {distanceKm !== undefined && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">
              {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)} m` : `${distanceKm.toFixed(1)} km`} away
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-3">
          <div className="text-sm">
            <div className="text-xs text-muted-foreground">Starts at</div>
            <div className="font-display text-base font-bold">₹{provider.priceFrom}</div>
          </div>
          <div className="text-xs text-muted-foreground">{provider.experienceYears} yrs exp.</div>
          <div className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
            <Phone className="h-3 w-3" /> Contact
          </div>
        </div>
      </div>
    </Link>
  );
}
