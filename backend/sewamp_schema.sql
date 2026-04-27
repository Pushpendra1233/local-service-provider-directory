-- ============================================================================
-- SewaMP — Local Service Provider Directory for Madhya Pradesh
-- PostgreSQL schema (works with PostGIS for geo queries; falls back to lat/lng)
-- ============================================================================
-- Usage:
--   createdb sewamp
--   psql sewamp -f sewamp_schema.sql
--
-- Optional (recommended for "near me" queries):
--   CREATE EXTENSION IF NOT EXISTS postgis;
-- ============================================================================

BEGIN;

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email
-- CREATE EXTENSION IF NOT EXISTS postgis;   -- uncomment for geography type

-- Enums -----------------------------------------------------------------------
CREATE TYPE app_role        AS ENUM ('customer', 'provider', 'admin');
CREATE TYPE provider_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE booking_status  AS ENUM ('requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected');
CREATE TYPE doc_type        AS ENUM ('id_proof', 'address_proof', 'business_license', 'certification', 'other');
CREATE TYPE doc_status      AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE review_status   AS ENUM ('visible', 'hidden', 'flagged');
CREATE TYPE language_code   AS ENUM ('en', 'hi');

-- 1. USERS --------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    phone           VARCHAR(15) UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    avatar_url      TEXT,
    phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_lang  language_code NOT NULL DEFAULT 'en',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_phone ON users(phone);

-- 2. USER ROLES (separate table — never store roles on users) -----------------
CREATE TABLE user_roles (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role      app_role NOT NULL,
    UNIQUE(user_id, role)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- 3. CATEGORIES ---------------------------------------------------------------
CREATE TABLE categories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         VARCHAR(60) UNIQUE NOT NULL,
    name_en      VARCHAR(80) NOT NULL,
    name_hi      VARCHAR(80),
    icon         VARCHAR(60),
    description  TEXT,
    parent_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LOCATIONS (MP cities & pincodes) -----------------------------------------
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state       VARCHAR(60) NOT NULL DEFAULT 'Madhya Pradesh',
    district    VARCHAR(80),
    city        VARCHAR(80) NOT NULL,
    area        VARCHAR(120),
    pincode     VARCHAR(6) NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    -- geog     GEOGRAPHY(POINT, 4326),  -- enable with PostGIS
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(city, pincode, area)
);
CREATE INDEX idx_locations_pincode ON locations(pincode);
CREATE INDEX idx_locations_city    ON locations(city);
-- CREATE INDEX idx_locations_geog ON locations USING GIST(geog);

-- 5. PROVIDERS (business profiles) --------------------------------------------
CREATE TABLE providers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name       VARCHAR(140) NOT NULL,
    primary_category_id UUID NOT NULL REFERENCES categories(id),
    about               TEXT,
    experience_years    SMALLINT NOT NULL DEFAULT 0 CHECK (experience_years BETWEEN 0 AND 80),
    price_from          INTEGER CHECK (price_from >= 0),
    whatsapp            VARCHAR(15),
    phone               VARCHAR(15) NOT NULL,
    photo_url           TEXT,
    cover_url           TEXT,
    -- Address
    location_id         UUID REFERENCES locations(id),
    city                VARCHAR(80) NOT NULL,
    area                VARCHAR(120),
    pincode             VARCHAR(6) NOT NULL,
    lat                 DOUBLE PRECISION NOT NULL,
    lng                 DOUBLE PRECISION NOT NULL,
    -- geog             GEOGRAPHY(POINT, 4326),  -- enable with PostGIS
    -- Status & badges
    status              provider_status NOT NULL DEFAULT 'pending',
    is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count        INTEGER NOT NULL DEFAULT 0,
    completed_jobs      INTEGER NOT NULL DEFAULT 0,
    -- Approval
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_providers_category ON providers(primary_category_id);
CREATE INDEX idx_providers_city     ON providers(city);
CREATE INDEX idx_providers_pincode  ON providers(pincode);
CREATE INDEX idx_providers_status   ON providers(status);
CREATE INDEX idx_providers_verified ON providers(is_verified);
-- CREATE INDEX idx_providers_geog ON providers USING GIST(geog);

