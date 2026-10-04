'use server';

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { TableItem } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgdoudwqamjxlzawqtkl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZG91ZHdxYW1qeGx6YXdxdGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4MTczMywiZXhwIjoyMTA2MzU3NzMzfQ.ELWyHoxDpnGyYQeOW4VylZcH8raUHlkoXujn97jivjc';

function getSupabaseServerClient() {
  if (!supabaseUrl.startsWith('https://')) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
}

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

export async function getTablesAction(): Promise<{ success: boolean; data: TableItem[]; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { success: false, data: [] };

  try {
    const { data, error } = await supabase.from('tables').select('*');
    if (error) return { success: false, data: [], error: error.message };
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function saveTableAction(table: Partial<TableItem>): Promise<{ success: boolean; data?: TableItem; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { success: false, error: 'Supabase non configuré' };

  try {
    const record: TableItem = {
      id: table.id || generateUUID(),
      nom_numero: table.nom_numero || 'Nouvelle Table',
      capacite: table.capacite || 8,
      forme: table.forme || 'ronde',
      coordonnees_x_y: table.coordonnees_x_y || { x: 300, y: 300, rotation: 0 },
      couleur: table.couleur || '#D4AF37',
      zone: table.zone || 'Zone Principale',
      notes: table.notes || '',
      created_at: table.created_at || new Date().toISOString(),
    };

    const { data, error } = await supabase.from('tables').upsert(record as any).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTableAction(tableId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { success: false, error: 'Supabase non configuré' };

  try {
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
