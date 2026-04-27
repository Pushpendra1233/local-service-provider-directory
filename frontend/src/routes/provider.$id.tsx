import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { BadgeCheck, Calendar, ChevronLeft, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { getCategory } from "@/data/providers";
import { fetchProvider, fetchProviders } from "@/lib/api";
import type { Provider } from "@/data/types";
import { ProviderCard } from "@/components/provider-card";
import { BookingDialog } from "@/components/booking-dialog";

const ProvidersMap = lazy(() =>
  import("@/components/providers-map").then((m) => ({ default: m.ProvidersMap }))
);

export const Route = createFileRoute("/provider/$id")({
  loader: async ({ params }) => {
    try {
      const provider = await fetchProvider(params.id);
      return { provider };
    } catch (error) {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Provider — SewaMP" }] };
    const p = loaderData.provider;
    const cat = getCategory(p.category);
    return {
      meta: [
        { title: `${p.name} · ${cat?.name} in ${p.city} — SewaMP` },
        { name: "description", content: `${p.name} — ${cat?.name} in ${p.area}, ${p.city}. ${p.experienceYears}+ years experience, rated ${p.rating}/5 by ${p.reviewCount} customers.` },
        { property: "og:title", content: `${p.name} · ${cat?.name} in ${p.city}` },
        { property: "og:description", content: p.about },
        { property: "og:image", content: `https://picsum.photos/seed/${p.photoSeed}/1200/630` },
        { name: "twitter:image", content: `https://picsum.photos/seed/${p.photoSeed}/1200/630` },
      ],
    };
  },
  component: ProviderPage,
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Provider not found</h1>
      <Link to="/search" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
        Back to search
      </Link>
    </div>
  ),
});

const sampleReviews = [
  { name: "Anita S.", rating: 5, text: "Showed up on time and fixed the issue in 20 minutes. Very polite.", when: "2 weeks ago" },
  { name: "Rahul K.", rating: 4, text: "Good work, fair pricing. Will book again.", when: "1 month ago" },
  { name: "Meena P.", rating: 5, text: "Highly professional. Cleaned up after the work too.", when: "2 months ago" },
];

function ProviderPage() {
  const { provider } = Route.useLoaderData() as { provider: Provider };
  const [similar, setSimilar] = useState<Provider[]>([]);
  const cat = getCategory(provider.category);

  useEffect(() => {
    let active = true;
    fetchProviders({ category: provider.category, city: provider.city, limit: 4 })
      .then((data) => {
        if (active) {
          setSimilar(data.filter((p) => p.id !== provider.id).slice(0, 3));
        }
      })
      .catch(() => {
        if (active) setSimilar([]);
      });

    return () => {
      active = false;
    };
  }, [provider.category, provider.city, provider.id]);

  return (
    <div className="container-page py-6 md:py-8">
      <Link
        to="/search"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to results
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {/* Hero */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="relative h-56 md:h-72">
              <img
                src={`https://picsum.photos/seed/${provider.photoSeed}/1200/600`}
                alt={provider.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5">
                <div className="flex flex-wrap items-end justify-between gap-3 text-white">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide opacity-80">{cat?.name}</div>
                    <h1 className="font-display text-2xl font-bold md:text-3xl">{provider.name}</h1>
                    <div className="mt-1 inline-flex items-center gap-1 text-sm opacity-90">
                      <MapPin className="h-3.5 w-3.5" /> {provider.area}, {provider.city} · {provider.pincode}
                    </div>
                  </div>
                  {provider.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--verified)] px-3 py-1 text-xs font-semibold">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified Pro
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border border-t border-border md:grid-cols-4">
              <Stat label="Rating" value={`${provider.rating} ★`} sub={`${provider.reviewCount} reviews`} />
              <Stat label="Experience" value={`${provider.experienceYears} yrs`} sub="In this trade" />
              <Stat label="Starts at" value={`₹${provider.priceFrom}`} sub="Per visit" />
              <Stat label="Status" value={provider.available ? "Available" : "Busy"} sub={provider.workingHours} />
            </div>
          </div>

          {/* About */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{provider.about}</p>
          </section>

          {/* Services */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Services & pricing</h2>
            <div className="mt-3 divide-y divide-border">
              {provider.services.map((s: string, i: number) => (
                <div key={s} className="flex items-center justify-between py-3 text-sm">
                  <span>{s}</span>
                  <span className="font-semibold">₹{provider.priceFrom + i * 100}+</span>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Reviews</h2>
              <div className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {provider.rating} <span className="text-muted-foreground">· {provider.reviewCount} total</span>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {sampleReviews.map((r) => (
                <div key={r.name} className="rounded-xl bg-secondary/60 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.when}</span>
                  </div>
                  <div className="mt-1 flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Contact directly</div>
            <a
              href={`tel:${provider.phone.replace(/\s/g, "")}`}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <Phone className="h-4 w-4" /> Call {provider.phone}
            </a>
            <a
              href={`https://wa.me/${provider.whatsapp}?text=${encodeURIComponent(`Hi ${provider.name}, I found you on SewaMP and need help with ${cat?.name.toLowerCase()}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-3 text-sm font-semibold text-success-foreground"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <BookingDialog provider={provider}>
              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                <Calendar className="h-4 w-4" /> Book Service
              </button>
            </BookingDialog>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="h-56">
              <Suspense fallback={<div className="grid h-full place-items-center bg-muted text-xs text-muted-foreground">Loading map…</div>}>
                <ProvidersMap providers={[provider]} center={provider} zoom={14} />
              </Suspense>
            </div>
            <div className="border-t border-border bg-card p-3 text-xs text-muted-foreground">
              {provider.area}, {provider.city} · {provider.pincode}
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Similar pros in {provider.city}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => <ProviderCard key={p.id} provider={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