-- 6. SERVICES (offered by a provider) -----------------------------------------
CREATE TABLE services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id   UUID NOT NULL REFERENCES categories(id),
    title         VARCHAR(140) NOT NULL,
    description   TEXT,
    price         INTEGER NOT NULL CHECK (price >= 0),
    price_unit    VARCHAR(20) NOT NULL DEFAULT 'visit',  -- visit / hour / job
    duration_min  INTEGER,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_services_category ON services(category_id);

-- 7. SERVICE AREAS (where a provider operates) --------------------------------
CREATE TABLE provider_service_areas (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    city          VARCHAR(80) NOT NULL,
    pincode       VARCHAR(6),
    radius_km     INTEGER NOT NULL DEFAULT 10 CHECK (radius_km > 0),
    UNIQUE(provider_id, city, pincode)
);

-- 8. WORKING HOURS ------------------------------------------------------------
CREATE TABLE provider_working_hours (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
    open_time     TIME NOT NULL,
    close_time    TIME NOT NULL,
    is_closed     BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(provider_id, day_of_week)
);

-- 9. PROVIDER PHOTOS ----------------------------------------------------------
CREATE TABLE provider_photos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    url           TEXT NOT NULL,
    caption       VARCHAR(200),
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_provider_photos_provider ON provider_photos(provider_id);

-- 10. VERIFICATION DOCUMENTS --------------------------------------------------
CREATE TABLE verification_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    doc_type      doc_type NOT NULL,
    doc_url       TEXT NOT NULL,
    doc_number    VARCHAR(80),
    issued_on     DATE,
    expires_on    DATE,
    status        doc_status NOT NULL DEFAULT 'pending',
    reviewed_by   UUID REFERENCES users(id),
    reviewed_at   TIMESTAMPTZ,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_docs_provider ON verification_documents(provider_id);
CREATE INDEX idx_docs_status   ON verification_documents(status);
CREATE INDEX idx_docs_expires  ON verification_documents(expires_on);

-- 11. OTP VERIFICATIONS (mobile / email) --------------------------------------
CREATE TABLE otp_verifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    channel       VARCHAR(10) NOT NULL,    -- 'sms' | 'email'
    target        VARCHAR(120) NOT NULL,   -- phone or email
    code_hash     TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    consumed_at   TIMESTAMPTZ,
    attempts      SMALLINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_target ON otp_verifications(target);

-- 12. BOOKINGS ----------------------------------------------------------------
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(12) UNIQUE NOT NULL,  -- short human ref
    customer_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    service_id      UUID REFERENCES services(id),
    scheduled_for   TIMESTAMPTZ,
    address_line    TEXT NOT NULL,
    city            VARCHAR(80) NOT NULL,
    pincode         VARCHAR(6) NOT NULL,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    notes           TEXT,
    is_emergency    BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_price INTEGER,
    final_price     INTEGER,
    status          booking_status NOT NULL DEFAULT 'requested',
    completed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancel_reason   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_status   ON bookings(status);

-- 13. REVIEWS -----------------------------------------------------------------
CREATE TABLE reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id    UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    customer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title         VARCHAR(140),
    body          TEXT,
    spam_score    NUMERIC(4,3) NOT NULL DEFAULT 0,
    status        review_status NOT NULL DEFAULT 'visible',
    moderated_by  UUID REFERENCES users(id),
    moderated_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_provider ON reviews(provider_id);
CREATE INDEX idx_reviews_status   ON reviews(status);

-- 14. FAVORITES ---------------------------------------------------------------
CREATE TABLE favorites (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider_id)
);

