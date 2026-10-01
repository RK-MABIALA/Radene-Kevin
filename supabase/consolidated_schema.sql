-- ==============================================================================
-- SCHEMA SUPABASE COMPLET - APPLICATION DE MARIAGE RADÈNE & KÉVIN
-- Projet : bgdoudwqamjxlzawqtkl (Radene-Kevin)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SUPPRESSION PRÉVENTIVE
DROP TABLE IF EXISTS reminders_log CASCADE;
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS guestbook CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- 3. ENUMS & TYPES
DO $$ BEGIN
    CREATE TYPE rsvp_status AS ENUM ('en_attente', 'confirme', 'decline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE photo_status AS ENUM ('en_attente', 'valide', 'rejete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('a_faire', 'en_cours', 'termine');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('haute', 'moyenne', 'basse');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. TABLE : USER_ROLES (RBAC Admin)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'GUEST' CHECK (role IN ('ADMIN', 'ORGANIZER', 'VIP', 'GUEST')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLE : EVENTS (Programme du Mariage à Dieuppeul, Dakar)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    date_heure TIMESTAMPTZ NOT NULL,
    lieu TEXT NOT NULL,
    adresse TEXT,
    coordonnees_gps JSONB DEFAULT '{"lat": 14.7126, "lng": -17.4589, "maps_url": "https://maps.google.com/?q=Paroisse+Sainte+Therese+Dieuppeul+Dakar"}'::jsonb,
    description TEXT,
    dress_code TEXT,
    icone TEXT DEFAULT 'sparkles',
    ordre INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLE : TABLES (Plan de table 2D)
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_numero TEXT NOT NULL UNIQUE,
    capacite INT NOT NULL DEFAULT 8 CHECK (capacite > 0),
    forme TEXT NOT NULL DEFAULT 'ronde' CHECK (forme IN ('ronde', 'rectangulaire', 'ovale')),
    coordonnees_x_y JSONB NOT NULL DEFAULT '{"x": 150, "y": 150, "rotation": 0}'::jsonb,
    couleur TEXT DEFAULT '#B89355',
    zone TEXT DEFAULT 'Salle Principale',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLE : GUESTS (Gestion des Invités et RSVP)
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    statut_rsvp rsvp_status NOT NULL DEFAULT 'en_attente',
    menu_choisi TEXT,
    allergies TEXT,
    companion_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    relation_type TEXT DEFAULT 'conjoint',
    accompagnants_json JSONB DEFAULT '[]'::jsonb,
    qr_code_uid TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    nombre_invites INT NOT NULL DEFAULT 1,
    navette_requise BOOLEAN DEFAULT FALSE,
    hebergement_requis BOOLEAN DEFAULT FALSE,
    message_maries TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_guests_qr_code_uid ON guests(qr_code_uid);
CREATE INDEX idx_guests_nom_prenom ON guests(LOWER(nom), LOWER(prenom));
CREATE INDEX idx_guests_companion_id ON guests(companion_id);
CREATE INDEX idx_guests_statut_rsvp ON guests(statut_rsvp);
CREATE INDEX idx_guests_table_id ON guests(table_id);

-- 8. TABLE : PHOTOS (Galerie collaborative)
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    storage_path TEXT,
    uploaded_by TEXT DEFAULT 'Invité Anonyme',
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    caption TEXT,
    statut photo_status NOT NULL DEFAULT 'en_attente',
    likes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_photos_statut ON photos(statut);
CREATE INDEX idx_photos_event_id ON photos(event_id);

-- 9. TABLE : GUESTBOOK (Livre d'or)
CREATE TABLE guestbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name TEXT NOT NULL,
    email TEXT,
    message TEXT NOT NULL,
    emoji TEXT DEFAULT '🥂',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABLE : PROJECT_TASKS (Kanban Organisation)
CREATE TABLE project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    description TEXT,
    assigne_a TEXT,
    priorite task_priority NOT NULL DEFAULT 'moyenne',
    echeance DATE,
    statut task_status NOT NULL DEFAULT 'a_faire',
    ordre INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. TABLE : REMINDERS_LOG (Historique des Relances)
CREATE TABLE reminders_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    status TEXT NOT NULL DEFAULT 'envoye' CHECK (status IN ('envoye', 'echec', 'en_attente')),
    details TEXT,
    sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guests_updated_at
BEFORE UPDATE ON guests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_guest_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.accompagnants_json IS NOT NULL AND jsonb_typeof(NEW.accompagnants_json) = 'array' THEN
        NEW.nombre_invites = 1 + jsonb_array_length(NEW.accompagnants_json);
    ELSE
        NEW.nombre_invites = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guest_count
BEFORE INSERT OR UPDATE OF accompagnants_json ON guests
FOR EACH ROW
EXECUTE FUNCTION update_guest_count();

-- 13. SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_log ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Public can view events" ON events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage events" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view tables" ON tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage tables" ON tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can search and view basic guest info" ON guests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can update their own RSVP" ON guests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage all guests" ON guests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view approved photos" ON photos FOR SELECT TO anon, authenticated USING (statut = 'valide');
CREATE POLICY "Public can upload photos in pending state" ON photos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view and moderate all photos" ON photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can read guestbook" ON guestbook FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can post to guestbook" ON guestbook FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage guestbook" ON guestbook FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view and manage tasks" ON project_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read tasks for demo purposes" ON project_tasks FOR SELECT TO anon USING (true);

CREATE POLICY "Admins can view and insert reminders" ON reminders_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow read user_roles for authenticated users" ON user_roles FOR SELECT TO authenticated USING (true);

-- 14. BUCKET DE STOCKAGE PHOTOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-photos', 'wedding-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public can read wedding photos storage"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'wedding-photos');

CREATE POLICY "Public can upload photos to wedding-photos bucket"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'wedding-photos');

-- 15. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE guestbook;
ALTER PUBLICATION supabase_realtime ADD TABLE guests;
ALTER PUBLICATION supabase_realtime ADD TABLE project_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;

-- 16. DONNÉES INITIALES (SEED DATA)
INSERT INTO events (id, nom, date_heure, lieu, adresse, coordonnees_gps, description, dress_code, icone, ordre) VALUES
('e1111111-1111-1111-1111-111111111111', 'Bénédiction nuptiale', '2026-12-05T11:00:00+00:00', 'Eglise Protestante du Sénégal, Paroisse de Dieuppeul', 'PG8V+XWQ, Dakar', '{"lat": 14.7174, "lng": -17.4552, "maps_url": "https://maps.google.com/?q=PG8V%2BXWQ%2C+Dakar"}'::jsonb, 'Célébration solennelle et échange des consentements sacrés sous la bénédiction divine en présence de nos familles et proches.', 'Élégance Royale • Nuances Blanc Pur, Or & Bleu Roi', 'church', 1),
('e2222222-2222-2222-2222-222222222222', 'Soirée de gala', '2026-12-05T20:00:00+00:00', 'Salle de fête Fun Time', 'PG5R+GC, Dakar', '{"lat": 14.7088, "lng": -17.4589, "maps_url": "https://maps.google.com/?q=PG5R%2BGC%2C+Dakar"}'::jsonb, 'Dîner de gala féerique, banquet d’exception, discours émouvants, ouverture du bal royal et célébration dansante jusqu’au bout de la nuit.', 'Black Tie / Smoking & Robes Longues de Soirée', 'sparkles', 2),
('e3333333-3333-3333-3333-333333333333', 'Culte d’action de grâce', '2026-12-06T10:00:00+00:00', 'Eglise Protestante du Sénégal, Paroisse de Dieuppeul', 'PG8V+XWQ, Dakar', '{"lat": 14.7174, "lng": -17.4552, "maps_url": "https://maps.google.com/?q=PG8V%2BXWQ%2C+Dakar"}'::jsonb, 'Culte d’action de grâce pour rendre gloire à Dieu pour cette sainte union, suivi de moments fraternels de partage et de convivialité.', 'Chic & Décontracté', 'sun', 3);

INSERT INTO tables (id, nom_numero, capacite, forme, coordonnees_x_y, couleur, zone, notes) VALUES
('t1111111-1111-1111-1111-111111111111', 'Table d''Honneur - Pureté & Charité', 8, 'rectangulaire', '{"x": 380, "y": 70, "rotation": 0}'::jsonb, '#D4AF37', 'Estrade Royale', 'Mariés (Radène & Kévin), Parents & Témoins'),
('t2222222-2222-2222-2222-222222222222', 'Table 1 - Alliance Céleste', 8, 'ronde', '{"x": 140, "y": 220, "rotation": 0}'::jsonb, '#133E87', 'Aile Ouest', 'Famille Proche & Cousins'),
('t3333333-3333-3333-3333-333333333333', 'Table 2 - Grâce Éternelle', 8, 'ronde', '{"x": 380, "y": 240, "rotation": 0}'::jsonb, '#D4AF37', 'Zone Centrale', 'Amis d''Enfance et Collège'),
('t4444444-4444-4444-4444-444444444444', 'Table 3 - Bénédiction Divine', 8, 'ronde', '{"x": 620, "y": 220, "rotation": 0}'::jsonb, '#133E87', 'Aile Est', 'Amis Universitaires & Grandes Écoles'),
('t5555555-5555-5555-5555-555555555555', 'Table 4 - Étoile d’Or', 10, 'ronde', '{"x": 190, "y": 410, "rotation": 0}'::jsonb, '#D4AF37', 'Aile Ouest', 'Collègues & Partenaires'),
('t6666666-6666-6666-6666-666666666666', 'Table 5 - Harmonie Royale', 8, 'ronde', '{"x": 570, "y": 410, "rotation": 0}'::jsonb, '#133E87', 'Aile Est', 'Amis Internationaux & Voisins');

-- 111 Invités du mariage
INSERT INTO guests (id, nom, prenom, email, telephone, statut_rsvp, accompagnants_json, qr_code_uid, checked_in, nombre_invites, navette_requise, hebergement_requis)
VALUES
('00000000-0000-4000-8000-000000000001', 'DOSSOU', 'Antonin', NULL, '+221 77 648 01 97', 'en_attente', '[]'::jsonb, 'RK-001', false, 1, false, false),
('00000000-0000-4000-8000-000000000002', 'DOSSOU', 'Nicole', NULL, '+221 77 569 13 11', 'en_attente', '[]'::jsonb, 'RK-002', false, 1, false, false),
('00000000-0000-4000-8000-000000000003', 'MPASSI', 'Grace', NULL, '+242 04 453 03 47', 'en_attente', '[]'::jsonb, 'RK-003', false, 1, true, true),
('00000000-0000-4000-8000-000000000004', 'MPASSI', 'Justin', NULL, '+242 05 559 47 41', 'en_attente', '[]'::jsonb, 'RK-004', false, 1, true, true),
('00000000-0000-4000-8000-000000000005', 'BEMBA', 'Ben', NULL, '+242 04 044 45 49', 'en_attente', '[]'::jsonb, 'RK-005', false, 1, true, true),
('00000000-0000-4000-8000-000000000006', 'MOUKILOU', 'Awa', NULL, '+242 06 490 85 26', 'en_attente', '[]'::jsonb, 'RK-006', false, 1, true, true),
('00000000-0000-4000-8000-000000000007', 'KABI', 'Schysnel', NULL, '+242 06 651 66 69', 'en_attente', '[]'::jsonb, 'RK-007', false, 1, true, true),
('00000000-0000-4000-8000-000000000008', 'NKOUA', 'Olivier', NULL, '+242 06 966 50 47', 'en_attente', '[]'::jsonb, 'RK-008', false, 1, true, true),
('00000000-0000-4000-8000-000000000009', 'DOLIVERA', 'Yannick', NULL, '+242 05 203 62 66', 'en_attente', '[]'::jsonb, 'RK-009', false, 1, true, true),
('00000000-0000-4000-8000-000000000010', 'LOUBASSA GANGA', 'Théodore', NULL, '+242 06 673 87 06', 'en_attente', '[]'::jsonb, 'RK-010', false, 1, true, true),
('00000000-0000-4000-8000-000000000011', 'LOUBASSA GANGA', 'Gladys', NULL, '+242 06 916 91 38', 'en_attente', '[]'::jsonb, 'RK-011', false, 1, true, true),
('00000000-0000-4000-8000-000000000012', 'DEKERPEL', 'Baurdier', NULL, '+221 78 128 59 08', 'en_attente', '[]'::jsonb, 'RK-012', false, 1, false, false),
('00000000-0000-4000-8000-000000000013', 'MALONGA', 'Ripa', NULL, '+221 78 836 64 60', 'en_attente', '[]'::jsonb, 'RK-013', false, 1, false, false),
('00000000-0000-4000-8000-000000000014', 'ZINGA', 'Olsen', NULL, '+221 77 574 90 85', 'en_attente', '[]'::jsonb, 'RK-014', false, 1, false, false),
('00000000-0000-4000-8000-000000000015', 'ZINGA', 'Mme', NULL, '+221 77 574 90 85', 'en_attente', '[]'::jsonb, 'RK-015', false, 1, false, false),
('00000000-0000-4000-8000-000000000016', 'MAMBOU', 'Stephen', NULL, '+221 77 117 36 34', 'en_attente', '[]'::jsonb, 'RK-016', false, 1, false, false),
('00000000-0000-4000-8000-000000000017', 'MAMBOU', 'Emmanuelle', NULL, '+221 77 868 42 92', 'en_attente', '[]'::jsonb, 'RK-017', false, 1, false, false),
('00000000-0000-4000-8000-000000000018', 'MASSENGO', 'Marina', NULL, '+221 77 435 43 77', 'en_attente', '[]'::jsonb, 'RK-018', false, 1, false, false),
('00000000-0000-4000-8000-000000000019', 'MASSAMBA', 'Berlea', NULL, '+221 78 186 96 86', 'en_attente', '[]'::jsonb, 'RK-019', false, 1, false, false),
('00000000-0000-4000-8000-000000000020', 'MASSAMBA', 'Ocléa', NULL, '+221 78 385 54 61', 'en_attente', '[]'::jsonb, 'RK-020', false, 1, false, false),
('00000000-0000-4000-8000-000000000021', 'KIFOUANI', 'Delph', NULL, '+33 6 27 26 77 64', 'en_attente', '[]'::jsonb, 'RK-021', false, 1, true, true),
('00000000-0000-4000-8000-000000000022', 'KIFOUANI', 'Mirabelle', NULL, '+33 7 45 55 46 56', 'en_attente', '[]'::jsonb, 'RK-022', false, 1, true, true),
('00000000-0000-4000-8000-000000000023', 'TITOKO', 'Jaëlle', NULL, '+33 7 45 57 30 72', 'en_attente', '[]'::jsonb, 'RK-023', false, 1, true, true),
('00000000-0000-4000-8000-000000000024', 'DIBANTSA', 'Arsen', NULL, '+221 77 467 03 23', 'en_attente', '[]'::jsonb, 'RK-024', false, 1, false, false),
('00000000-0000-4000-8000-000000000025', 'LOUSSOUKOU', 'Mervillia', NULL, '+221 76 332 63 44', 'en_attente', '[]'::jsonb, 'RK-025', false, 1, false, false),
('00000000-0000-4000-8000-000000000026', 'MANDABRANDJA', 'Jordy', NULL, '+221 77 296 70 01', 'en_attente', '[]'::jsonb, 'RK-026', false, 1, false, false),
('00000000-0000-4000-8000-000000000027', 'MANDABRANDJA', 'Angelica', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-027', false, 1, false, false),
('00000000-0000-4000-8000-000000000028', 'MOUKOUIRI', 'Henrissia', NULL, '+221 78 166 23 27', 'en_attente', '[]'::jsonb, 'RK-028', false, 1, false, false),
('00000000-0000-4000-8000-000000000029', 'MOUKOUIRI', 'Glad', NULL, '+221 76 245 69 46', 'en_attente', '[]'::jsonb, 'RK-029', false, 1, false, false),
('00000000-0000-4000-8000-000000000030', 'DE SOUZA', 'Evera', NULL, '+221 77 623 02 53', 'en_attente', '[]'::jsonb, 'RK-030', false, 1, false, false),
('00000000-0000-4000-8000-000000000031', 'DE SOUZA', 'Kévin', NULL, '+221 78 441 57 61', 'en_attente', '[]'::jsonb, 'RK-031', false, 1, false, false),
('00000000-0000-4000-8000-000000000032', 'PARAISO', 'Akim', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-032', false, 1, false, false),
('00000000-0000-4000-8000-000000000033', 'GUEYE', 'Ramatoulaye', NULL, '+221 77 841 14 18', 'en_attente', '[]'::jsonb, 'RK-033', false, 1, false, false),
('00000000-0000-4000-8000-000000000034', '', 'Karima', NULL, '+221 77 752 78 61', 'en_attente', '[]'::jsonb, 'RK-034', false, 1, false, false),
('00000000-0000-4000-8000-000000000035', 'Thérese', 'Tâta', NULL, '+221 77 520 91 42', 'en_attente', '[]'::jsonb, 'RK-035', false, 1, false, false),
('00000000-0000-4000-8000-000000000036', 'NGUIDJOI', 'Luc', NULL, '+221 77 639 25 72', 'en_attente', '[]'::jsonb, 'RK-036', false, 1, false, false),
('00000000-0000-4000-8000-000000000037', 'NGUIDJOI', 'Mme', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-037', false, 1, false, false),
('00000000-0000-4000-8000-000000000038', 'MIAMBANZILA', 'Mildah', NULL, '+221 77 796 46 85', 'en_attente', '[]'::jsonb, 'RK-038', false, 1, false, false),
('00000000-0000-4000-8000-000000000039', 'MASSENGO', 'Espérance', NULL, '+242 06 441 17 70', 'en_attente', '[]'::jsonb, 'RK-039', false, 1, false, false),
('00000000-0000-4000-8000-000000000040', '', 'Ganech', NULL, '+221 78 015 83 56', 'en_attente', '[]'::jsonb, 'RK-040', false, 1, false, false),
('00000000-0000-4000-8000-000000000041', 'NDIAYE', 'Kiné', NULL, '+221 78 437 64 25', 'en_attente', '[]'::jsonb, 'RK-041', false, 1, false, false),
('00000000-0000-4000-8000-000000000042', 'NDIAYE', 'Mr', NULL, '+221 77 523 69 55', 'en_attente', '[]'::jsonb, 'RK-042', false, 1, false, false),
('00000000-0000-4000-8000-000000000043', 'FALL', 'Mor', NULL, '+221 76 836 00 46', 'en_attente', '[]'::jsonb, 'RK-043', false, 1, false, false),
('00000000-0000-4000-8000-000000000044', 'YALL', 'Abou', NULL, '+221 76 741 18 50', 'en_attente', '[]'::jsonb, 'RK-044', false, 1, false, false),
('00000000-0000-4000-8000-000000000045', '(Logeur)', 'Mr Roger', NULL, '+221 77 533 27 67', 'en_attente', '[]'::jsonb, 'RK-045', false, 1, false, false),
('00000000-0000-4000-8000-000000000046', '', 'Pendita', NULL, '+221 77 251 32 95', 'en_attente', '[]'::jsonb, 'RK-046', false, 1, false, false),
('00000000-0000-4000-8000-000000000047', 'ILOY', 'Yohan', NULL, '+221 78 711 25 11', 'en_attente', '[]'::jsonb, 'RK-047', false, 1, false, false),
('00000000-0000-4000-8000-000000000048', 'MAHOUKOU', 'Gaevy', NULL, '+221 71 019 50 25', 'en_attente', '[]'::jsonb, 'RK-048', false, 1, false, false),
('00000000-0000-4000-8000-000000000049', 'NKAYA', 'Medie', NULL, '+221 78 100 92 04', 'en_attente', '[]'::jsonb, 'RK-049', false, 1, false, false),
('00000000-0000-4000-8000-000000000050', 'DZAH', 'Pasteur Emmanuel', NULL, '+221 78 378 17 16', 'en_attente', '[]'::jsonb, 'RK-050', false, 1, false, false),
('00000000-0000-4000-8000-000000000051', 'DZAH', 'Mme', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-051', false, 1, false, false),
('00000000-0000-4000-8000-000000000052', 'OUATARA', 'Pasteur Gaston', NULL, '+221 77 444 09 66', 'en_attente', '[]'::jsonb, 'RK-052', false, 1, false, false),
('00000000-0000-4000-8000-000000000053', 'OUATARA', 'Mme', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-053', false, 1, false, false),
('00000000-0000-4000-8000-000000000054', 'DEH', 'VP Dieudonné', NULL, '+221 77 638 95 34', 'en_attente', '[]'::jsonb, 'RK-054', false, 1, false, false),
('00000000-0000-4000-8000-000000000055', 'DEH', 'Anita', NULL, '+221 77 572 40 07', 'en_attente', '[]'::jsonb, 'RK-055', false, 1, false, false),
('00000000-0000-4000-8000-000000000056', 'THIAW', 'Euloge', NULL, '+221 77 254 79 19', 'en_attente', '[]'::jsonb, 'RK-056', false, 1, false, false),
('00000000-0000-4000-8000-000000000057', '', 'Olga', NULL, '+221 78 123 61 82', 'en_attente', '[]'::jsonb, 'RK-057', false, 1, false, false),
('00000000-0000-4000-8000-000000000058', 'LONGUE', 'Honoré', NULL, '+221 77 547 49 28', 'en_attente', '[]'::jsonb, 'RK-058', false, 1, false, false),
('00000000-0000-4000-8000-000000000059', 'LONGUE', 'Pascaline', NULL, '+221 77 112 23 60', 'en_attente', '[]'::jsonb, 'RK-059', false, 1, false, false),
('00000000-0000-4000-8000-000000000060', '', 'Sylviane', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-060', false, 1, false, false),
('00000000-0000-4000-8000-000000000061', '', 'Bruno', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-061', false, 1, false, false),
('00000000-0000-4000-8000-000000000062', 'ATTIASE', 'Aimefa', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-062', false, 1, false, false),
('00000000-0000-4000-8000-000000000063', 'AGBOTAN', 'Christiane', NULL, '+221 77 640 22 54', 'en_attente', '[]'::jsonb, 'RK-063', false, 1, false, false),
('00000000-0000-4000-8000-000000000064', 'MANDABRANDJA', 'Suzanne', NULL, '+221 77 691 10 34', 'en_attente', '[]'::jsonb, 'RK-064', false, 1, false, false),
('00000000-0000-4000-8000-000000000065', 'DJEMBA', 'Suzanne', NULL, '+221 78 390 59 79', 'en_attente', '[]'::jsonb, 'RK-065', false, 1, false, false),
('00000000-0000-4000-8000-000000000066', '', 'Elena', NULL, '+221 78 429 21 65', 'en_attente', '[]'::jsonb, 'RK-066', false, 1, false, false),
('00000000-0000-4000-8000-000000000067', 'LASMOTHEY', 'Roger', NULL, '+221 77 526 99 02', 'en_attente', '[]'::jsonb, 'RK-067', false, 1, false, false),
('00000000-0000-4000-8000-000000000068', 'LASMOTHEY', 'Corine', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-068', false, 1, false, false),
('00000000-0000-4000-8000-000000000069', 'MONI', 'Pierre', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-069', false, 1, false, false),
('00000000-0000-4000-8000-000000000070', 'MONI', 'Audrey', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-070', false, 1, false, false),
('00000000-0000-4000-8000-000000000071', 'SANVEE', 'Yvon', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-071', false, 1, false, false),
('00000000-0000-4000-8000-000000000072', 'SANVEE', 'Marie', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-072', false, 1, false, false),
('00000000-0000-4000-8000-000000000073', 'BOUKAKA', 'Thierry', NULL, '+221 77 263 75 47', 'en_attente', '[]'::jsonb, 'RK-073', false, 1, false, false),
('00000000-0000-4000-8000-000000000074', 'BOUKAKA', 'Claude', NULL, '+221 77 513 19 72', 'en_attente', '[]'::jsonb, 'RK-074', false, 1, false, false),
('00000000-0000-4000-8000-000000000075', 'SEDEGAN', 'Benjamin', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-075', false, 1, false, false),
('00000000-0000-4000-8000-000000000076', 'SELEGAN', 'Erica', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-076', false, 1, false, false),
('00000000-0000-4000-8000-000000000077', 'JIMINIGA', 'Patrick', NULL, '+221 77 156 80 10', 'en_attente', '[]'::jsonb, 'RK-077', false, 1, false, false),
('00000000-0000-4000-8000-000000000078', 'JIMINIGA', 'Grace', NULL, '+221 77 501 72 36', 'en_attente', '[]'::jsonb, 'RK-078', false, 1, false, false),
('00000000-0000-4000-8000-000000000079', '', 'Josita', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-079', false, 1, false, false),
('00000000-0000-4000-8000-000000000080', 'RAZAFI', 'Daniel', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-080', false, 1, false, false),
('00000000-0000-4000-8000-000000000081', 'RAJAONARISON', 'Hanitra', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-081', false, 1, false, false),
('00000000-0000-4000-8000-000000000082', 'FANOU', 'Ginette', NULL, '+254 733 232 255', 'en_attente', '[]'::jsonb, 'RK-082', false, 1, false, false),
('00000000-0000-4000-8000-000000000083', 'FANOU', 'Frederic', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-083', false, 1, false, false),
('00000000-0000-4000-8000-000000000084', 'MITHOU', 'Faith', NULL, '+221 77 484 21 60', 'en_attente', '[]'::jsonb, 'RK-084', false, 1, false, false),
('00000000-0000-4000-8000-000000000085', 'MITHOU', 'Yannick', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-085', false, 1, false, false),
('00000000-0000-4000-8000-000000000086', 'PERGOUROU', 'Baila', NULL, '+221 77 136 51 93', 'en_attente', '[]'::jsonb, 'RK-086', false, 1, false, false),
('00000000-0000-4000-8000-000000000087', 'DOTONOU', 'Monique', NULL, '+221 77 642 21 19', 'en_attente', '[]'::jsonb, 'RK-087', false, 1, false, false),
('00000000-0000-4000-8000-000000000088', 'GNOUNLONFOUN', 'Yvette', NULL, '+221 70 815 13 80', 'en_attente', '[]'::jsonb, 'RK-088', false, 1, false, false),
('00000000-0000-4000-8000-000000000089', 'Kévin', 'Dr', NULL, '+221 77 287 34 87', 'en_attente', '[]'::jsonb, 'RK-089', false, 1, false, false),
('00000000-0000-4000-8000-000000000090', '', 'Freani', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-090', false, 1, false, false),
('00000000-0000-4000-8000-000000000091', 'BALO', 'Elvis', NULL, '+221 78 582 47 03', 'en_attente', '[]'::jsonb, 'RK-091', false, 1, false, false),
('00000000-0000-4000-8000-000000000092', 'MBOKO', 'Axel', NULL, '+221 77 986 17 73', 'en_attente', '[]'::jsonb, 'RK-092', false, 1, false, false),
('00000000-0000-4000-8000-000000000093', 'PAKA NDOKI', 'Koukel', NULL, '+221 77 265 79 70', 'en_attente', '[]'::jsonb, 'RK-093', false, 1, false, false),
('00000000-0000-4000-8000-000000000094', 'MOUANDA', 'Promise', NULL, '+221 77 774 86 73', 'en_attente', '[]'::jsonb, 'RK-094', false, 1, false, false),
('00000000-0000-4000-8000-000000000095', '', 'Ma Joie', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-095', false, 1, false, false),
('00000000-0000-4000-8000-000000000096', '', 'Edem', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-096', false, 1, false, false),
('00000000-0000-4000-8000-000000000097', '', 'Lauren', NULL, '+221 78 229 92 02', 'en_attente', '[]'::jsonb, 'RK-097', false, 1, false, false),
('00000000-0000-4000-8000-000000000098', 'SIO', 'Nicole', NULL, '+221 77 441 67 65', 'en_attente', '[]'::jsonb, 'RK-098', false, 1, false, false),
('00000000-0000-4000-8000-000000000099', 'BONOU', 'Hermium', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-099', false, 1, false, false),
('00000000-0000-4000-8000-000000000100', 'BONOU', 'Mr', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-100', false, 1, false, false),
('00000000-0000-4000-8000-000000000101', '', 'Sorelle', NULL, '+221 77 092 69 59', 'en_attente', '[]'::jsonb, 'RK-101', false, 1, false, false),
('00000000-0000-4000-8000-000000000102', '(Sorelle)', 'Mari', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-102', false, 1, false, false),
('00000000-0000-4000-8000-000000000103', 'KONTI', 'Lune', NULL, '+221 77 440 32 79', 'en_attente', '[]'::jsonb, 'RK-103', false, 1, false, false),
('00000000-0000-4000-8000-000000000104', 'KONTI', 'Mr', NULL, NULL, 'en_attente', '[]'::jsonb, 'RK-104', false, 1, false, false),
('00000000-0000-4000-8000-000000000105', 'MBEMBA', 'Ornella', NULL, '+33 7 45 56 30 05', 'en_attente', '[]'::jsonb, 'RK-105', false, 1, true, true),
('00000000-0000-4000-8000-000000000106', 'KHOUMA', 'Serigne', NULL, '+221 77 996 26 94', 'en_attente', '[]'::jsonb, 'RK-106', false, 1, false, false),
('00000000-0000-4000-8000-000000000107', 'SARHAR H', 'Mme', NULL, '+221 77 248 70 10', 'en_attente', '[]'::jsonb, 'RK-107', false, 1, false, false),
('00000000-0000-4000-8000-000000000108', 'DOUSSOU', 'Chantal', NULL, '+229 95 56 96 00', 'en_attente', '[]'::jsonb, 'RK-108', false, 1, true, true),
('00000000-0000-4000-8000-000000000109', 'MASRO', 'Hans', NULL, '+221 77 742 07 43', 'en_attente', '[]'::jsonb, 'RK-109', false, 1, false, false),
('00000000-0000-4000-8000-000000000110', 'CHIMA', 'Valessa', NULL, '+221 77 932 07 15', 'en_attente', '[]'::jsonb, 'RK-110', false, 1, false, false),
('00000000-0000-4000-8000-000000000111', 'CHIMA', 'Newman', NULL, '+221 77 074 04 03', 'en_attente', '[]'::jsonb, 'RK-111', false, 1, false, false)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  telephone = EXCLUDED.telephone,
  qr_code_uid = EXCLUDED.qr_code_uid,
  navette_requise = EXCLUDED.navette_requise,
  hebergement_requis = EXCLUDED.hebergement_requis;

INSERT INTO photos (id, url, uploaded_by, event_id, caption, statut, likes_count) VALUES
('p1111111-1111-1111-1111-111111111111', '/img/couple-16.jpg', 'Radène & Kévin', 'e1111111-1111-1111-1111-111111111111', 'Complicité et élégance : notre union sous le sceau de la grâce.', 'valide', 58),
('p2222222-2222-2222-2222-222222222222', '/img/couple-15.jpg', 'Radène & Kévin', 'e1111111-1111-1111-1111-111111111111', 'La tradition et la noblesse des tenues royales.', 'valide', 49),
('p3333333-3333-3333-3333-333333333333', '/img/couple-14.jpg', 'Famille & Témoins', 'e3333333-3333-3333-3333-333333333333', 'Un regard qui en dit long sur toute une vie d’amour.', 'valide', 41),
('p4444444-4444-4444-4444-444444444444', '/img/couple-12.jpg', 'Alexandre Dupont', 'e2222222-2222-2222-2222-222222222222', 'Rayonnants sous les éclats dorés de cette belle journée ! 🥂', 'valide', 67),
('p5555555-5555-5555-5555-555555555555', '/img/couple-10.jpg', 'Sophie Laurent', 'e2222222-2222-2222-2222-222222222222', 'La beauté des tenues traditionnelles bleu roi et or.', 'valide', 35),
('p6666666-6666-6666-6666-666666666666', '/img/couple-4.jpg', 'Témoin Julien', 'e3333333-3333-3333-3333-333333333333', 'Moments précieux gravés pour l’éternité ✨', 'valide', 52);

INSERT INTO guestbook (id, guest_name, email, message, emoji, is_pinned) VALUES
('b1111111-1111-1111-1111-111111111111', 'Marie & Jean-Pierre (Parents)', 'parents@example.com', 'Nos cœurs débordent d’émotion en vous voyant si complices et rayonnants devant l’autel de Dieuppeul. Que le Seigneur bénisse votre foyer d’un amour inconditionnel.', '✨', true),
('b2222222-2222-2222-2222-222222222222', 'Alexandre & Camille', 'alexandre.dupont@example.com', 'Quelle grâce et quelle magnificence ! Une cérémonie si émouvante et une soirée royale inoubliable. Longue et sainte vie à votre mariage !', '🥂', false),
('b3333333-3333-3333-3333-333333333333', 'Élodie Martin', 'elodie.martin@example.com', 'Les larmes aux yeux lors de la bénédiction à la Paroisse de Dieuppeul... Pureté, Amour et Charité incarnés à la perfection. Félicitations Radène et Kévin !', '💖', false);

INSERT INTO project_tasks (id, titre, description, assigne_a, priorite, echeance, statut, ordre) VALUES
('k1111111-1111-1111-1111-111111111111', 'Répétition des chants liturgiques à la Paroisse de Dieuppeul', 'Valider les chants d’entrée et de communion avec la chorale paroissiale.', 'Kévin', 'haute', '2026-11-28', 'termine', 1),
('k2222222-2222-2222-2222-222222222222', 'Imprimer les livrets de messe & menus royaux dorés', 'Vérifier le monogramme R & K et les finitions en feuille d’or avant tirage.', 'Radène', 'haute', '2026-11-25', 'en_cours', 2),
('k3333333-3333-3333-3333-333333333333', 'Relance des invités pour confirmation RSVP', 'Utiliser la passerelle de relance automatique Supabase + Resend / Twilio.', 'Témoin Alexandre', 'haute', '2026-11-15', 'en_cours', 3),
('k4444444-4444-4444-4444-444444444444', 'Finaliser la scénographie et les fleurs d’honneur', 'Roses blanches pures, feuillages et rubans dorés.', 'Camille & Sophie', 'moyenne', '2026-12-01', 'a_faire', 4),
('k5555555-5555-5555-5555-555555555555', 'Briefing protocole et test des scanners QR Jour-J', 'Vérifier la fluidité du contrôle d’accès aux entrées.', 'Kévin & Protocole', 'moyenne', '2026-12-04', 'a_faire', 5);

-- 17. ATTRIBUTION RÔLE ADMIN AU COMPTE CRÉÉ
INSERT INTO user_roles (user_id, role)
SELECT id, 'ADMIN' FROM auth.users WHERE email = 'gladinhopoh@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';
