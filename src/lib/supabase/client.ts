import { createBrowserClient } from '@supabase/ssr';
import { Database, GuestItem, PhotoItem, GuestbookItem, ProjectTaskItem, TableItem, EventItem, ReminderLogItem } from '../database.types';
import { INITIAL_EVENTS, INITIAL_GUESTS, INITIAL_GUESTBOOK, INITIAL_PHOTOS, INITIAL_TABLES, INITIAL_TASKS, INITIAL_REMINDERS } from '../mock-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('placeholder-project') && 
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey.includes('placeholder');

export const supabase = isSupabaseConfigured
  ? createBrowserClient<any>(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Generates a valid RFC4122 compliant UUID v4 string
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==============================================================================
// LOCAL REACTIVE STORE (HYBRID SYSTEM: SUPABASE OR LOCALSTORAGE PERSISTENCE)
// ==============================================================================

class WeddingDataStore {
  private static STORAGE_KEY_PREFIX = 'radene_kevin_wedding_';

  private getItem<T>(key: string, initial: T): T {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = localStorage.getItem(WeddingDataStore.STORAGE_KEY_PREFIX + key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return initial;
  }

  private setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(WeddingDataStore.STORAGE_KEY_PREFIX + key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('wedding_data_changed', { detail: { key } }));
    } catch {
      // ignore
    }
  }

  // --- AUTH & ROLES ---
  async getUserRole(userId?: string): Promise<'ADMIN' | 'PROTOCOLE'> {
    if (supabase) {
      try {
        const uid = userId || (await supabase.auth.getUser()).data.user?.id;
        if (uid) {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', uid)
            .single();
          if (!error && data?.role) {
            return data.role as 'ADMIN' | 'PROTOCOLE';
          }
          // Fallback to user metadata
          const { data: userData } = await supabase.auth.getUser();
          const metaRole = userData.user?.user_metadata?.role;
          if (metaRole === 'ADMIN' || metaRole === 'PROTOCOLE') {
            return metaRole;
          }
        }
      } catch (err) {
        console.warn('Supabase getUserRole fallback:', err);
      }
    }
    const localRole = this.getItem<'ADMIN' | 'PROTOCOLE'>('auth_role', 'ADMIN');
    return localRole;
  }

  async setUserRole(role: 'ADMIN' | 'PROTOCOLE'): Promise<void> {
    this.setItem('auth_role', role);
  }

  // --- EVENTS ---
  async getEvents(): Promise<EventItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('events').select('*').order('ordre', { ascending: true });
        if (!error && data && data.length > 0) {
          this.setItem('events', data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase getEvents fallback to local data:', err);
      }
    }
    const local = this.getItem('events', INITIAL_EVENTS);
    if (!local || local.length !== INITIAL_EVENTS.length || local[0]?.date_heure?.includes('15:00')) {
      this.setItem('events', INITIAL_EVENTS);
      return INITIAL_EVENTS;
    }
    return local;
  }

  // --- TABLES ---
  async getTables(): Promise<TableItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tables').select('*');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTables fallback to local data:', err);
      }
    }
    return this.getItem('tables', INITIAL_TABLES);
  }

  async saveTable(table: Partial<TableItem>): Promise<TableItem> {
    const current = await this.getTables();
    let updated: TableItem;
    if (table.id) {
      const existing = current.find(t => t.id === table.id);
      updated = { ...existing, ...table } as TableItem;
      const index = current.findIndex(t => t.id === table.id);
      if (index !== -1) current[index] = updated;
      else current.push(updated);
    } else {
      updated = {
        id: generateUUID(),
        nom_numero: table.nom_numero || 'Nouvelle Table',
        capacite: table.capacite || 8,
        forme: table.forme || 'ronde',
        coordonnees_x_y: table.coordonnees_x_y || { x: 300, y: 300, rotation: 0 },
        couleur: table.couleur || '#D4AF37',
        zone: table.zone || 'Zone Principale',
        notes: table.notes || '',
        created_at: new Date().toISOString(),
      };
      current.push(updated);
    }

    if (supabase) {
      try {
        await supabase.from('tables').upsert(updated as any);
      } catch (err) {
        console.warn('Supabase saveTable sync error:', err);
      }
    }
    this.setItem('tables', current);
    return updated;
  }

  async deleteTable(tableId: string): Promise<void> {
    const current = await this.getTables();
    const filtered = current.filter(t => t.id !== tableId);
    if (supabase) {
      try {
        await supabase.from('tables').delete().eq('id', tableId);
      } catch (err) {
        console.warn('Supabase deleteTable sync error:', err);
      }
    }
    this.setItem('tables', filtered);
  }

  // --- GUESTS ---
  async getGuests(): Promise<GuestItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('guests').select('*').order('nom', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getGuests fallback to local data:', err);
      }
    }
    return this.getItem('guests', INITIAL_GUESTS);
  }

  async findGuestByQuery(rawQuery: string): Promise<GuestItem | null> {
    let query = (rawQuery || '').trim();
    if (!query) return null;

    if (query.includes('code=')) {
      const match = query.match(/code=([^&#\s]+)/i);
      if (match) query = decodeURIComponent(match[1]);
    } else if (query.includes('RK-') || query.includes('rk-')) {
      const match = query.match(/(RK-[A-Za-z0-9]+)/i);
      if (match) query = match[1];
    }

    const q = query.toLowerCase();
    const qDigits = query.replace(/[^\d]/g, '');
    const guests = await this.getGuests();

    // 1. Exact QR code match
    let found = guests.find((g) => g.qr_code_uid && g.qr_code_uid.toLowerCase() === q);
    if (found) return found;

    // 2. Numeric QR code (e.g. '29' or '029' -> 'RK-029')
    if (/^\d+$/.test(q)) {
      const padded = `rk-${q.padStart(3, '0')}`;
      found = guests.find(
        (g) => g.qr_code_uid && (g.qr_code_uid.toLowerCase() === padded || g.qr_code_uid.toLowerCase() === `rk-${q}`)
      );
      if (found) return found;
    }

    // 3. Exact full name
    found = guests.find(
      (g) =>
        `${g.prenom} ${g.nom}`.trim().toLowerCase() === q ||
        `${g.nom} ${g.prenom}`.trim().toLowerCase() === q
    );
    if (found) return found;

    // 4. Exact prenom or exact nom
    found = guests.find((g) => g.prenom.trim().toLowerCase() === q || g.nom.trim().toLowerCase() === q);
    if (found) return found;

    // 5. Starts with name (prenom or nom)
    found = guests.find((g) => g.prenom.toLowerCase().startsWith(q) || g.nom.toLowerCase().startsWith(q));
    if (found) return found;

    // 6. Name contains query
    found = guests.find(
      (g) =>
        `${g.prenom} ${g.nom}`.toLowerCase().includes(q) ||
        `${g.nom} ${g.prenom}`.toLowerCase().includes(q)
    );
    if (found) return found;

    // 7. Phone digits match
    if (qDigits.length >= 6) {
      found = guests.find((g) => {
        if (!g.telephone) return false;
        const phoneDigits = g.telephone.replace(/[^\d]/g, '');
        return phoneDigits.includes(qDigits) || qDigits.includes(phoneDigits);
      });
      if (found) return found;
    }

    // 8. Accompagnants match
    found = guests.find((g) => {
      if (!Array.isArray(g.accompagnants_json)) return false;
      return g.accompagnants_json.some(
        (a) =>
          `${a.prenom} ${a.nom}`.toLowerCase().includes(q) ||
          (a.prenom && a.prenom.toLowerCase().includes(q)) ||
          (a.nom && a.nom.toLowerCase().includes(q))
      );
    });

    return found || null;
  }

  async saveGuest(guest: Partial<GuestItem>): Promise<GuestItem> {
    const guests = await this.getGuests();
    let updated: GuestItem;
    const now = new Date().toISOString();

    const previousGuest = guest.id ? guests.find((g) => g.id === guest.id) : null;
    const previousCompanionId = previousGuest?.companion_id;

    if (guest.id) {
      const existing = guests.find(g => g.id === guest.id);
      updated = {
        ...existing,
        ...guest,
        companion_id: guest.companion_id !== undefined ? guest.companion_id : existing?.companion_id,
        relation_type: guest.relation_type || existing?.relation_type || 'conjoint',
        updated_at: now,
      } as GuestItem;
      const index = guests.findIndex(g => g.id === guest.id);
      if (index !== -1) guests[index] = updated;
      else guests.push(updated);
    } else {
      updated = {
        id: generateUUID(),
        nom: guest.nom || '',
        prenom: guest.prenom || '',
        email: guest.email,
        telephone: guest.telephone,
        statut_rsvp: guest.statut_rsvp || 'en_attente',
        menu_choisi: guest.menu_choisi,
        allergies: guest.allergies,
        companion_id: guest.companion_id || null,
        relation_type: guest.relation_type || 'conjoint',
        accompagnants_json: guest.accompagnants_json || [],
        qr_code_uid: guest.qr_code_uid || `RK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        table_id: guest.table_id || null,
        checked_in: guest.checked_in || false,
        checked_in_at: guest.checked_in_at || null,
        checked_in_by: guest.checked_in_by || null,
        nombre_invites: 1,
        navette_requise: guest.navette_requise || false,
        hebergement_requis: guest.hebergement_requis || false,
        message_maries: guest.message_maries,
        created_at: now,
        updated_at: now,
      };
      guests.push(updated);
    }

    // Handle bidirectional companion linking / unlinking
    const newCompanionId = updated.companion_id;

    // 1. If companion was changed or removed, clear the link on the old companion
    if (previousCompanionId && previousCompanionId !== newCompanionId) {
      const oldComp = guests.find((g) => g.id === previousCompanionId);
      if (oldComp && oldComp.companion_id === updated.id) {
        oldComp.companion_id = null;
        oldComp.updated_at = now;
        if (supabase) {
          try {
            await supabase.from('guests').update({ companion_id: null, updated_at: now } as any).eq('id', oldComp.id);
          } catch (e) {
            console.warn('Supabase unlink previous companion error:', e);
          }
        }
      }
    }

    // 2. If a new companion is linked, establish bidirectional link
    if (newCompanionId) {
      const newComp = guests.find((g) => g.id === newCompanionId);
      if (newComp && newComp.companion_id !== updated.id) {
        newComp.companion_id = updated.id;
        newComp.relation_type = updated.relation_type || 'conjoint';
        newComp.updated_at = now;
        if (supabase) {
          try {
            await supabase.from('guests').update({
              companion_id: updated.id,
              relation_type: newComp.relation_type,
              updated_at: now,
            } as any).eq('id', newComp.id);
          } catch (e) {
            console.warn('Supabase link new companion error:', e);
          }
        }
      }
    }

    if (supabase) {
      try {
        await supabase.from('guests').upsert(updated as any);
      } catch (err) {
        console.warn('Supabase saveGuest sync error:', err);
      }
    }
    this.setItem('guests', guests);
    return updated;
  }

  async linkGuests(guestId1: string, guestId2: string, relationType: 'conjoint' | 'accompagnant' | 'famille' | 'autre' = 'conjoint'): Promise<void> {
    const guests = await this.getGuests();
    const g1 = guests.find((g) => g.id === guestId1);
    const g2 = guests.find((g) => g.id === guestId2);
    if (!g1 || !g2) return;

    const now = new Date().toISOString();
    g1.companion_id = g2.id;
    g1.relation_type = relationType;
    g1.updated_at = now;

    g2.companion_id = g1.id;
    g2.relation_type = relationType;
    g2.updated_at = now;

    if (supabase) {
      try {
        await supabase.from('guests').update({ companion_id: g2.id, relation_type: relationType, updated_at: now } as any).eq('id', g1.id);
        await supabase.from('guests').update({ companion_id: g1.id, relation_type: relationType, updated_at: now } as any).eq('id', g2.id);
      } catch (err) {
        console.warn('Supabase linkGuests error:', err);
      }
    }
    this.setItem('guests', guests);
  }

  async unlinkGuest(guestId: string): Promise<void> {
    const guests = await this.getGuests();
    const g = guests.find((item) => item.id === guestId);
    if (!g) return;

    const now = new Date().toISOString();
    const oldCompanionId = g.companion_id;
    g.companion_id = null;
    g.updated_at = now;

    if (oldCompanionId) {
      const comp = guests.find((item) => item.id === oldCompanionId);
      if (comp) {
        comp.companion_id = null;
        comp.updated_at = now;
        if (supabase) {
          try {
            await supabase.from('guests').update({ companion_id: null, updated_at: now } as any).eq('id', oldCompanionId);
          } catch (e) {}
        }
      }
    }

    if (supabase) {
      try {
        await supabase.from('guests').update({ companion_id: null, updated_at: now } as any).eq('id', guestId);
      } catch (e) {}
    }
    this.setItem('guests', guests);
  }

  async deleteGuest(guestId: string): Promise<void> {
    await this.unlinkGuest(guestId);
    const guests = await this.getGuests();
    const filtered = guests.filter(g => g.id !== guestId);
    if (supabase) {
      try {
        await supabase.from('guests').delete().eq('id', guestId);
      } catch (err) {
        console.warn('Supabase deleteGuest sync error:', err);
      }
    }
    this.setItem('guests', filtered);
  }

  async checkInGuest(guestId: string, checkedInBy: string = 'Protocole Accueil'): Promise<GuestItem | null> {
    const guests = await this.getGuests();
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return null;

    guest.checked_in = true;
    guest.checked_in_at = guest.checked_in_at || new Date().toISOString();
    guest.checked_in_by = checkedInBy;
    guest.updated_at = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('guests').update({
          checked_in: true,
          checked_in_at: guest.checked_in_at,
          checked_in_by: checkedInBy,
          updated_at: guest.updated_at,
        } as any).eq('id', guestId);
      } catch (err) {
        console.warn('Supabase checkInGuest sync error:', err);
      }
    }
    this.setItem('guests', guests);
    return guest;
  }

  async checkInMultipleGuests(guestIds: string[], checkedInBy: string = 'Protocole Accueil'): Promise<GuestItem[]> {
    const guests = await this.getGuests();
    const now = new Date().toISOString();
    const updatedList: GuestItem[] = [];

    for (const id of guestIds) {
      const g = guests.find((item) => item.id === id);
      if (g) {
        g.checked_in = true;
        g.checked_in_at = g.checked_in_at || now;
        g.checked_in_by = checkedInBy;
        g.updated_at = now;
        updatedList.push(g);

        if (supabase) {
          try {
            await supabase.from('guests').update({
              checked_in: true,
              checked_in_at: g.checked_in_at,
              checked_in_by: checkedInBy,
              updated_at: now,
            } as any).eq('id', id);
          } catch (err) {
            console.warn('Supabase checkInMultipleGuests error for id', id, err);
          }
        }
      }
    }

    this.setItem('guests', guests);
    return updatedList;
  }

  // --- PHOTOS ---
  async getPhotos(includePending: boolean = false): Promise<PhotoItem[]> {
    if (supabase) {
      try {
        let query = supabase.from('photos').select('*').order('created_at', { ascending: false });
        if (!includePending) {
          query = query.eq('statut', 'valide');
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getPhotos fallback to local data:', err);
      }
    }
    const local = this.getItem<PhotoItem[]>('photos', INITIAL_PHOTOS);
    return includePending ? local : local.filter(p => p.statut === 'valide');
  }

  async addPhoto(photo: Partial<PhotoItem>): Promise<PhotoItem> {
    const photos = await this.getPhotos(true);
    const newPhoto: PhotoItem = {
      id: generateUUID(),
      url: photo.url || '',
      uploaded_by: photo.uploaded_by || 'Invité Anonyme',
      event_id: photo.event_id || 'e1111111-1111-1111-1111-111111111111',
      caption: photo.caption,
      statut: photo.statut || 'en_attente',
      likes_count: 0,
      created_at: new Date().toISOString(),
    };
    photos.unshift(newPhoto);

    if (supabase) {
      try {
        await supabase.from('photos').insert(newPhoto as any);
      } catch (err) {
        console.warn('Supabase addPhoto sync error:', err);
      }
    }
    this.setItem('photos', photos);
    return newPhoto;
  }

  async updatePhotoStatus(photoId: string, status: 'valide' | 'rejete'): Promise<void> {
    const photos = await this.getPhotos(true);
    const index = photos.findIndex(p => p.id === photoId);
    if (index !== -1) {
      photos[index].statut = status;
      if (supabase) {
        try {
          await supabase.from('photos').update({ statut: status } as any).eq('id', photoId);
        } catch (err) {
          console.warn('Supabase updatePhotoStatus sync error:', err);
        }
      }
      this.setItem('photos', photos);
    }
  }

  // --- GUESTBOOK ---
  async getGuestbook(): Promise<GuestbookItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('guestbook').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getGuestbook fallback to local data:', err);
      }
    }
    return this.getItem('guestbook', INITIAL_GUESTBOOK);
  }

  async addGuestbookEntry(entry: Partial<GuestbookItem>): Promise<GuestbookItem> {
    const items = await this.getGuestbook();
    const newItem: GuestbookItem = {
      id: generateUUID(),
      guest_name: entry.guest_name || 'Invité',
      email: entry.email,
      message: entry.message || '',
      emoji: entry.emoji || '✨',
      is_pinned: false,
      created_at: new Date().toISOString(),
    };
    items.unshift(newItem);

    if (supabase) {
      try {
        await supabase.from('guestbook').insert(newItem as any);
      } catch (err) {
        console.warn('Supabase addGuestbookEntry sync error:', err);
      }
    }
    this.setItem('guestbook', items);
    return newItem;
  }

  // --- TASKS (KANBAN) ---
  async getTasks(): Promise<ProjectTaskItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('project_tasks').select('*').order('ordre', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getTasks fallback to local data:', err);
      }
    }
    return this.getItem('project_tasks', INITIAL_TASKS);
  }

  async saveTask(task: Partial<ProjectTaskItem>): Promise<ProjectTaskItem> {
    const tasks = await this.getTasks();
    let updated: ProjectTaskItem;

    if (task.id) {
      const existing = tasks.find(t => t.id === task.id);
      updated = { ...existing, ...task } as ProjectTaskItem;
      const index = tasks.findIndex(t => t.id === task.id);
      if (index !== -1) tasks[index] = updated;
      else tasks.push(updated);
    } else {
      updated = {
        id: generateUUID(),
        titre: task.titre || 'Nouvelle Tâche',
        description: task.description,
        assigne_a: task.assigne_a,
        priorite: task.priorite || 'moyenne',
        echeance: task.echeance,
        statut: task.statut || 'a_faire',
        ordre: tasks.length + 1,
        created_at: new Date().toISOString(),
      };
      tasks.push(updated);
    }

    if (supabase) {
      try {
        await supabase.from('project_tasks').upsert(updated as any);
      } catch (err) {
        console.warn('Supabase saveTask sync error:', err);
      }
    }
    this.setItem('project_tasks', tasks);
    return updated;
  }

  async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    if (supabase) {
      try {
        await supabase.from('project_tasks').delete().eq('id', taskId);
      } catch (err) {
        console.warn('Supabase deleteTask sync error:', err);
      }
    }
    this.setItem('project_tasks', filtered);
  }

  // --- REMINDERS LOG ---
  async getReminders(): Promise<ReminderLogItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('reminders_log').select('*').order('sent_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getReminders fallback to local data:', err);
      }
    }
    return this.getItem('reminders_log', INITIAL_REMINDERS);
  }

  async sendReminder(guestId: string, channel: 'email' | 'sms', guestName: string): Promise<ReminderLogItem> {
    const logs = await this.getReminders();
    const newLog: ReminderLogItem = {
      id: generateUUID(),
      guest_id: guestId,
      guest_name: guestName,
      channel,
      status: 'envoye',
      details: `Relance ${channel.toUpperCase()} envoyée avec succès à ${guestName}`,
      sent_at: new Date().toISOString(),
    };
    logs.unshift(newLog);

    if (supabase) {
      try {
        await supabase.from('reminders_log').insert(newLog as any);
      } catch (err) {
        console.warn('Supabase sendReminder sync error:', err);
      }
    }
    this.setItem('reminders_log', logs);
    return newLog;
  }
}

export const weddingStore = new WeddingDataStore();