-- 15. CHAT (threads + messages) -----------------------------------------------
CREATE TABLE chat_threads (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, provider_id)
);

CREATE TABLE chat_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id     UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body          TEXT NOT NULL,
    attachment_url TEXT,
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id);

-- 16. SUBSCRIPTIONS (provider plans) ------------------------------------------
CREATE TABLE subscription_plans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(60) UNIQUE NOT NULL,
    price_inr     INTEGER NOT NULL,
    period_days   INTEGER NOT NULL DEFAULT 30,
    features      JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE provider_subscriptions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    plan_id       UUID NOT NULL REFERENCES subscription_plans(id),
    starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at       TIMESTAMPTZ NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    payment_ref   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subs_provider ON provider_subscriptions(provider_id);

-- 17. FEATURED ADS ------------------------------------------------------------
CREATE TABLE featured_ads (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    city          VARCHAR(80),
    category_id   UUID REFERENCES categories(id),
    starts_at     TIMESTAMPTZ NOT NULL,
    ends_at       TIMESTAMPTZ NOT NULL,
    priority      SMALLINT NOT NULL DEFAULT 1,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. NOTIFICATIONS -----------------------------------------------------------
CREATE TABLE notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(140) NOT NULL,
    body          TEXT,
    link          TEXT,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- 19. AUDIT LOG (admin actions) -----------------------------------------------
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES users(id),
    action        VARCHAR(80) NOT NULL,
    entity_type   VARCHAR(60) NOT NULL,
    entity_id     UUID,
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_bookings_updated  BEFORE UPDATE ON bookings  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Role check (security definer — use in RLS policies)
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Recompute provider rating after review insert/update/delete
CREATE OR REPLACE FUNCTION recompute_provider_rating() RETURNS TRIGGER AS $$
DECLARE pid UUID;
BEGIN
    pid := COALESCE(NEW.provider_id, OLD.provider_id);
    UPDATE providers p SET
        rating_avg   = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE provider_id = pid AND status = 'visible'), 0),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = pid AND status = 'visible')
    WHERE p.id = pid;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_recompute
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION recompute_provider_rating();

-- Verified badge logic — re-evaluate whenever docs / bookings / approval change
CREATE OR REPLACE FUNCTION recompute_verified_badge(_provider_id UUID) RETURNS VOID AS $$
DECLARE
    has_id_proof      BOOLEAN;
    has_addr_proof    BOOLEAN;
    has_completed_job BOOLEAN;
    is_phone_verified BOOLEAN;
    is_approved       BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM verification_documents
        WHERE provider_id = _provider_id AND doc_type = 'id_proof'
          AND status = 'verified'
          AND (expires_on IS NULL OR expires_on > CURRENT_DATE)
    ) INTO has_id_proof;

    SELECT EXISTS (
        SELECT 1 FROM verification_documents
        WHERE provider_id = _provider_id AND doc_type = 'address_proof'
          AND status = 'verified'
          AND (expires_on IS NULL OR expires_on > CURRENT_DATE)
    ) INTO has_addr_proof;

    SELECT EXISTS (
        SELECT 1 FROM bookings WHERE provider_id = _provider_id AND status = 'completed'
    ) INTO has_completed_job;

    SELECT u.phone_verified INTO is_phone_verified
      FROM providers p JOIN users u ON u.id = p.user_id WHERE p.id = _provider_id;

    SELECT (status = 'approved') INTO is_approved FROM providers WHERE id = _provider_id;

    UPDATE providers SET is_verified =
        (has_id_proof AND has_addr_proof AND has_completed_job AND is_phone_verified AND is_approved)
    WHERE id = _provider_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-expire docs (run via pg_cron daily): UPDATE expired -> doc_status='expired'
