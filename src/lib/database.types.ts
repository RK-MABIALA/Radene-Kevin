export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RsvpStatus = 'en_attente' | 'confirme' | 'decline';
export type PhotoStatus = 'en_attente' | 'valide' | 'rejete';
export type TaskStatus = 'a_faire' | 'en_cours' | 'termine';
export type TaskPriority = 'haute' | 'moyenne' | 'basse';
export type TableForm = 'ronde' | 'rectangulaire' | 'ovale';

export interface Accompagnant {
  nom: string;
  prenom: string;
  menu?: string;
  allergies?: string;
  age_category?: 'adulte' | 'enfant' | 'bebe';
}

export interface EventItem {
  id: string;
  nom: string;
  date_heure: string;
  lieu: string;
  adresse?: string;
  coordonnees_gps?: {
    lat: number;
    lng: number;
    maps_url?: string;
  };
  description?: string;
  dress_code?: string;
  icone?: string;
  ordre: number;
  created_at: string;
}

export interface TableItem {
  id: string;
  nom_numero: string;
  capacite: number;
  forme: TableForm;
  coordonnees_x_y: {
    x: number;
    y: number;
    rotation?: number;
  };
  couleur?: string;
  zone?: string;
  notes?: string;
  created_at: string;
}

export interface GuestItem {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  statut_rsvp: RsvpStatus;
  menu_choisi?: string;
  allergies?: string;
  accompagnants_json: Accompagnant[];
  companion_id?: string | null;
  relation_type?: 'conjoint' | 'accompagnant' | 'famille' | 'autre';
  qr_code_uid: string;
  table_id?: string | null;
  table_details?: TableItem;
  checked_in: boolean;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  nombre_invites: number;
  navette_requise: boolean;
  hebergement_requis: boolean;
  message_maries?: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  storage_path?: string;
  uploaded_by: string;
  event_id?: string;
  caption?: string;
  statut: PhotoStatus;
  likes_count: number;
  created_at: string;
}

export interface GuestbookItem {
  id: string;
  guest_name: string;
  email?: string;
  message: string;
  emoji: string;
  is_pinned: boolean;
  created_at: string;
}

export interface ProjectTaskItem {
  id: string;
  titre: string;
  description?: string;
  assigne_a?: string;
  priorite: TaskPriority;
  echeance?: string;
  statut: TaskStatus;
  ordre: number;
  created_at: string;
}

export interface ReminderLogItem {
  id: string;
  guest_id: string;
  guest_name?: string;
  channel: 'email' | 'sms';
  status: 'envoye' | 'echec' | 'en_attente';
  details?: string;
  sent_at: string;
}

export interface Database {
  public: {
    Tables: {
      events: {
        Row: EventItem;
        Insert: Omit<EventItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<EventItem>;
      };
      tables: {
        Row: TableItem;
        Insert: Omit<TableItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<TableItem>;
      };
      guests: {
        Row: GuestItem;
        Insert: Omit<GuestItem, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<GuestItem>;
      };
      photos: {
        Row: PhotoItem;
        Insert: Omit<PhotoItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<PhotoItem>;
      };
      guestbook: {
        Row: GuestbookItem;
        Insert: Omit<GuestbookItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<GuestbookItem>;
      };
      project_tasks: {
        Row: ProjectTaskItem;
        Insert: Omit<ProjectTaskItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<ProjectTaskItem>;
      };
      reminders_log: {
        Row: ReminderLogItem;
        Insert: Omit<ReminderLogItem, 'id' | 'sent_at'> & { id?: string; sent_at?: string };
        Update: Partial<ReminderLogItem>;
      };
    };
  };
}
