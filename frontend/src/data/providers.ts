import type { Category, CategorySlug, Provider } from "./types";

export const categories: Category[] = [
  { slug: "electrician", name: "Electrician", icon: "Zap", description: "Wiring, repairs, installations" },
  { slug: "plumber", name: "Plumber", icon: "Droplets", description: "Leaks, fittings, drainage" },
  { slug: "carpenter", name: "Carpenter", icon: "Hammer", description: "Furniture, doors, repairs" },
  { slug: "ac-repair", name: "AC Repair", icon: "Wind", description: "Service, gas refill, install" },
  { slug: "painter", name: "Painter", icon: "Paintbrush", description: "Interior & exterior painting" },
  { slug: "tutor", name: "Home Tutor", icon: "GraduationCap", description: "School, college, hobby classes" },
  { slug: "mechanic", name: "Mechanic", icon: "Wrench", description: "Bike, car, scooter repair" },
  { slug: "cleaning", name: "Cleaning", icon: "Sparkles", description: "Home deep clean, sofa, kitchen" },
  { slug: "appliance-repair", name: "Appliance Repair", icon: "Cpu", description: "Fridge, washing machine, TV" },
  { slug: "pest-control", name: "Pest Control", icon: "Bug", description: "Cockroach, termite, rodent" },
];

export const mpCities = [
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Jabalpur", lat: 23.1815, lng: 79.9864 },
  { name: "Gwalior", lat: 26.2183, lng: 78.1828 },
  { name: "Ujjain", lat: 23.1765, lng: 75.7885 },
  { name: "Sagar", lat: 23.8388, lng: 78.7378 },
  { name: "Rewa", lat: 24.5373, lng: 81.3042 },
  { name: "Satna", lat: 24.6005, lng: 80.8322 },
];

const firstNames = ["Rajesh", "Amit", "Suresh", "Vikram", "Manoj", "Deepak", "Sandeep", "Anil", "Pradeep", "Ravi", "Mukesh", "Ashok", "Naveen", "Pankaj", "Yogesh", "Hemant", "Lokesh", "Gaurav", "Arun", "Mahesh", "Priya", "Sunita", "Neha", "Pooja"];
const lastNames = ["Sharma", "Verma", "Patel", "Yadav", "Gupta", "Jain", "Soni", "Mehta", "Tiwari", "Pandey", "Singh", "Chouhan", "Raghuvanshi", "Malviya", "Kushwaha", "Lodhi"];
const businessSuffix = ["Services", "Solutions", "Works", "& Sons", "Care", "Pro", "Hub", "Experts"];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generate(): Provider[] {
  const rng = seeded(42);
  const out: Provider[] = [];
  let id = 1;
  for (const city of mpCities) {
    for (const cat of categories) {
      const count = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        const fn = pick(firstNames, rng);
        const ln = pick(lastNames, rng);
        const isBiz = rng() > 0.5;
        const name = isBiz ? `${ln} ${pick(businessSuffix, rng)}` : `${fn} ${ln}`;
        const latJitter = (rng() - 0.5) * 0.08;
        const lngJitter = (rng() - 0.5) * 0.08;
        const rating = +(3.6 + rng() * 1.4).toFixed(1);
        const reviewCount = 5 + Math.floor(rng() * 240);
        const experienceYears = 1 + Math.floor(rng() * 22);
        const priceFrom = [199, 249, 299, 349, 399, 499, 599][Math.floor(rng() * 7)];
        const verified = rng() > 0.35;
        const available = rng() > 0.25;
        const pin = `${4 + Math.floor(rng() * 6)}${Math.floor(10000 + rng() * 89999)}`.slice(0, 6);
        const phone = `+91 9${Math.floor(100000000 + rng() * 899999999)}`.slice(0, 14);
        out.push({
          id: `p-${id++}`,
          name,
          category: cat.slug as CategorySlug,
          city: city.name,
          pincode: pin,
          area: `${pick(["MP Nagar", "New Market", "Vijay Nagar", "Arera Colony", "Kolar", "Shahpura", "Bittan Market", "Habibganj"], rng)}`,
          lat: city.lat + latJitter,
          lng: city.lng + lngJitter,
          rating,
          reviewCount,
          experienceYears,
          priceFrom,
          verified,
          available,
          phone,
          whatsapp: phone.replace(/\D/g, ""),
          about: `${experienceYears}+ years of experience serving ${city.name}. Specialised in ${cat.name.toLowerCase()} work for homes and small businesses. Quick response, fair pricing, and quality workmanship guaranteed.`,
          services: [
            `${cat.name} — basic visit`,
            `${cat.name} — installation`,
            `${cat.name} — emergency call-out`,
            `${cat.name} — annual maintenance`,
          ],
          workingHours: rng() > 0.5 ? "Mon–Sun · 8:00 AM – 9:00 PM" : "Mon–Sat · 9:00 AM – 7:00 PM",
          photoSeed: id,
        });
      }
    }
  }
  return out;
}

export const providers: Provider[] = generate();

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getProvider(id: string) {
  return providers.find((p) => p.id === id);
}

// Haversine — distance in km
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
