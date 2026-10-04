'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  Utensils,
  AlertCircle,
  ChevronDown,
  MessageCircle,
  Heart,
  Link2,
  Unlink,
} from 'lucide-react';
import { weddingStore } from '@/lib/supabase/client';
import { GuestItem, TableItem, RsvpStatus } from '@/lib/database.types';
import { exportGuestsToCsv, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { GuestModal } from './GuestModal';

export const GuestDataTable: React.FC = () => {
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RsvpStatus | 'checked_in' | 'allergies' | 'couples'>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestItem | null>(null);

  const loadData = async () => {
    const [gList, tList] = await Promise.all([
      weddingStore.getGuests(),
      weddingStore.getTables(),
    ]);
    setGuests(gList);
    setTables(tList);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('wedding_data_changed', loadData);
    return () => window.removeEventListener('wedding_data_changed', loadData);
  }, []);

  const stats = useMemo(() => {
    const totalGuestsCount = guests.length;
    const confirmedCount = guests.filter((g) => g.statut_rsvp === 'confirme').length;
    const pendingCount = guests.filter((g) => g.statut_rsvp === 'en_attente').length;
    const declinedCount = guests.filter((g) => g.statut_rsvp === 'decline').length;
    const checkedInCount = guests.filter((g) => g.checked_in).length;
    const couplesCount = guests.filter((g) => Boolean(g.companion_id)).length / 2;
    const allergiesCount = guests.filter((g) => Boolean(g.allergies && g.allergies.trim())).length;

    return {
      total: totalGuestsCount,
      confirmed: confirmedCount,
      pending: pendingCount,
      declined: declinedCount,
      checkedIn: checkedInCount,
      couples: Math.floor(couplesCount),
      allergies: allergiesCount,
    };
  }, [guests]);

  const guestMap = useMemo(() => {
    const map = new Map<string, GuestItem>();
    guests.forEach((g) => map.set(g.id, g));
    return map;
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      // Find companion if any
      const comp = g.companion_id ? guestMap.get(g.companion_id) : null;

      // Search
      const matchSearch =
        `${g.prenom} ${g.nom}`.toLowerCase().includes(search.toLowerCase()) ||
        (g.email && g.email.toLowerCase().includes(search.toLowerCase())) ||
        (g.telephone && g.telephone.includes(search)) ||
        g.qr_code_uid.toLowerCase().includes(search.toLowerCase()) ||
        (comp && `${comp.prenom} ${comp.nom}`.toLowerCase().includes(search.toLowerCase())) ||
        (comp && comp.qr_code_uid.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      // Status Filter
      if (statusFilter === 'checked_in') {
        if (!g.checked_in) return false;
      } else if (statusFilter === 'allergies') {
        if (!g.allergies || !g.allergies.trim()) return false;
      } else if (statusFilter === 'couples') {
        if (!g.companion_id) return false;
      } else if (statusFilter !== 'all') {
        if (g.statut_rsvp !== statusFilter) return false;
      }

      // Table Filter
      if (tableFilter !== 'all') {
        if (g.table_id !== tableFilter) return false;
      }

      return true;
    });
  }, [guests, search, statusFilter, tableFilter, guestMap]);

  const handleToggleCheckin = async (guest: GuestItem) => {
    try {
      if (guest.checked_in) {
        await weddingStore.saveGuest({
          id: guest.id,
          checked_in: false,
          checked_in_at: null,
        });
        toast.info(`Pointage annulé pour ${guest.prenom} ${guest.nom}`);
      } else {
        await weddingStore.checkInGuest(guest.id, 'Admin Table');
        toast.success(`Pointé avec succès : ${guest.prenom} ${guest.nom}`);
      }
      await loadData();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors du pointage');
    }
  };

  const handleDelete = async (guestId: string, name: string) => {
    if (window.confirm(`Confirmez-vous la suppression de l'invité ${name} ?`)) {
      try {
        await weddingStore.deleteGuest(guestId);
        toast.success(`Invité "${name}" supprimé avec succès`);
        await loadData();
      } catch (e: any) {
        toast.error(e.message || 'Erreur lors de la suppression');
      }
    }
  };

  const getTableName = (tableId?: string | null) => {
    if (!tableId) return 'Non assigné';
    const t = tables.find((item) => item.id === tableId);
    return t ? t.nom_numero : 'Non assigné';
  };

  return (
    <div className="space-y-6">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Total Invités</span>
          <span className="font-serif-luxury text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</span>
          <span className="text-[11px] text-zinc-400 block mt-0.5">Nominatifs</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Confirmés</span>
          <span className="font-serif-luxury text-3xl font-bold text-emerald-800 dark:text-emerald-300">{stats.confirmed}</span>
          <span className="text-[11px] text-emerald-600 block mt-0.5">Présents au Jour J</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-zinc-900 border border-amber-200 dark:border-amber-800/40 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">En Attente</span>
          <span className="font-serif-luxury text-3xl font-bold text-amber-800 dark:text-amber-300">{stats.pending}</span>
          <span className="text-[11px] text-amber-600 block mt-0.5">À relancer</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-zinc-900 border border-purple-200 dark:border-purple-800/40 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">Duos / Couples</span>
          <span className="font-serif-luxury text-3xl font-bold text-purple-800 dark:text-purple-300">{stats.couples}</span>
          <span className="text-[11px] text-purple-600 block mt-0.5">Liens enregistrés</span>
        </div>

        <div className="p-4 rounded-2xl bg-gold-50/70 dark:bg-zinc-900 border border-gold-200 dark:border-gold-800/40 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 dark:text-gold-300 block">Pointés Jour J</span>
          <span className="font-serif-luxury text-3xl font-bold text-gold-900 dark:text-gold-200">{stats.checkedIn}</span>
          <span className="text-[11px] text-gold-700 block mt-0.5">Arrivés sur place</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-zinc-900 border border-rose-200 dark:border-rose-800/40 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">Déclinés</span>
          <span className="font-serif-luxury text-3xl font-bold text-rose-800 dark:text-rose-300">{stats.declined}</span>
          <span className="text-[11px] text-rose-600 block mt-0.5">Absents</span>
        </div>
      </div>

      {/* 2. Controls & Actions Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gold-200/60 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, conjoint, QR..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: `Tous (${guests.length})` },
            { id: 'confirme', label: `Confirmés (${guests.filter((g) => g.statut_rsvp === 'confirme').length})` },
            { id: 'en_attente', label: `En Attente (${guests.filter((g) => g.statut_rsvp === 'en_attente').length})` },
            { id: 'couples', label: `En Couple / Liés (${guests.filter((g) => Boolean(g.companion_id)).length})` },
            { id: 'checked_in', label: `Pointés (${guests.filter((g) => g.checked_in).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all ${
                statusFilter === tab.id
                  ? 'bg-gold-500 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-gold-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => exportGuestsToCsv(guests, tables)}
            className="px-4 py-2 rounded-xl border border-gold-300 bg-white dark:bg-zinc-800 text-gold-800 dark:text-gold-200 hover:bg-gold-50 dark:hover:bg-zinc-700 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingGuest(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-gold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Ajouter un Invité</span>
          </button>
        </div>
      </div>

      {/* 3. Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gold-200/60 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/70 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">Invité</th>
                <th className="py-3.5 px-4">Statut RSVP</th>
                <th className="py-3.5 px-4">Conjoint / Accompagnant Lié</th>
                <th className="py-3.5 px-4">Menu & Allergies</th>
                <th className="py-3.5 px-4">Table</th>
                <th className="py-3.5 px-4">QR Code UID</th>
                <th className="py-3.5 px-4 text-center">Pointage Jour J</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400">
                    Aucun invité ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => {
                  const companion = guest.companion_id ? guestMap.get(guest.companion_id) : null;
                  return (
                    <tr key={guest.id} className="hover:bg-gold-50/30 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* Invité */}
                      <td className="py-3 px-4">
                        <div className="font-serif-luxury text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {guest.prenom} {guest.nom}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {guest.email || 'Pas d\'email'} • {guest.telephone || 'Pas de tél'}
                        </div>
                      </td>

                      {/* Statut RSVP */}
                      <td className="py-3 px-4">
                        {guest.statut_rsvp === 'confirme' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confirmé</span>
                          </span>
                        )}
                        {guest.statut_rsvp === 'en_attente' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            <Clock className="w-3 h-3" />
                            <span>En attente</span>
                          </span>
                        )}
                        {guest.statut_rsvp === 'decline' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                            <XCircle className="w-3 h-3" />
                            <span>Décliné</span>
                          </span>
                        )}
                      </td>

                      {/* Conjoint / Accompagnant Lié */}
                      <td className="py-3 px-4">
                        {companion ? (
                          <div
                            onClick={() => {
                              setEditingGuest(companion);
                              setIsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gold-50 dark:bg-zinc-800 border border-gold-200 dark:border-zinc-700 cursor-pointer hover:bg-gold-100 transition-colors"
                            title="Cliquer pour voir/modifier le conjoint"
                          >
                            <Heart className="w-3 h-3 text-gold-600 fill-gold-600/30" />
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">
                              {companion.prenom} {companion.nom}
                            </span>
                            <span className="font-mono text-[10px] text-gold-700 dark:text-gold-400">
                              ({companion.qr_code_uid})
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingGuest(guest);
                              setIsModalOpen(true);
                            }}
                            className="text-[11px] text-zinc-400 hover:text-gold-700 flex items-center gap-1 transition-colors"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>+ Lier un conjoint</span>
                          </button>
                        )}
                      </td>

                      {/* Menu & Allergies */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 block">
                          {guest.menu_choisi ? guest.menu_choisi.replace(/_/g, ' ') : '—'}
                        </span>
                        {guest.allergies && (
                          <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{guest.allergies}</span>
                          </span>
                        )}
                      </td>

                      {/* Table */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium">
                          {getTableName(guest.table_id)}
                        </span>
                      </td>

                      {/* QR Code UID */}
                      <td className="py-3 px-4 font-mono font-bold text-gold-700 dark:text-gold-300">
                        {guest.qr_code_uid}
                      </td>

                      {/* Check-in */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleCheckin(guest)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            guest.checked_in
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {guest.checked_in ? 'Pointé ✅' : 'Non pointé'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {guest.telephone && (
                            <a
                              href={`https://wa.me/${guest.telephone.replace(/[^\d]/g, '').replace(/^00/, '')}?text=${encodeURIComponent(
                                `✨ *Mariage Radène & Kévin - 5 Décembre 2026*\n\nBonjour *${guest.prenom}* ! Nous avons l'immense joie de vous inviter à célébrer notre mariage à Dakar.\n\n🔑 *Votre Code d'accès :* *${guest.qr_code_uid}*\n🔗 *Confirmez votre présence ici :*\nhttps://radene-kevin.com/#rsvp?code=${encodeURIComponent(guest.qr_code_uid)}\n\nAvec toute notre affection,\n*Radène & Kévin*`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              title={`Envoyer le faire-part WhatsApp à ${guest.prenom}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setEditingGuest(guest);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-zinc-800 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(guest.id, `${guest.prenom} ${guest.nom}`)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Modal */}
      <GuestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (g) => {
          try {
            await weddingStore.saveGuest(g);
            toast.success(editingGuest ? 'Invité mis à jour avec succès' : 'Invité ajouté et enregistré avec succès');
            await loadData();
          } catch (e: any) {
            toast.error(e.message || 'Erreur lors de l\'enregistrement de l\'invité');
          }
        }}
        guest={editingGuest}
        tables={tables}
        allGuests={guests}
      />
    </div>
  );
};
