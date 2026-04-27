export type CategorySlug =
  | "electrician"
  | "plumber"
  | "carpenter"
  | "ac-repair"
  | "painter"
  | "tutor"
  | "mechanic"
  | "cleaning"
  | "appliance-repair"
  | "pest-control";

export interface Category {
  slug: CategorySlug;
  name: string;
  icon: string; // lucide icon name
  description: string;
}

export interface Provider {
  id: string;
  name: string;
  category: CategorySlug;
  city: string;
  pincode: string;
  area: string;
  lat: number;
  lng: number;
  distance?: number;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  priceFrom: number; // INR
  verified: boolean;
  available: boolean;
  phone: string;
  whatsapp: string;
  about: string;
  services: string[];
  workingHours: string;
  photoSeed: number;
}
