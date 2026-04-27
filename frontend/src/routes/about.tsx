import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, ShieldCheck, Star } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About SewaMP — Verified Local Service Pros in MP" },
      { name: "description", content: "SewaMP is a verified directory of local service providers across Madhya Pradesh — built for trust, transparency and convenience." },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">
          Built for <span className="gradient-text">trust</span>, in every corner of MP.
        </h1>
        <p className="mt-4 text-muted-foreground">
          SewaMP is a modern directory connecting Madhya Pradesh residents with verified local
          service professionals — electricians, plumbers, painters, tutors and more — with real
          reviews, fair prices and instant contact.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Verified pros only", text: "ID, address and phone verification before any pro gets the verified badge." },
          { icon: Star, title: "Real reviews", text: "Only verified customers can review after a completed booking. No fakes." },
          { icon: MapPin, title: "Hyperlocal search", text: "Find pros within 5, 10 or 20 km of you with live map and distance." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-secondary/40 p-8 text-center">
        <BadgeCheck className="mx-auto h-8 w-8 text-[var(--verified)]" />
        <h2 className="mt-3 font-display text-2xl font-bold">How the Verified badge works</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          A pro earns the Verified badge only after their mobile is OTP-verified, valid ID and
          address proof are uploaded, at least one service is completed, and admin approval is
          done. If any document expires, the badge is removed automatically.
        </p>
        <Link
          to="/search"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
        >
          Start exploring
        </Link>
      </div>
    </div>
  );
}
