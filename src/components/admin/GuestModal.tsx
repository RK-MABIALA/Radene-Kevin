'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Link2, Unlink, Heart, Users, Search, AlertCircle, Check } from 'lucide-react';
import { GuestItem, TableItem } from '@/lib/database.types';
import { generateQrUid } from '@/lib/utils';
import { weddingStore } from '@/lib/supabase/client';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guest: Partial<GuestItem>) => Promise<void>;
  guest?: GuestItem | null;
  tables: TableItem[];
  allGuests?: GuestItem[];
}

export const GuestModal: React.FC<GuestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  guest,
  tables,
  allGuests: initialAllGuests = [],
}) => {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [statutRsvp, setStatutRsvp] = useState<'en_attente' | 'confirme' | 'decline'>('en_attente');
  const [menuChoisi, setMenuChoisi] = useState('viande_boeuf_rossini');
  const [allergies, setAllergies] = useState('');
  const [tableId, setTableId] = useState<string>('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [navetteRequise, setNavetteRequise] = useState(false);
  const [hebergementRequis, setHebergementRequis] = useState(false);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<'conjoint' | 'accompagnant' | 'famille' | 'autre'>('conjoint');
  const [messageMaries, setMessageMaries] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [allGuestsList, setAllGuestsList] = useState<GuestItem[]>(initialAllGuests);
  const [companionSearch, setCompanionSearch] = useState('');
  const [syncTableWithCompanion, setSyncTableWithCompanion] = useState(false);

  useEffect(() => {
    if (isOpen) {
      weddingStore.getGuests().then((list) => {
        setAllGuestsList(list);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (guest) {
      setNom(guest.nom);
      setPrenom(guest.prenom);
      setEmail(guest.email || '');
      setTelephone(guest.telephone || '');
      setStatutRsvp(guest.statut_rsvp);
      setMenuChoisi(guest.menu_choisi || 'viande_boeuf_rossini');
      setAllergies(guest.allergies || '');
      setTableId(guest.table_id || '');
      setCheckedIn(guest.checked_in);
      setNavetteRequise(guest.navette_requise);
      setHebergementRequis(guest.hebergement_requis);
      setCompanionId(guest.companion_id || null);
      setRelationType(guest.relation_type || 'conjoint');
      setMessageMaries(guest.message_maries || '');
      setCompanionSearch('');
      setSyncTableWithCompanion(false);
    } else {
      setNom('');
      setPrenom('');
      setEmail('');
      setTelephone('');
      setStatutRsvp('en_attente');
      setMenuChoisi('viande_boeuf_rossini');
      setAllergies('');
      setTableId('');
      setCheckedIn(false);
      setNavetteRequise(false);
      setHebergementRequis(false);
      setCompanionId(null);
      setRelationType('conjoint');
      setMessageMaries('');
      setCompanionSearch('');
      setSyncTableWithCompanion(false);
    }
  }, [guest, isOpen]);

  if (!isOpen) return null;

  const currentCompanion = companionId
    ? allGuestsList.find((g) => g.id === companionId)
    : null;

  const availableGuestsForLinking = allGuestsList.filter((g) => {
    if (guest && g.id === guest.id) return false;
    if (g.id === companionId) return false;
    if (!companionSearch.trim()) return true;
    const q = companionSearch.toLowerCase();
    return (
      `${g.prenom} ${g.nom}`.toLowerCase().includes(q) ||
      `${g.nom} ${g.prenom}`.toLowerCase().includes(q) ||
      g.qr_code_uid.toLowerCase().includes(q)
    );
  });

  const handleLinkCompanion = (targetGuestId: string) => {
    setCompanionId(targetGuestId);
    setCompanionSearch('');
  };

  const handleUnlinkCompanion = () => {
    setCompanionId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim()) return;

    setIsSaving(true);
    try {
      const targetTableId = tableId || null;

      await onSave({
        id: guest?.id,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        statut_rsvp: statutRsvp,
        menu_choisi: menuChoisi,
        allergies: allergies.trim() || undefined,
        table_id: targetTableId,
        companion_id: companionId,
        relation_type: relationType,
        checked_in: checkedIn,
        navette_requise: navetteRequise,
        hebergement_requis: hebergementRequis,
        accompagnants_json: [],
        message_maries: messageMaries.trim() || undefined,
        qr_code_uid: guest?.qr_code_uid || generateQrUid(),
      });

      // If sync table is checked and companion exists, also update companion's table
      if (companionId && syncTableWithCompanion && targetTableId) {
        await weddingStore.saveGuest({
          id: companionId,
          table_id: targetTableId,
        });
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-gold-300 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {guest ? `Modifier : ${guest.prenom} ${guest.nom}` : 'Ajouter un Nouvel Invité'}
            </h3>
            {guest && (
              <p className="text-xs text-zinc-500 font-mono">Code d'accès : {guest.qr_code_uid}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Nom & Prénom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex: Alexandre"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: DUPONT"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="invite@exemple.com"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Téléphone</label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+221 77 000 00 00"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* RSVP, Table, Menu */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Statut RSVP</label>
              <select
                value={statutRsvp}
                onChange={(e) => setStatutRsvp(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="en_attente">⏳ En attente</option>
                <option value="confirme">✅ Confirmé</option>
                <option value="decline">❌ Décliné</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Table Assignée</label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">(Non assigné)</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom_numero} ({t.capacite}p)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Menu Principal</label>
              <select
                value={menuChoisi}
                onChange={(e) => setMenuChoisi(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="viande_boeuf_rossini">🥩 Bœuf Rossini</option>
                <option value="poisson_bar_sauvage">🐟 Bar Sauvage</option>
                <option value="vegetarien_truffe">🌱 Risotto Truffe</option>
                <option value="menu_enfant">🧒 Menu Enfant</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Allergies & Régimes Spécifiques</label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ex: Sans gluten, fruits de mer, végétalien..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* ========================================================================= */}
          {/* LIAISON CONJOINT / ACCOMPAGNANT OFFICIEL (GESTION PAR L'ADMINISTRATEUR) */}
          {/* ========================================================================= */}
          <div className="pt-3 pb-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-gold-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Liaison Conjoint / Accompagnant Officiel
                </span>
              </div>
              <select
                value={relationType}
                onChange={(e) => setRelationType(e.target.value as any)}
                className="text-[11px] px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-medium"
              >
                <option value="conjoint">💍 Conjoint(e) / Couple</option>
                <option value="accompagnant">👥 Accompagnant(e)</option>
                <option value="famille">🏡 Famille / Enfant</option>
                <option value="autre">✨ Autre lien</option>
              </select>
            </div>

            {currentCompanion ? (
              <div className="p-3.5 rounded-2xl bg-gold-50/80 dark:bg-zinc-800/80 border border-gold-300/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-gold-500/20 text-gold-700 dark:text-gold-300 flex items-center justify-center font-bold text-sm">
                      💍
                    </span>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {currentCompanion.prenom} {currentCompanion.nom}
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                        <span className="font-mono font-bold text-gold-700 dark:text-gold-300">{currentCompanion.qr_code_uid}</span>
                        <span>•</span>
                        <span>{currentCompanion.statut_rsvp === 'confirme' ? '✅ Confirmé' : currentCompanion.statut_rsvp === 'decline' ? '❌ Décliné' : '⏳ En attente'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUnlinkCompanion}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-semibold transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Dissocier</span>
                  </button>
                </div>

                {tableId && (
                  <label className="flex items-center gap-2 pt-1 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncTableWithCompanion}
                      onChange={(e) => setSyncTableWithCompanion(e.target.checked)}
                      className="rounded text-gold-600 focus:ring-gold-500"
                    />
                    <span>Placer également {currentCompanion.prenom} à la même table lors de l'enregistrement</span>
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={companionSearch}
                    onChange={(e) => setCompanionSearch(e.target.value)}
                    placeholder="Rechercher un invité officiel à lier (Nom, Prénom, Code RK)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                {companionSearch.trim().length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-700/60 shadow-sm">
                    {availableGuestsForLinking.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-400">
                        Aucun invité correspondant.
                      </div>
                    ) : (
                      availableGuestsForLinking.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleLinkCompanion(item.id)}
                          className="p-2.5 flex items-center justify-between hover:bg-gold-50 dark:hover:bg-zinc-700/50 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                              {item.qr_code_uid}
                            </span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {item.prenom} {item.nom}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-gold-700 dark:text-gold-300 flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            <span>Lier</span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                  💡 Lier deux invités permet au protocole de pointer le couple complet en scannant l'un des deux Pass QR Code au Jour J.
                </p>
              </div>
            )}
          </div>

          {/* Options additionnelles */}
          <div className="flex items-center gap-6 pt-2 text-xs border-t border-zinc-200 dark:border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedIn}
                onChange={(e) => setCheckedIn(e.target.checked)}
                className="rounded text-gold-600 focus:ring-gold-500"
              />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Pointé au Jour J (Check-in)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={navetteRequise}
                onChange={(e) => setNavetteRequise(e.target.checked)}
                className="rounded text-gold-600 focus:ring-gold-500"
              />
              <span className="text-zinc-700 dark:text-zinc-300">Navette requise</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-semibold uppercase tracking-wider shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
