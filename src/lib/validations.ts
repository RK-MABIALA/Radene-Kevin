import { z } from 'zod';

// Accompagnant schema
export const accompagnantSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  menu: z.string().optional().default('viande_boeuf_rossini'),
  allergies: z.string().optional(),
  age_category: z.enum(['adulte', 'enfant', 'bebe']).default('adulte'),
});

// RSVP multi-step form schema (strict: 1 guest per invitation, no arbitrary +1 creation)
export const rsvpFormSchema = z.object({
  // Étape 1: Identification & Présence
  prenom: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères'),
  nom: z.string().min(2, 'Le nom de famille doit comporter au moins 2 caractères'),
  email: z.string().email('Adresse email invalide').optional().or(z.literal('')),
  telephone: z.string().min(6, 'Numéro de téléphone invalide').optional().or(z.literal('')),
  statut_rsvp: z.enum(['confirme', 'decline', 'en_attente'], {
    required_error: 'Veuillez indiquer votre présence',
  }),

  // Étape 2: Menu & Allergies (si confirmé)
  menu_choisi: z.string().optional(),
  allergies: z.string().optional(),

  // Étape 3: Logistique & Vœux
  navette_requise: z.boolean().default(false),
  hebergement_requis: z.boolean().default(false),
  message_maries: z.string().max(1000, 'Message trop long (max 1000 caractères)').optional(),
});

export type RsvpFormData = z.infer<typeof rsvpFormSchema>;

// Guestbook entry schema
export const guestbookFormSchema = z.object({
  guest_name: z.string().min(2, 'Veuillez saisir votre nom ou signature'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  message: z.string().min(5, 'Votre message doit contenir au moins 5 caractères').max(1500, 'Message trop long'),
  emoji: z.string().default('🥂'),
});

export type GuestbookFormData = z.infer<typeof guestbookFormSchema>;

// Admin Guest Create / Edit schema
export const adminGuestSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional().or(z.literal('')),
  statut_rsvp: z.enum(['en_attente', 'confirme', 'decline']),
  menu_choisi: z.string().optional(),
  allergies: z.string().optional(),
  table_id: z.string().uuid().nullable().optional(),
  companion_id: z.string().uuid().nullable().optional(),
  relation_type: z.enum(['conjoint', 'accompagnant', 'famille', 'autre']).default('conjoint'),
  accompagnants_json: z.array(accompagnantSchema).default([]),
  navette_requise: z.boolean().default(false),
  hebergement_requis: z.boolean().default(false),
  checked_in: z.boolean().default(false),
  message_maries: z.string().optional(),
});

export type AdminGuestFormData = z.infer<typeof adminGuestSchema>;

// Kanban Task Schema
export const projectTaskSchema = z.object({
  titre: z.string().min(3, 'Titre requis (au moins 3 caractères)'),
  description: z.string().optional(),
  assigne_a: z.string().optional(),
  priorite: z.enum(['haute', 'moyenne', 'basse']).default('moyenne'),
  echeance: z.string().optional(),
  statut: z.enum(['a_faire', 'en_cours', 'termine']).default('a_faire'),
});

export type ProjectTaskFormData = z.infer<typeof projectTaskSchema>;

// Table Schema
export const tableSchema = z.object({
  nom_numero: z.string().min(1, 'Nom ou numéro de table requis'),
  capacite: z.number().int().min(1, "La capacité doit être d'au moins 1 place").max(30),
  forme: z.enum(['ronde', 'rectangulaire', 'ovale']).default('ronde'),
  couleur: z.string().default('#B89355'),
  zone: z.string().default('Salle Principale'),
  notes: z.string().optional(),
});

export type TableFormData = z.infer<typeof tableSchema>;
