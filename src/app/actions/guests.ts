'use server';

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { GuestItem } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgdoudwqamjxlzawqtkl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZG91ZHdxYW1qeGx6YXdxdGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4MTczMywiZXhwIjoyMTA2MzU3NzMzfQ.ELWyHoxDpnGyYQeOW4VylZcH8raUHlkoXujn97jivjc';

import { getSupabaseAdminClient as getSupabaseServerClient } from '@/lib/supabase/server';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function sanitizeGuestForDb(guest: Partial<GuestItem>): Promise<Record<string, any>> {
  const baseAccompagnants = Array.isArray(guest.accompagnants_json) ? [...guest.accompagnants_json] : [];
  let accompagnantsJson = baseAccompagnants;

  if (guest.companion_id) {
    const existingCompMeta = accompagnantsJson.find((a: any) => a._meta_type === 'companion_link');
    if (existingCompMeta) {
      existingCompMeta.companion_id = guest.companion_id;
      existingCompMeta.relation_type = guest.relation_type || 'conjoint';
    } else {
      accompagnantsJson = [
        ...accompagnantsJson,
        {
          _meta_type: 'companion_link',
          companion_id: guest.companion_id,
          relation_type: guest.relation_type || 'conjoint',
        },
      ];
    }
  } else {
    accompagnantsJson = accompagnantsJson.filter((a: any) => a._meta_type !== 'companion_link');
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let fallbackQr = 'RK-';
  for (let i = 0; i < 5; i++) fallbackQr += chars.charAt(Math.floor(Math.random() * chars.length));

  const dbRecord: Record<string, any> = {
    id: guest.id || generateUUID(),
    nom: (guest.nom || '').trim(),
    prenom: (guest.prenom || '').trim(),
    email: (guest.email || '').trim() || null,
    telephone: (guest.telephone || '').trim() || null,
    statut_rsvp: guest.statut_rsvp || 'en_attente',
    menu_choisi: guest.menu_choisi || null,
    allergies: (guest.allergies || '').trim() || null,
    accompagnants_json: accompagnantsJson,
    qr_code_uid: guest.qr_code_uid || fallbackQr,
    table_id: guest.table_id || null,
    checked_in: Boolean(guest.checked_in),
    checked_in_at: guest.checked_in_at || null,
    checked_in_by: guest.checked_in_by || null,
    nombre_invites: guest.nombre_invites || (1 + accompagnantsJson.filter((a: any) => a._meta_type !== 'companion_link').length),
    navette_requise: Boolean(guest.navette_requise),
    hebergement_requis: Boolean(guest.hebergement_requis),
    message_maries: (guest.message_maries || '').trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (guest.created_at) {
    dbRecord.created_at = guest.created_at;
  }

  return dbRecord;
}

export async function parseGuestFromDb(row: any): Promise<GuestItem> {
  let companionId = null;
  let relationType = 'conjoint';

  if (row.companion_id) {
    companionId = row.companion_id;
    relationType = row.relation_type || 'conjoint';
  } else if (Array.isArray(row.accompagnants_json)) {
    const compMeta = row.accompagnants_json.find((a: any) => a._meta_type === 'companion_link');
    if (compMeta && compMeta.companion_id) {
      companionId = compMeta.companion_id;
      relationType = compMeta.relation_type || 'conjoint';
    }
  }

  const cleanAccompagnants = Array.isArray(row.accompagnants_json)
    ? row.accompagnants_json.filter((a: any) => a._meta_type !== 'companion_link')
    : [];

  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email || undefined,
    telephone: row.telephone || undefined,
    statut_rsvp: row.statut_rsvp,
    menu_choisi: row.menu_choisi || undefined,
    allergies: row.allergies || undefined,
    accompagnants_json: cleanAccompagnants,
    qr_code_uid: row.qr_code_uid,
    table_id: row.table_id || null,
    checked_in: Boolean(row.checked_in),
    checked_in_at: row.checked_in_at || null,
    checked_in_by: row.checked_in_by || null,
    nombre_invites: row.nombre_invites || 1,
    navette_requise: Boolean(row.navette_requise),
    hebergement_requis: Boolean(row.hebergement_requis),
    message_maries: row.message_maries || undefined,
    companion_id: companionId,
    relation_type: relationType as any,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getGuestsAction(): Promise<{ success: boolean; data: GuestItem[]; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, data: [], error: 'Supabase non configuré' };
  }

  try {
    const { data, error } = await supabase.from('guests').select('*').order('nom', { ascending: true });
    if (error) {
      console.error('getGuestsAction error:', error);
      return { success: false, data: [], error: error.message };
    }
    const parsed = await Promise.all((data || []).map(parseGuestFromDb));
    return { success: true, data: parsed };
  } catch (err: any) {
    console.error('getGuestsAction exception:', err);
    return { success: false, data: [], error: err.message };
  }
}

export async function saveGuestAction(guestData: Partial<GuestItem>): Promise<{ success: boolean; data?: GuestItem; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: 'Supabase non configuré' };
  }

  try {
    const dbPayload = await sanitizeGuestForDb(guestData);
    const { data, error } = await supabase.from('guests').upsert(dbPayload).select().single();

    if (error) {
      console.error('saveGuestAction error:', error);
      return { success: false, error: error.message };
    }

    const parsed = await parseGuestFromDb(data);

    // Sync bidirectional companion linking if needed
    if (guestData.companion_id) {
      const { data: compData } = await supabase.from('guests').select('*').eq('id', guestData.companion_id).single();
      if (compData) {
        const compParsed = await parseGuestFromDb(compData);
        if (compParsed.companion_id !== parsed.id) {
          const compPayload = await sanitizeGuestForDb({
            ...compParsed,
            companion_id: parsed.id,
            relation_type: guestData.relation_type || 'conjoint',
          });
          await supabase.from('guests').upsert(compPayload);
        }
      }
    }

    return { success: true, data: parsed };
  } catch (err: any) {
    console.error('saveGuestAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteGuestAction(guestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: 'Supabase non configuré' };
  }

  try {
    // 1. Check if another guest is linked to this guest as companion and unlink them
    const { data: allGuests } = await supabase.from('guests').select('*');
    if (allGuests) {
      for (const g of allGuests) {
        const parsed = await parseGuestFromDb(g);
        if (parsed.companion_id === guestId) {
          const unlinkedPayload = await sanitizeGuestForDb({
            ...parsed,
            companion_id: null,
          });
          await supabase.from('guests').upsert(unlinkedPayload);
        }
      }
    }

    // 2. Delete the target guest
    const { error } = await supabase.from('guests').delete().eq('id', guestId);
    if (error) {
      console.error('deleteGuestAction error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteGuestAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function checkInGuestAction(
  guestId: string,
  checkedInBy: string = 'Admin Scanner',
  checkedIn: boolean = true
): Promise<{ success: boolean; data?: GuestItem; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: 'Supabase non configuré' };
  }

  try {
    const { data: currentGuest, error: fetchErr } = await supabase.from('guests').select('*').eq('id', guestId).single();
    if (fetchErr || !currentGuest) {
      return { success: false, error: 'Invité introuvable' };
    }

    const parsed = await parseGuestFromDb(currentGuest);
    const updatedPayload = await sanitizeGuestForDb({
      ...parsed,
      checked_in: checkedIn,
      checked_in_at: checkedIn ? new Date().toISOString() : null,
      checked_in_by: checkedIn ? checkedInBy : null,
    });

    const { data: updatedData, error: updateErr } = await supabase.from('guests').upsert(updatedPayload).select().single();
    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    const res = await parseGuestFromDb(updatedData);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function linkGuestsAction(
  guestId1: string,
  guestId2: string,
  relationType: 'conjoint' | 'accompagnant' | 'famille' | 'autre' = 'conjoint'
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { success: false, error: 'Supabase non configuré' };

  try {
    const [res1, res2] = await Promise.all([
      supabase.from('guests').select('*').eq('id', guestId1).single(),
      supabase.from('guests').select('*').eq('id', guestId2).single(),
    ]);

    if (!res1.data || !res2.data) {
      return { success: false, error: 'Un des invités est introuvable' };
    }

    const g1 = await parseGuestFromDb(res1.data);
    const g2 = await parseGuestFromDb(res2.data);

    const payload1 = await sanitizeGuestForDb({ ...g1, companion_id: g2.id, relation_type: relationType });
    const payload2 = await sanitizeGuestForDb({ ...g2, companion_id: g1.id, relation_type: relationType });

    await Promise.all([
      supabase.from('guests').upsert(payload1),
      supabase.from('guests').upsert(payload2),
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function unlinkGuestAction(guestId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { success: false, error: 'Supabase non configuré' };

  try {
    const { data: targetData } = await supabase.from('guests').select('*').eq('id', guestId).single();
    if (!targetData) return { success: false, error: 'Invité introuvable' };

    const target = await parseGuestFromDb(targetData);
    const oldCompId = target.companion_id;

    const payloadTarget = await sanitizeGuestForDb({ ...target, companion_id: null });
    await supabase.from('guests').upsert(payloadTarget);

    if (oldCompId) {
      const { data: compData } = await supabase.from('guests').select('*').eq('id', oldCompId).single();
      if (compData) {
        const comp = await parseGuestFromDb(compData);
        if (comp.companion_id === guestId) {
          const payloadComp = await sanitizeGuestForDb({ ...comp, companion_id: null });
          await supabase.from('guests').upsert(payloadComp);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
