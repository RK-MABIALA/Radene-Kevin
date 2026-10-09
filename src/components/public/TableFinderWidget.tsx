'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Utensils, Users, MapPin, Sparkles, KeyRound, AlertCircle } from 'lucide-react';
import { TableItem } from '@/lib/database.types';
import { findTableForGuestAction } from '@/app/actions/rsvp';

export const TableFinderWidget: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Result
  const [searchResult, setSearchResult] = useState<{
    guestName: string;
    table: TableItem | null;
    tableMates: Array<{ nom: string; prenom: string }>;
    message?: string;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await findTableForGuestAction({
        code: trimmed,
        nom: trimmed,
      });

      if (res.success) {
        setSearchResult({
          guestName: res.guestName || 'Invité Officiel',
          table: res.table || null,
          tableMates: res.tableMates || [],
          message: res.message,
        });
      } else {
        setSearchError(res.message || "Aucune table trouvée pour cette recherche. Vérifiez votre code d'invitation ou votre nom.");
      }
    } catch {
      setSearchError("Une erreur est survenue lors de la recherche de votre table.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section id="table-finder" className="py-24 px-4 bg-ivory dark:bg-zinc-950 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gold-100 dark:bg-zinc-800 border border-gold-200 text-gold-800 dark:text-gold-300 text-xs uppercase tracking-widest font-semibold mb-3">
            <Utensils className="w-3.5 h-3.5 text-gold-600" />
            <span>Plan de Salle &amp; Placement</span>
          </div>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl lg:text-6xl text-zinc-900 dark:text-zinc-50 font-normal">
            Trouver Ma Table
          </h2>
          <p className="font-serif-luxury italic text-lg text-zinc-600 dark:text-zinc-400 mt-2">
            Entrez votre code d&apos;invitation ou votre nom pour découvrir votre table d&apos;honneur pour la grande soirée de gala.
          </p>
        </div>

        {/* Search Card */}
        <div className="glass-card-gold rounded-3xl p-6 sm:p-10 shadow-gold max-w-2xl mx-auto border border-gold-300/80">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-gold-600" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (searchError) setSearchError(null);
                  }}
                  placeholder="Code d'invitation (ex: RK-046) ou Nom..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="px-6 py-3.5 rounded-2xl bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 shrink-0"
              >
                {isSearching ? 'Recherche...' : 'Trouver ma table'}
              </button>
            </div>

            {searchError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{searchError}</span>
              </motion.div>
            )}
          </form>

          {/* Table Result Display Card */}
          <AnimatePresence>
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-8 pt-6 border-t border-gold-200"
              >
                <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-white to-gold-50/50 dark:from-zinc-900 dark:to-zinc-800 border-2 border-gold-400 shadow-gold text-center relative">
                  <div className="w-12 h-12 rounded-full bg-gold-100 text-gold-600 mx-auto flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>

                  <h3 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {searchResult.guestName}
                  </h3>

                  {searchResult.table ? (
                    <div className="mt-4 space-y-4">
                      <div className="inline-block px-5 py-2 rounded-2xl bg-gold-500 text-white shadow-gold">
                        <span className="text-[10px] uppercase font-bold tracking-widest block opacity-90">
                          Votre Table
                        </span>
                        <span className="font-serif-luxury text-2xl font-bold">
                          {searchResult.table.nom_numero}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gold-600" />
                          <span>Zone : {searchResult.table.zone || 'Salle Principale'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gold-600" />
                          <span>Capacité : {searchResult.table.capacite} personnes</span>
                        </span>
                      </div>

                      {/* Co-seated guests */}
                      {searchResult.tableMates.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gold-200 text-left">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                            À votre table :
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {searchResult.tableMates.map((m, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-full bg-white dark:bg-zinc-800 border border-gold-200 text-xs text-zinc-800 dark:text-zinc-200 font-medium"
                              >
                                {m.prenom} {m.nom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-zinc-800 border border-amber-200 text-amber-800 text-xs leading-relaxed">
                      {searchResult.message ||
                        'Votre placement est en cours de finalisation par les mariés. Renseignez-vous auprès du protocole le jour J !'}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSearchResult(null);
                      setQuery('');
                    }}
                    className="mt-6 text-xs text-zinc-500 hover:text-zinc-800 underline"
                  >
                    Faire une autre recherche
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
