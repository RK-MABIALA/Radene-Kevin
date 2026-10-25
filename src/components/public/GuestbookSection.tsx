'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Send, Sparkles, Pin, Heart } from 'lucide-react';
import { weddingStore } from '@/lib/supabase/client';
import { GuestbookItem } from '@/lib/database.types';
import { formatDate, triggerConfetti } from '@/lib/utils';

export const GuestbookSection: React.FC = () => {
  const [messages, setMessages] = useState<GuestbookItem[]>([]);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('🥂');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emojis = ['🥂', '✨', '💖', '🕊️', '🌹', '🎉', '💫', '💍'];

  const fetchMessages = async () => {
    const list = await weddingStore.getGuestbook();
    setMessages(list);
  };

  useEffect(() => {
    fetchMessages();
    const handleDataChanged = () => fetchMessages();
    window.addEventListener('wedding_data_changed', handleDataChanged);
    return () => window.removeEventListener('wedding_data_changed', handleDataChanged);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await weddingStore.addGuestbookEntry({
        guest_name: guestName.trim(),
        email: email.trim() || undefined,
        message: message.trim(),
        emoji,
      });

      setMessage('');
      fetchMessages();
      triggerConfetti();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="livredor" className="py-24 px-4 bg-gradient-to-b from-champagne/20 via-ivory to-champagne/20 dark:from-zinc-950 dark:via-zinc-900/20 dark:to-zinc-950 relative">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gold-100 dark:bg-zinc-800 border border-gold-200 text-gold-800 dark:text-gold-300 text-xs uppercase tracking-widest font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5 text-gold-600" />
            <span>Livre d'Or & Mots Doux</span>
          </div>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl lg:text-6xl text-zinc-900 dark:text-zinc-50 font-normal">
            Laissez une Pensée d'Amour
          </h2>
          <p className="font-serif-luxury italic text-lg text-zinc-600 dark:text-zinc-400 mt-2">
            Vos vœux et encouragements seront précieusement conservés dans notre livre d'or numérique.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Card (5 cols) */}
          <div className="lg:col-span-5 glass-card-gold rounded-3xl p-6 sm:p-8 shadow-gold">
            <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-600" />
              <span>Votre Message</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Votre Nom ou Signature *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Radène ou Kevin MABIALA"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Email (facultatif)
                </label>
                <input
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              {/* Emoji selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                  Choisissez une émotion :
                </label>
                <div className="flex gap-2 flex-wrap">
                  {emojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`text-xl p-2 rounded-xl transition-all ${emoji === em ? 'bg-gold-500/20 scale-125 border border-gold-400' : 'hover:bg-gold-50'
                        }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Votre Vœu pour les Mariés *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Que votre amour brille chaque jour comme au premier instant..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 hover:from-gold-600 hover:to-gold-800 text-white font-semibold text-xs uppercase tracking-widest shadow-gold hover:shadow-gold-glow transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Publication...' : 'Publier mon vœu'}</span>
              </button>
            </form>
          </div>

          {/* Messages Feed (7 cols) */}
          <div className="lg:col-span-7 space-y-4 max-h-[620px] overflow-y-auto pr-2">
            {messages.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card-gold rounded-3xl p-6 relative transition-all ${item.is_pinned ? 'border-2 border-gold-500 bg-gold-50/60 dark:bg-zinc-800' : ''
                  }`}
              >
                {item.is_pinned && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gold-700 bg-gold-200/80 px-2 py-0.5 rounded-full">
                    <Pin className="w-3 h-3 text-gold-600" />
                    <span>Épinglé</span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{item.emoji || '🥂'}</span>
                  <div>
                    <h4 className="font-serif-luxury font-bold text-lg text-zinc-900 dark:text-zinc-100">
                      {item.guest_name}
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      {formatDate(item.created_at, 'full')}
                    </span>
                  </div>
                </div>

                <p className="font-serif-luxury text-zinc-700 dark:text-zinc-300 text-base italic leading-relaxed pl-9">
                  « {item.message} »
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
