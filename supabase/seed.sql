-- ==============================================================================
-- SEED DATA - MARIAGE RADENE & KEVIN
-- ==============================================================================

-- 1. EVENEMENTS DU PROGRAMME (Déjà insérés par les migrations si applicable, ici avec les données Dieuppeul)
INSERT INTO events (id, nom, date_heure, lieu, adresse, coordonnees_gps, description, dress_code, icone, ordre)
VALUES
(
    'e1111111-1111-1111-1111-111111111111',
    'Bénédiction nuptiale',
    '2026-12-05T11:00:00+00:00',
    'Eglise Protestante du Sénégal, Paroisse de Dieuppeul',
    'PG8V+XWQ, Dakar',
    '{"lat": 14.7174, "lng": -17.4552, "maps_url": "https://maps.google.com/?q=PG8V%2BXWQ%2C+Dakar"}'::jsonb,
    'Célébration solennelle et échange des consentements sacrés sous la bénédiction divine en présence de nos familles et proches.',
    'Élégance Royale • Nuances Blanc Pur, Or & Bleu Roi',
    'church',
    1
),
(
    'e2222222-2222-2222-2222-222222222222',
    'Soirée de gala',
    '2026-12-05T20:00:00+00:00',
    'Salle de fête Fun Time',
    'PG5R+GC, Dakar',
    '{"lat": 14.7088, "lng": -17.4589, "maps_url": "https://maps.google.com/?q=PG5R%2BGC%2C+Dakar"}'::jsonb,
    'Dîner de gala féerique, banquet d’exception, discours émouvants, ouverture du bal royal et célébration dansante jusqu’au bout de la nuit.',
    'Black Tie / Smoking & Robes Longues de Soirée',
    'sparkles',
    2
),
(
    'e3333333-3333-3333-3333-333333333333',
    'Culte d’action de grâce',
    '2026-12-06T10:00:00+00:00',
    'Eglise Protestante du Sénégal, Paroisse de Dieuppeul',
    'PG8V+XWQ, Dakar',
    '{"lat": 14.7174, "lng": -17.4552, "maps_url": "https://maps.google.com/?q=PG8V%2BXWQ%2C+Dakar"}'::jsonb,
    'Culte d’action de grâce pour rendre gloire à Dieu pour cette sainte union, suivi de moments fraternels de partage et de convivialité.',
    'Chic & Décontracté',
    'sun',
    3
)
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  date_heure = EXCLUDED.date_heure,
  lieu = EXCLUDED.lieu,
  adresse = EXCLUDED.adresse,
  coordonnees_gps = EXCLUDED.coordonnees_gps,
  description = EXCLUDED.description,
  dress_code = EXCLUDED.dress_code,
  icone = EXCLUDED.icone,
  ordre = EXCLUDED.ordre;

-- 2. TABLES (Plan de table 2D)
INSERT INTO tables (id, nom_numero, capacite, forme, coordonnees_x_y, couleur, zone, notes)
VALUES
(
    'a1111111-1111-4111-8111-111111111111',
    'Table d''Honneur - Éternité',
    8,
    'rectangulaire',
    '{"x": 420, "y": 80, "rotation": 0}'::jsonb,
    '#B89355',
    'Estrade Royale',
    'Les Mariés (Radene & Kevin), Parents & Témoins principaux'
),
(
    'a2222222-2222-4222-8222-222222222222',
    'Table 1 - Côte d''Azur',
    8,
    'ronde',
    '{"x": 160, "y": 240, "rotation": 0}'::jsonb,
    '#6E9072',
    'Aile Ouest',
    'Famille Proche & Cousins'
),
(
    'a3333333-3333-4333-8333-333333333333',
    'Table 2 - Riviera Glamour',
    8,
    'ronde',
    '{"x": 420, "y": 270, "rotation": 0}'::jsonb,
    '#CE7C6C',
    'Zone Centrale',
    'Amis d''Enfance et Lycée'
),
(
    'a4444444-4444-4444-8444-444444444444',
    'Table 3 - Belle Époque',
    8,
    'ronde',
    '{"x": 680, "y": 240, "rotation": 0}'::jsonb,
    '#B89355',
    'Aile Est',
    'Amis Promo Promo Université / Grandes Écoles'
),
(
    'a5555555-5555-4555-8555-555555555555',
    'Table 4 - Étoile Filante',
    10,
    'ronde',
    '{"x": 220, "y": 440, "rotation": 0}'::jsonb,
    '#6E9072',
    'Aile Ouest',
    'Collègues & Partenaires'
),
(
    'a6666666-6666-4666-8666-666666666666',
    'Table 5 - Dolce Vita',
    8,
    'ronde',
    '{"x": 620, "y": 440, "rotation": 0}'::jsonb,
    '#CE7C6C',
    'Aile Est',
    'Amis Internationaux & Voisins'
)
ON CONFLICT (id) DO NOTHING;

-- 3. INVITÉS (GUESTS)
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

