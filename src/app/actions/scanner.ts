'use server';

import { createClient } from '@supabase/supabase-js';
import { GuestItem, TableItem } from '@/lib/database.types';
import { INITIAL_GUESTS, INITIAL_TABLES } from '@/lib/mock-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

function getSupabaseServerClient() {
  if (!supabaseUrl.startsWith('https://')) return null;
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

export interface CheckInResult {
  success: boolean;
  status: 'SUCCESS' | 'ALREADY_CHECKED_IN' | 'NOT_FOUND' | 'DECLINED' | 'ERROR';
  message: string;
  guest?: GuestItem;
  table?: TableItem | null;
  companionGuest?: GuestItem | null;
  companionTable?: TableItem | null;
  isCouple?: boolean;
}

function cleanSearchQuery(raw: string): string {
  let query = (raw || '').trim();
  // If it's a URL, extract code parameter or path
  if (query.includes('code=')) {
    const match = query.match(/code=([^&#\s]+)/i);
    if (match) query = decodeURIComponent(match[1]);
  } else if (query.includes('RK-') || query.includes('rk-')) {
    const match = query.match(/(RK-[A-Za-z0-9]+)/i);
    if (match) query = match[1];
  }
  return query.trim();
}

function matchGuestFromList(rawQuery: string, list: GuestItem[]): GuestItem | null {
  const query = cleanSearchQuery(rawQuery);
  if (!query) return null;

  const q = query.toLowerCase();
  const qDigits = query.replace(/[^\d]/g, '');

  // 1. Exact QR code match
  let found = list.find((g) => g.qr_code_uid && g.qr_code_uid.toLowerCase() === q);
  if (found) return found;

  // 2. Numeric QR code (e.g. '29' or '029' -> 'RK-029')
  if (/^\d+$/.test(q)) {
    const padded = `rk-${q.padStart(3, '0')}`;
    found = list.find(
      (g) => g.qr_code_uid && (g.qr_code_uid.toLowerCase() === padded || g.qr_code_uid.toLowerCase() === `rk-${q}`)
    );
    if (found) return found;
  }

  // 3. Exact full name
  found = list.find(
    (g) =>
      `${g.prenom} ${g.nom}`.trim().toLowerCase() === q ||
      `${g.nom} ${g.prenom}`.trim().toLowerCase() === q
  );
  if (found) return found;

  // 4. Exact prenom or exact nom
  found = list.find((g) => g.prenom.trim().toLowerCase() === q || g.nom.trim().toLowerCase() === q);
  if (found) return found;

  // 5. Starts with name (prenom or nom)
  found = list.find((g) => g.prenom.toLowerCase().startsWith(q) || g.nom.toLowerCase().startsWith(q));
  if (found) return found;

  // 6. Name contains query
  found = list.find(
    (g) =>
      `${g.prenom} ${g.nom}`.toLowerCase().includes(q) ||
      `${g.nom} ${g.prenom}`.toLowerCase().includes(q)
  );
  if (found) return found;

  // 7. Phone digits match
  if (qDigits.length >= 6) {
    found = list.find((g) => {
      if (!g.telephone) return false;
      const phoneDigits = g.telephone.replace(/[^\d]/g, '');
      return phoneDigits.includes(qDigits) || qDigits.includes(phoneDigits);
    });
    if (found) return found;
  }

  return found || null;
}

/**
 * Server Action : Pointage automatique ou manuel de l'invité (et/ou son conjoint) au Jour J
 */
export async function checkInGuestAction(
  searchQueryOrCode: string,
  protocolName: string = 'Protocole Scanner',
  alsoCheckInCompanion: boolean = false
): Promise<CheckInResult> {
  const query = (searchQueryOrCode || '').trim();

  if (!query) {
    return {
      success: false,
      status: 'NOT_FOUND',
      message: 'Code QR ou nom invalide ou vide.',
    };
  }

  const supabase = getSupabaseServerClient();
  let guest: GuestItem | null = null;
  let allGuests: GuestItem[] = [];
  let allTables: TableItem[] = INITIAL_TABLES;

  try {
    if (supabase) {
      const [{ data: guestsData }, { data: tablesData }] = await Promise.all([
        supabase.from('guests').select('*'),
        supabase.from('tables').select('*'),
      ]);
      if (guestsData && guestsData.length > 0) {
        allGuests = guestsData as GuestItem[];
      }
      if (tablesData && tablesData.length > 0) {
        allTables = tablesData as TableItem[];
      }
    }

    if (allGuests.length === 0) {
      allGuests = INITIAL_GUESTS;
    }

    guest = matchGuestFromList(query, allGuests);

    if (!guest) {
      return {
        success: false,
        status: 'NOT_FOUND',
        message: `Aucun invité trouvé pour « ${query} ». Vérifiez le nom ou le code QR.`,
      };
    }

    // Check if RSVP declined
    if (guest.statut_rsvp === 'decline') {
      return {
        success: false,
        status: 'DECLINED',
        message: `${guest.prenom} ${guest.nom} avait décliné l'invitation (Statut : RSVP Décliné).`,
        guest,
      };
    }

    // Fetch assigned table for primary guest
    let table: TableItem | null = null;
    if (guest.table_id) {
      table = allTables.find((t) => t.id === guest?.table_id) || null;
    }

    // Check for companion
    let companionGuest: GuestItem | null = null;
    let companionTable: TableItem | null = null;

    if (guest.companion_id) {
      companionGuest = allGuests.find((g) => g.id === guest?.companion_id) || null;
      if (companionGuest && companionGuest.table_id) {
        companionTable = allTables.find((t) => t.id === companionGuest?.table_id) || null;
      }
    }

    const wasAlreadyCheckedIn = Boolean(guest.checked_in);
    const checkInTime = new Date().toISOString();

    // Perform database check-in update if Supabase available
    if (supabase && guest.id) {
      await supabase
        .from('guests')
        .update({
          checked_in: true,
          checked_in_at: wasAlreadyCheckedIn ? guest.checked_in_at : checkInTime,
          checked_in_by: protocolName,
          updated_at: checkInTime,
        })
        .eq('id', guest.id);

      if (alsoCheckInCompanion && companionGuest && companionGuest.id) {
        const compWasAlready = Boolean(companionGuest.checked_in);
        await supabase
          .from('guests')
          .update({
            checked_in: true,
            checked_in_at: compWasAlready ? companionGuest.checked_in_at : checkInTime,
            checked_in_by: protocolName,
            updated_at: checkInTime,
          })
          .eq('id', companionGuest.id);
      }
    }

    const updatedGuest: GuestItem = {
      ...guest,
      checked_in: true,
      checked_in_at: wasAlreadyCheckedIn ? guest.checked_in_at : checkInTime,
      checked_in_by: protocolName,
    };

    let updatedCompanion: GuestItem | null = companionGuest;
    if (alsoCheckInCompanion && companionGuest) {
      updatedCompanion = {
        ...companionGuest,
        checked_in: true,
        checked_in_at: companionGuest.checked_in_at || checkInTime,
        checked_in_by: protocolName,
      };
    }

    if (wasAlreadyCheckedIn && (!alsoCheckInCompanion || !companionGuest || companionGuest.checked_in)) {
      return {
        success: true,
        status: 'ALREADY_CHECKED_IN',
        message: `Invité déjà pointé précédemment (${
          guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Aujourd\'hui'
        }).`,
        guest: updatedGuest,
        table,
        companionGuest: updatedCompanion,
        companionTable,
        isCouple: Boolean(companionGuest),
      };
    }

    const successMsg = alsoCheckInCompanion && companionGuest
      ? `Bienvenue à ${guest.prenom} et ${companionGuest.prenom} ! Pointage du couple validé avec succès.`
      : `Bienvenue ${guest.prenom} ${guest.nom} ! Pointage validé avec succès.`;

    return {
      success: true,
      status: 'SUCCESS',
      message: successMsg,
      guest: updatedGuest,
      table,
      companionGuest: updatedCompanion,
      companionTable,
      isCouple: Boolean(companionGuest),
    };
  } catch (error: any) {
    console.error('CheckIn Action Exception:', error);
    return {
      success: false,
      status: 'ERROR',
      message: error?.message || 'Erreur inattendue lors du pointage de l’invité.',
    };
  }
}

/**
 * Server Action : Pointage simultané d'un couple (2 personnes)
 */
export async function checkInCoupleAction(
  primaryGuestId: string,
  companionGuestId: string,
  protocolName: string = 'Protocole Scanner'
): Promise<CheckInResult> {
  const supabase = getSupabaseServerClient();
  const checkInTime = new Date().toISOString();

  try {
    let allGuests: GuestItem[] = INITIAL_GUESTS;
    let allTables: TableItem[] = INITIAL_TABLES;

    if (supabase) {
      const [{ data: guestsData }, { data: tablesData }] = await Promise.all([
        supabase.from('guests').select('*'),
        supabase.from('tables').select('*'),
      ]);
      if (guestsData) allGuests = guestsData as GuestItem[];
      if (tablesData) allTables = tablesData as TableItem[];

      await supabase
        .from('guests')
        .update({ checked_in: true, checked_in_at: checkInTime, checked_in_by: protocolName, updated_at: checkInTime })
        .in('id', [primaryGuestId, companionGuestId]);
    }

    const primary = allGuests.find((g) => g.id === primaryGuestId);
    const companion = allGuests.find((g) => g.id === companionGuestId);

    if (!primary) {
      return { success: false, status: 'NOT_FOUND', message: 'Invité principal introuvable.' };
    }

    const updatedPrimary: GuestItem = {
      ...primary,
      checked_in: true,
      checked_in_at: primary.checked_in_at || checkInTime,
      checked_in_by: protocolName,
    };

    const updatedCompanion: GuestItem | null = companion ? {
      ...companion,
      checked_in: true,
      checked_in_at: companion.checked_in_at || checkInTime,
      checked_in_by: protocolName,
    } : null;

    const table = primary.table_id ? allTables.find((t) => t.id === primary.table_id) || null : null;
    const companionTable = companion?.table_id ? allTables.find((t) => t.id === companion.table_id) || null : null;

    return {
      success: true,
      status: 'SUCCESS',
      message: companion
        ? `Pointage validé pour ${primary.prenom} ${primary.nom} & ${companion.prenom} ${companion.nom} !`
        : `Pointage validé pour ${primary.prenom} ${primary.nom} !`,
      guest: updatedPrimary,
      table,
      companionGuest: updatedCompanion,
      companionTable,
      isCouple: Boolean(companion),
    };
  } catch (error: any) {
    return { success: false, status: 'ERROR', message: error?.message || 'Erreur lors du pointage du couple.' };
  }
}
