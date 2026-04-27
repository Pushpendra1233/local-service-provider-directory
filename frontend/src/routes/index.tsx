import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ArrowRight, BadgeCheck, MapPin, Search, Star } from "lucide-react";
import { categories, mpCities } from "@/data/providers";
import { ProviderCard } from "@/components/provider-card";
import { fetchProviders } from "@/lib/api";
import type { Provider } from "@/data/types";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "SewaMP — Find Verified Local Pros across Madhya Pradesh" },
      {
        name: "description",
        content:
          "Search electricians, plumbers, AC repair, tutors and more — verified local service providers near you in Bhopal, Indore, Jabalpur, Gwalior and all of MP.",
      },
    ],
  }),
});

function HomePage() {
  const [featured, setFeatured] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchProviders({ verified: true, limit: 6 })
      .then((data) => {
        if (active) setFeatured(data);
      })
      .catch(() => {
        if (active) setFeatured([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero">
        <div className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Trusted across {mpCities.length} MP cities
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Local pros you can <span className="gradient-text">actually trust</span>,
              <br className="hidden md:block" /> right around the corner.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
              SewaMP connects you with verified electricians, plumbers, painters, tutors and more
              across Madhya Pradesh — with ratings, reviews and prices upfront.
            </p>

            <form
              action="/search"
              className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-elevated sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  name="q"
                  placeholder="What service do you need?"
                  className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 sm:w-56">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <select
                  name="city"
                  className="h-11 flex-1 bg-transparent text-sm outline-none"
                  defaultValue=""
                >
                  <option value="">All MP cities</option>
                  {mpCities.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Search <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[var(--verified)]" /> ID & address verified</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> Real customer reviews</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-accent" /> Live "near me" search</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Browse by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick a service to see verified pros near you.</p>
          </div>
          <Link to="/search" className="hidden text-sm font-semibold text-primary hover:underline md:inline">
            View all →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[c.icon] ?? Icons.Wrench;
            return (
              <Link
                key={c.slug}
                to="/search"
                search={{ category: c.slug }}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page pb-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Top-rated verified pros</h2>
            <p className="mt-1 text-sm text-muted-foreground">Hand-picked based on ratings and reviews.</p>
          </div>
          <Link to="/search" className="text-sm font-semibold text-primary hover:underline">View all →</Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <ProviderCard key={p.id} provider={p} />)}
        </div>
      </section>

      {/* Cities */}
      <section className="border-t border-border bg-secondary/40">
        <div className="container-page py-16">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Serving across Madhya Pradesh</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pros available in every major MP city.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {mpCities.map((c) => (
              <Link
                key={c.name}
                to="/search"
                search={{ city: c.name }}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