INSERT INTO photos (id, url, storage_path, uploaded_by, event_id, caption, statut, likes_count, created_at)
VALUES
(
    'c1111111-1111-4111-8111-111111111111',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    'wedding/ceremony_arch.jpg',
    'Radene & Kevin',
    'e1111111-1111-1111-1111-111111111111',
    'L''arche fleurie prête pour le grand moment sous le soleil de Provence.',
    'valide',
    42,
    '2026-06-20T14:10:00+02:00'
),
(
    'c2222222-2222-4222-8222-222222222222',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    'wedding/rings.jpg',
    'Camille D.',
    'e1111111-1111-1111-1111-111111111111',
    'Les alliances dorées gravées de nos initiales.',
    'valide',
    38,
    '2026-06-20T15:30:00+02:00'
),
(
    'c3333333-3333-4333-8333-333333333333',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
    'wedding/table_decor.jpg',
    'Sophie Laurent',
    'e3333333-3333-3333-3333-333333333333',
    'Une table sublimement décorée de chandeliers et d''eucalyptus frais.',
    'valide',
    29,
    '2026-06-20T18:00:00+02:00'
),
(
    'c4444444-4444-4444-8444-444444444444',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    'wedding/champagne_toast.jpg',
    'Alexandre Dupont',
    'e2222222-2222-2222-2222-222222222222',
    'À la santé des mariés ! 🥂',
    'valide',
    56,
    '2026-06-20T18:30:00+02:00'
),
(
    'c5555555-5555-4555-8555-555555555555',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    'wedding/sunset_couple.jpg',
    'Invité Anonyme',
    'e2222222-2222-2222-2222-222222222222',
    'Photo volée au coucher du soleil pendant le cocktail.',
    'en_attente',
    0,
    '2026-06-20T19:15:00+02:00'
)
ON CONFLICT (id) DO NOTHING;

-- 5. LIVRE D'OR (GUESTBOOK)
INSERT INTO guestbook (id, guest_name, email, message, emoji, is_pinned, created_at)
VALUES
(
    'd1111111-1111-4111-8111-111111111111',
    'Marie & Jean-Pierre (Parents)',
    'parents@example.com',
    'Nos cœurs débordent d''émotion en vous voyant si complices et rayonnants. Que cette journée soit le premier chapitre du plus beau des contes de fées.',
    '✨',
    true,
    '2026-06-20T11:00:00+02:00'
),
(
    'd2222222-2222-4222-8222-222222222222',
    'Radene & Kévin',
    'radene.kevin.mariage@example.com',
    'Quelle ambiance inoubliable ! Bravo pour cette organisation magistrale et ce lieu à couper le souffle. Longue vie à votre amour !',
    '🥂',
    false,
    '2026-06-20T19:45:00+02:00'
),
(
    'd3333333-3333-4333-8333-333333333333',
    'Élodie Martin',
    'elodie.martin@example.com',
    'Les larmes aux yeux pendant l''échange de vos vœux... Tout était parfait du début à la fin. Mille mercis pour ce moment suspendu !',
    '💖',
    false,
    '2026-06-20T21:10:00+02:00'
)
ON CONFLICT (id) DO NOTHING;

-- 6. TÂCHES DU KANBAN (PROJECT_TASKS)
INSERT INTO project_tasks (id, titre, description, assigne_a, priorite, echeance, statut, ordre)
VALUES
(
    'f1111111-1111-4111-8111-111111111111',
    'Valider la playlist d''ouverture de bal avec le DJ',
    'Envoyer le medley acoustique & salsa préparé avec la professeure de danse.',
    'Kevin',
    'haute',
    '2026-06-10',
    'termine',
    1
),
(
    'f2222222-2222-4222-8222-222222222222',
    'Imprimer les livrets de messe & menus dorés',
    'Vérifier les épreuves de l''imprimeur à Grasse avant tirage final de 120 exemplaires.',
    'Radene',
    'haute',
    '2026-06-12',
    'en_cours',
    2
),
(
    'f3333333-3333-4333-8333-333333333333',
    'Lancer la relance SMS pour les 25 invités sans réponse',
    'Utiliser le panneau de relance automatique Supabase + Twilio.',
    'Témoin Alexandre',
    'haute',
    '2026-06-05',
    'en_cours',
    3
),
(
    'f4444444-4444-4444-8444-444444444444',
    'Finaliser les cadeaux d''invités (Filtres d''huile d''olive & lavande)',
    'Mise en sachets et étiquettes personnalisées "Radene & Kevin 2026".',
    'Camille & Sophie',
    'moyenne',
    '2026-06-15',
    'a_faire',
    4
),
(
    'f5555555-5555-4555-8555-555555555555',
    'Briefing des hôtesses d''accueil et test des scanners QR',
    'Vérifier que les tablettes iPad et smartphones du protocole ont l''application ouverte.',
    'Kevin & Protocole',
    'moyenne',
    '2026-06-19',
    'a_faire',
    5
)
ON CONFLICT (id) DO NOTHING;