CREATE OR REPLACE FUNCTION expire_documents() RETURNS INTEGER AS $$
DECLARE n INTEGER;
BEGIN
    UPDATE verification_documents
       SET status = 'expired'
     WHERE status = 'verified' AND expires_on IS NOT NULL AND expires_on <= CURRENT_DATE;
    GET DIAGNOSTICS n = ROW_COUNT;
    -- recompute badge for affected providers
    PERFORM recompute_verified_badge(provider_id)
      FROM verification_documents
     WHERE status = 'expired' AND expires_on <= CURRENT_DATE;
    RETURN n;
END;
$$ LANGUAGE plpgsql;

-- Haversine distance in km (fallback when PostGIS not enabled)
CREATE OR REPLACE FUNCTION haversine_km(lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
                                        lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION LANGUAGE SQL IMMUTABLE AS $$
    SELECT 2 * 6371 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
        COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lng2 - lng1) / 2), 2)
    ));
$$;

-- ============================================================================
-- SEED DATA — categories + MP cities
-- ============================================================================
INSERT INTO categories (slug, name_en, name_hi, icon, description) VALUES
 ('electrician',      'Electrician',      'इलेक्ट्रीशियन', 'Zap',            'Wiring, repairs, installations'),
 ('plumber',          'Plumber',          'प्लंबर',         'Droplets',       'Leaks, fittings, drainage'),
 ('carpenter',        'Carpenter',        'बढ़ई',           'Hammer',         'Furniture, doors, repairs'),
 ('ac-repair',        'AC Repair',        'एसी रिपेयर',     'Wind',           'Service, gas refill, install'),
 ('painter',          'Painter',          'पेंटर',          'Paintbrush',     'Interior & exterior painting'),
 ('tutor',            'Home Tutor',       'होम ट्यूटर',     'GraduationCap',  'School, college, hobby classes'),
 ('mechanic',         'Mechanic',         'मैकेनिक',        'Wrench',         'Bike, car, scooter repair'),
 ('cleaning',         'Cleaning',         'सफाई',           'Sparkles',       'Home deep clean, sofa, kitchen'),
 ('appliance-repair', 'Appliance Repair', 'उपकरण मरम्मत',   'Cpu',            'Fridge, washing machine, TV'),
 ('pest-control',     'Pest Control',     'कीट नियंत्रण',   'Bug',            'Cockroach, termite, rodent');

INSERT INTO locations (city, pincode, lat, lng, district) VALUES
 ('Bhopal',   '462001', 23.2599, 77.4126, 'Bhopal'),
 ('Indore',   '452001', 22.7196, 75.8577, 'Indore'),
 ('Jabalpur', '482001', 23.1815, 79.9864, 'Jabalpur'),
 ('Gwalior',  '474001', 26.2183, 78.1828, 'Gwalior'),
 ('Ujjain',   '456001', 23.1765, 75.7885, 'Ujjain'),
 ('Sagar',    '470001', 23.8388, 78.7378, 'Sagar'),
 ('Rewa',     '486001', 24.5373, 81.3042, 'Rewa'),
 ('Satna',    '485001', 24.6005, 80.8322, 'Satna');

INSERT INTO subscription_plans (name, price_inr, period_days, features) VALUES
 ('Free',    0,    30,  '{"featured": false, "max_photos": 5,  "support": "email"}'::jsonb),
 ('Pro',     499,  30,  '{"featured": true,  "max_photos": 20, "support": "priority"}'::jsonb),
 ('Premium', 1499, 30,  '{"featured": true,  "max_photos": 50, "ads_credits": 100, "support": "phone"}'::jsonb);

COMMIT;

-- ============================================================================
-- EXAMPLE: nearest providers within 10 km (Haversine)
-- ============================================================================
-- SELECT p.*, haversine_km(p.lat, p.lng, 23.2599, 77.4126) AS distance_km
--   FROM providers p
--  WHERE p.status = 'approved' AND p.is_available = TRUE
--    AND haversine_km(p.lat, p.lng, 23.2599, 77.4126) <= 10
--  ORDER BY distance_km ASC
--  LIMIT 20;
