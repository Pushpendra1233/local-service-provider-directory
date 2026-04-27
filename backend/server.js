const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./sewamp.db");

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    city TEXT NOT NULL,
    pincode TEXT NOT NULL,
    area TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    rating REAL NOT NULL,
    reviewCount INTEGER NOT NULL,
    experienceYears INTEGER NOT NULL,
    priceFrom INTEGER NOT NULL,
    verified INTEGER DEFAULT 0,
    available INTEGER DEFAULT 1,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    about TEXT NOT NULL,
    services TEXT NOT NULL,
    workingHours TEXT NOT NULL,
    photoSeed INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    estimated_cost INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (provider_id) REFERENCES providers (id)
  )`);

  // Insert sample admin user if not exists
  db.get("SELECT id FROM users WHERE email = ?", ["admin@sewamp.com"], (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync("admin123", 10);
      db.run("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
        ["admin@sewamp.com", hash, "Admin User", "admin"]);
    }
  });

  // Insert sample providers if not exists
  db.get("SELECT COUNT(*) as count FROM providers", (err, row) => {
    if (row.count === 0) {
      const providers = generateProviders();
      const stmt = db.prepare(`INSERT INTO providers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      providers.forEach(p => {
        stmt.run(p.id, p.name, p.category, p.city, p.pincode, p.area, p.lat, p.lng, p.rating, p.reviewCount,
          p.experienceYears, p.priceFrom, p.verified ? 1 : 0, p.available ? 1 : 0, p.phone, p.whatsapp,
          p.about, JSON.stringify(p.services), p.workingHours, p.photoSeed);
      });
      stmt.finalize();
    }
  });
});

// JWT secret
const JWT_SECRET = "your-secret-key";

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Email, password, and full name required" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
      [email, hash, fullName], function(err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: "Email already exists" });
          }
          return res.status(500).json({ error: "Database error" });
        }
        const token = jwt.sign({ id: this.lastID, email, role: "customer" }, JWT_SECRET);
        res.json({ token, user: { id: this.lastID, email, fullName, role: "customer" } });
      });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  });
});

app.get("/api/auth/verify", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin routes
app.get("/api/admin/providers", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  db.all("SELECT * FROM providers", (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.get("/api/admin/users", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  db.all("SELECT id, email, full_name, role, is_active, created_at FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// Booking routes
app.post("/api/bookings", authenticateToken, (req, res) => {
  const { providerId, serviceType, bookingDate, bookingTime, notes, address, phone, estimatedCost } = req.body;
  const userId = req.user.id;

  if (!providerId || !serviceType || !bookingDate || !bookingTime || !address || !phone) {
    return res.status(400).json({ error: "All required fields must be provided" });
  }

  db.run(`INSERT INTO bookings (user_id, provider_id, service_type, booking_date, booking_time, notes, address, phone, estimated_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, providerId, serviceType, bookingDate, bookingTime, notes, address, phone, estimatedCost],
    function(err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ id: this.lastID, message: "Booking created successfully" });
    });
});

app.get("/api/bookings", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const query = req.user.role === "admin"
    ? "SELECT b.*, u.full_name as user_name, p.name as provider_name FROM bookings b JOIN users u ON b.user_id = u.id JOIN providers p ON b.provider_id = p.id ORDER BY b.created_at DESC"
    : "SELECT b.*, p.name as provider_name FROM bookings b JOIN providers p ON b.provider_id = p.id WHERE b.user_id = ? ORDER BY b.created_at DESC";

  const params = req.user.role === "admin" ? [] : [userId];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.put("/api/bookings/:id/status", authenticateToken, (req, res) => {
  const { status } = req.body;
  const bookingId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!["pending", "confirmed", "in_progress", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  // Check if user owns the booking or is admin
  const checkQuery = userRole === "admin"
    ? "SELECT id FROM bookings WHERE id = ?"
    : "SELECT id FROM bookings WHERE id = ? AND user_id = ?";

  const checkParams = userRole === "admin" ? [bookingId] : [bookingId, userId];

  db.get(checkQuery, checkParams, (err, row) => {
    if (err || !row) return res.status(404).json({ error: "Booking not found" });

    db.run("UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, bookingId], function(err) {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ message: "Booking status updated" });
      });
  });
});

// Existing provider routes (modified to use DB)
app.get("/api/providers", (req, res) => {
  const { q, category, city, pincode, lat, lng, radius, verified, limit } = req.query;
  let query = "SELECT * FROM providers WHERE 1=1";
  const params = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  if (city) {
    query += " AND city = ?";
    params.push(city);
  }
  if (pincode) {
    query += " AND pincode LIKE ?";
    params.push(`${pincode}%`);
  }
  if (q) {
    query += " AND (name LIKE ? OR category LIKE ? OR area LIKE ? OR city LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (verified === "1") {
    query += " AND verified = 1";
  }

  if (limit) {
    query += " LIMIT ?";
    params.push(parseInt(limit));
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    rows = rows.map((p) => ({
      ...p,
      services: typeof p.services === "string" ? JSON.parse(p.services) : p.services,
    }));

    // Add distance if lat/lng provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const r = parseFloat(radius) || 10;
      rows = rows.map(p => ({
        ...p,
        distance: distanceKm({ lat: userLat, lng: userLng }, p)
      })).filter(p => p.distance <= r).sort((a, b) => a.distance - b.distance);
    } else {
      rows.sort((a, b) => b.rating - a.rating);
    }

    res.json(rows);
  });
});

app.get("/api/providers/:id", (req, res) => {
  db.get("SELECT * FROM providers WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: "Provider not found" });
    const provider = {
      ...row,
      services: typeof row.services === "string" ? JSON.parse(row.services) : row.services,
    };
    res.json(provider);
  });
});

app.get("/api/categories", (req, res) => {
  res.json([
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
  ]);
});

app.get("/api/cities", (req, res) => {
  res.json([
    { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
    { name: "Indore", lat: 22.7196, lng: 75.8577 },
    { name: "Jabalpur", lat: 23.1815, lng: 79.9864 },
    { name: "Gwalior", lat: 26.2183, lng: 78.1828 },
    { name: "Ujjain", lat: 23.1765, lng: 75.7885 },
    { name: "Sagar", lat: 23.8388, lng: 78.7378 },
    { name: "Rewa", lat: 24.5373, lng: 81.3042 },
    { name: "Satna", lat: 24.6005, lng: 80.8322 },
  ]);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`SewaMP backend running: http://localhost:${port}`);
});

// Helper functions
const categories = [
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

const mpCities = [
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

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateProviders() {
  const rng = seeded(42);
  const out = [];
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
          category: cat.slug,
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

function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}