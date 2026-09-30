'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Utensils,
  AlertTriangle,
  UserPlus,
  Trash2,
  Send,
  Download,
  Calendar,
  MapPin,
  Heart,
  QrCode,
  Search,
  Check,
} from 'lucide-react';
import { weddingStore } from '@/lib/supabase/client';
import { GuestItem, Accompagnant } from '@/lib/database.types';
import { triggerConfetti, generateQrUid } from '@/lib/utils';
import { submitRsvpAction } from '@/app/actions/rsvp';

export const RsvpSection: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [existingGuest, setExistingGuest] = useState<GuestItem | null>(null);

  // Form State
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [statutRsvp, setStatutRsvp] = useState<'confirme' | 'decline' | ''>('confirme');
  const [menuChoisi, setMenuChoisi] = useState('viande_boeuf_rossini');
  const [allergies, setAllergies] = useState('');
  const [accompagnants, setAccompagnants] = useState<Accompagnant[]>([]);
  const [navetteRequise, setNavetteRequise] = useState(false);
  const [hebergementRequis, setHebergementRequis] = useState(false);
  const [messageMaries, setMessageMaries] = useState('');

  // Result State
  const [submittedGuest, setSubmittedGuest] = useState<GuestItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Menu Options
  const menuOptions = [
    {
      id: 'viande_boeuf_rossini',
      title: 'Filet de Bœuf Rossini',
      desc: 'Foie gras poêlé, jus corsé à la truffe noire et écrasé de pommes rattes',
      icon: '🥩',
    },
    {
      id: 'poisson_bar_sauvage',
      title: 'Dos de Bar Sauvage Rôti',
      desc: 'Émulsion au champagne, petits légumes de Provence glacés au thym',
      icon: '🐟',
    },
    {
      id: 'vegetarien_truffe',
      title: 'Risotto Crémeux aux Morilles',
      desc: 'Asperges vertes croquantes, copeaux de truffe d\'été et parmesan 24 mois',
      icon: '🌱',
    },
    {
      id: 'menu_enfant',
      title: 'Menu Enfant Gourmand',
      desc: 'Suprême de volaille croustillant, frites maison et dessert surprise',
      icon: '🧒',
    },
  ];

  // Auto-detect code from URL on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    let codeFromUrl = urlParams.get('code');
    if (!codeFromUrl && window.location.hash.includes('code=')) {
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        codeFromUrl = hashParams.get('code');
      }
    }
    if (codeFromUrl) {
      setSearchQuery(codeFromUrl);
      weddingStore.findGuestByQuery(codeFromUrl).then((found) => {
        if (found) {
          setExistingGuest(found);
          setNom(found.nom);
          setPrenom(found.prenom);
          setEmail(found.email || '');
          setTelephone(found.telephone || '');
          setStatutRsvp(found.statut_rsvp === 'en_attente' ? 'confirme' : (found.statut_rsvp as any));
          if (found.menu_choisi) setMenuChoisi(found.menu_choisi);
          if (found.allergies) setAllergies(found.allergies);
          if (found.accompagnants_json) setAccompagnants(found.accompagnants_json);
          setNavetteRequise(found.navette_requise);
          setHebergementRequis(found.hebergement_requis);
          setMessageMaries(found.message_maries || '');
          setStep(2);
        } else {
          setSearchError(`Le code d'invitation "${codeFromUrl}" est introuvable.`);
        }
      });
    }
  }, []);

  // Search existing guest
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const found = await weddingStore.findGuestByQuery(searchQuery);
      if (found) {
        setExistingGuest(found);
        setNom(found.nom);
        setPrenom(found.prenom);
        setEmail(found.email || '');
        setTelephone(found.telephone || '');
        setStatutRsvp(found.statut_rsvp === 'en_attente' ? 'confirme' : (found.statut_rsvp as any));
        if (found.menu_choisi) setMenuChoisi(found.menu_choisi);
        if (found.allergies) setAllergies(found.allergies);
        if (found.accompagnants_json) setAccompagnants(found.accompagnants_json);
        setNavetteRequise(found.navette_requise);
        setHebergementRequis(found.hebergement_requis);
        setMessageMaries(found.message_maries || '');
        setStep(2);
      } else {
        // Strict RSVP: Only registered guests can confirm
        setSearchError("Aucune invitation trouvée pour cette recherche. Veuillez vérifier l'orthographe de votre prénom et nom ou saisir votre code d'invitation (ex: RK-029). Seuls les invités figurant sur la liste officielle peuvent confirmer.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Add plus one
  const handleAddAccompagnant = () => {
    setAccompagnants([
      ...accompagnants,
      {
        nom: '',
        prenom: '',
        menu: 'viande_boeuf_rossini',
        allergies: '',
        age_category: 'adulte',
      },
    ]);
  };

  const handleUpdateAccompagnant = (index: number, field: keyof Accompagnant, value: string) => {
    const updated = [...accompagnants];
    updated[index] = { ...updated[index], [field]: value };
    setAccompagnants(updated);
  };

  const handleRemoveAccompagnant = (index: number) => {
    setAccompagnants(accompagnants.filter((_, i) => i !== index));
  };

  // Submit RSVP
  const handleSubmit = async () => {
    if (!existingGuest) {
      alert('Veuillez d\'abord retrouver votre invitation officielle sur la liste des invités.');
      setStep(1);
      return;
    }

    if (!nom.trim() || !prenom.trim() || !statutRsvp) {
      alert('Veuillez renseigner votre nom, prénom et votre réponse.');
      return;
    }

    setIsSubmitting(true);
    try {
      const guestData: Partial<GuestItem> = {
        id: existingGuest?.id,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        statut_rsvp: statutRsvp as any,
        menu_choisi: statutRsvp === 'confirme' ? menuChoisi : undefined,
        allergies: allergies.trim() || undefined,
        accompagnants_json: accompagnants,
        navette_requise: navetteRequise,
        hebergement_requis: hebergementRequis,
        message_maries: messageMaries.trim() || undefined,
        qr_code_uid: existingGuest?.qr_code_uid || generateQrUid(),
      };

      // 1. Appel de la Server Action Next.js 14 pour enregistrement et envoi de l'e-mail Resend avec QR Code
      const actionRes = await submitRsvpAction(guestData);

      // 2. Synchronisation avec le store réactif local
      const saved = actionRes.guest || await weddingStore.saveGuest(guestData);
      await weddingStore.saveGuest(saved);

      setSubmittedGuest(saved);
      setStep(5); // Success step
      if (statutRsvp === 'confirme') {
        triggerConfetti();
      }
    } catch (err) {
      console.error('Erreur soumission RSVP:', err);
      // Fallback local
      const saved = await weddingStore.saveGuest({
        id: existingGuest?.id,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        statut_rsvp: statutRsvp as any,
        menu_choisi: statutRsvp === 'confirme' ? menuChoisi : undefined,
        allergies: allergies.trim() || undefined,
        accompagnants_json: accompagnants,
        navette_requise: navetteRequise,
        hebergement_requis: hebergementRequis,
        message_maries: messageMaries.trim() || undefined,
        qr_code_uid: existingGuest?.qr_code_uid || generateQrUid(),
      });
      setSubmittedGuest(saved);
      setStep(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="rsvp" className="py-24 px-4 bg-gradient-to-b from-champagne/30 via-ivory to-champagne/30 dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950 relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gold-100 dark:bg-zinc-800 border border-gold-200 text-gold-800 dark:text-gold-300 text-xs uppercase tracking-widest font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            <span>Réponse Souhaitée avant le 1er Mai 2026</span>
          </div>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl lg:text-6xl text-zinc-900 dark:text-zinc-50 font-normal">
            Confirmez Votre Présence
          </h2>
          <p className="font-serif-luxury italic text-lg text-zinc-600 dark:text-zinc-400 mt-2">
            Votre présence est le plus précieux des cadeaux pour illuminer notre journée.
          </p>
        </div>

        {/* Multi-step Form Card */}
        <div className="glass-card-gold rounded-3xl p-6 sm:p-10 shadow-gold relative">
          {/* Step Indicator */}
          {step < 5 && (
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gold-200/60 text-xs">
              <span className={`font-semibold uppercase tracking-wider ${step === 1 ? 'text-gold-700' : 'text-zinc-400'}`}>
                1. Identification
              </span>
              <span className="text-zinc-300">•</span>
              <span className={`font-semibold uppercase tracking-wider ${step === 2 ? 'text-gold-700' : 'text-zinc-400'}`}>
                2. Présence
              </span>
              <span className="text-zinc-300">•</span>
              <span className={`font-semibold uppercase tracking-wider ${step === 3 ? 'text-gold-700' : 'text-zinc-400'}`}>
                3. Menu & +1
              </span>
              <span className="text-zinc-300">•</span>
              <span className={`font-semibold uppercase tracking-wider ${step === 4 ? 'text-gold-700' : 'text-zinc-400'}`}>
                4. Vœux & Pass
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: Search or Start */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Vérifions votre invitation
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Entrez votre nom, prénom ou votre code invitation (ex: Dupont, RK-A8F29)
                  </p>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchError) setSearchError(null);
                      }}
                      placeholder="Ex: Alexandre Dupont ou RK-029..."
                      className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-6 py-3 rounded-2xl bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSearching ? 'Recherche...' : 'Rechercher'}
                  </button>
                </form>

                {searchError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3 text-left"
                  >
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-rose-800 dark:text-rose-300">Invitation non trouvée</p>
                      <p className="leading-relaxed">{searchError}</p>
                    </div>
                  </motion.div>
                )}

                <div className="p-4 rounded-2xl bg-gold-50/50 dark:bg-zinc-800/40 border border-gold-200/60 text-center text-xs text-zinc-600 dark:text-zinc-400">
                  <p>
                    🔒 <strong>Liste d&apos;invités fermée :</strong> La confirmation de présence est strictement réservée aux personnes figurant sur la liste officielle du mariage.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Coordonnées & Présence */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Vos Coordonnées & Présence
                  </h3>
                  <p className="text-xs text-zinc-500">Étape 1 sur 3</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Votre prénom"
                      className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Nom de Famille *
                    </label>
                    <input
                      type="text"
                      required
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Votre nom"
                      className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Email (pour recevoir votre QR Pass)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre.email@exemple.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Numéro de Téléphone
                    </label>
                    <input
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                </div>

                {/* Présence selection buttons */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3 text-center">
                    Serez-vous présent(e) parmi nous le 20 Juin 2026 ? *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setStatutRsvp('confirme')}
                      className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                        statutRsvp === 'confirme'
                          ? 'border-gold-500 bg-gold-50/80 dark:bg-zinc-800 text-gold-900 dark:text-gold-200 shadow-sm'
                          : 'border-gold-200 bg-white/60 text-zinc-700 hover:border-gold-300'
                      }`}
                    >
                      <CheckCircle2 className={`w-6 h-6 ${statutRsvp === 'confirme' ? 'text-gold-600' : 'text-zinc-400'}`} />
                      <div className="text-left">
                        <div className="font-serif-luxury text-lg font-bold">Oui, avec grand plaisir !</div>
                        <div className="text-xs text-zinc-500">Je serai là pour célébrer</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatutRsvp('decline')}
                      className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                        statutRsvp === 'decline'
                          ? 'border-rose-400 bg-rose-50 dark:bg-zinc-800 text-rose-900 shadow-sm'
                          : 'border-gold-200 bg-white/60 text-zinc-700 hover:border-gold-300'
                      }`}
                    >
                      <XCircle className={`w-6 h-6 ${statutRsvp === 'decline' ? 'text-rose-500' : 'text-zinc-400'}`} />
                      <div className="text-left">
                        <div className="font-serif-luxury text-lg font-bold">Malheureusement non</div>
                        <div className="text-xs text-zinc-500">Je serai là par la pensée</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    ← Retour recherche
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!nom || !prenom) {
                        alert('Veuillez renseigner votre nom et prénom.');
                        return;
                      }
                      if (statutRsvp === 'decline') {
                        setStep(4); // Jump directly to message and submit
                      } else {
                        setStep(3); // Go to menu & +1
                      }
                    }}
                    className="px-8 py-3 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-widest shadow-gold transition-colors"
                  >
                    Continuer →
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Menus Gastronomiques & Accompagnants (+1) */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Choix du Menu & Accompagnants
                  </h3>
                  <p className="text-xs text-zinc-500">Étape 2 sur 3</p>
                </div>

                {/* Primary Guest Menu */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3">
                    Votre choix de plat principal pour le dîner :
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {menuOptions.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => setMenuChoisi(opt.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          menuChoisi === opt.id
                            ? 'border-gold-500 bg-gold-50/90 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                            : 'border-gold-200 bg-white/60 hover:border-gold-300 text-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif-luxury font-bold text-base flex items-center gap-1.5">
                            <span>{opt.icon}</span>
                            <span>{opt.title}</span>
                          </span>
                          {menuChoisi === opt.id && <Check className="w-4 h-4 text-gold-600" />}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allergies */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Régimes particuliers & allergies alimentaires (si applicable) :
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Ex: Sans gluten, allergie aux fruits de mer, arachides..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                {/* Accompagnants / +1s Section */}
                <div className="pt-4 border-t border-gold-200/60">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-serif-luxury text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        Accompagnants (+1 ou Enfants)
                      </h4>
                      <p className="text-xs text-zinc-500">Ajoutez les personnes venant avec vous</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAccompagnant}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-100 dark:bg-zinc-800 text-gold-800 dark:text-gold-200 text-xs font-semibold hover:bg-gold-200 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Ajouter un invité</span>
                    </button>
                  </div>

                  {accompagnants.length === 0 ? (
                    <div className="p-4 rounded-xl bg-gold-50/50 border border-dashed border-gold-200 text-center text-xs text-zinc-500">
                      Vous venez seul(e). Cliquez sur « Ajouter un invité » si vous êtes accompagné(e).
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {accompagnants.map((acc, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-gold-200 space-y-3 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gold-700">
                              Accompagnant #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAccompagnant(index)}
                              className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Prénom de l'accompagnant"
                              value={acc.prenom}
                              onChange={(e) => handleUpdateAccompagnant(index, 'prenom', e.target.value)}
                              className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gold-200 text-xs"
                            />
                            <input
                              type="text"
                              required
                              placeholder="Nom de l'accompagnant"
                              value={acc.nom}
                              onChange={(e) => handleUpdateAccompagnant(index, 'nom', e.target.value)}
                              className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gold-200 text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={acc.menu || 'viande_boeuf_rossini'}
                              onChange={(e) => handleUpdateAccompagnant(index, 'menu', e.target.value)}
                              className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gold-200 text-xs"
                            >
                              <option value="viande_boeuf_rossini">🥩 Filet de Bœuf Rossini</option>
                              <option value="poisson_bar_sauvage">🐟 Dos de Bar Sauvage</option>
                              <option value="vegetarien_truffe">🌱 Risotto aux Morilles & Truffe</option>
                              <option value="menu_enfant">🧒 Menu Enfant</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Allergies éventuelles"
                              value={acc.allergies || ''}
                              onChange={(e) => handleUpdateAccompagnant(index, 'allergies', e.target.value)}
                              className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gold-200 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-8 py-3 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-widest shadow-gold transition-colors"
                  >
                    Continuer →
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Logistique & Vœux */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Logistique & Mots Doux
                  </h3>
                  <p className="text-xs text-zinc-500">Dernière étape avant la validation</p>
                </div>

                {/* Logistique checkboxes if confirmed */}
                {statutRsvp === 'confirme' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-white/70 dark:bg-zinc-800 border border-gold-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={navetteRequise}
                        onChange={(e) => setNavetteRequise(e.target.checked)}
                        className="w-4 h-4 rounded text-gold-600 focus:ring-gold-500 border-gold-300"
                      />
                      <span className="text-xs text-zinc-700 dark:text-zinc-300">
                        🚍 J'aurai besoin du service de navettes de nuit vers les hôtels partenaires
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hebergementRequis}
                        onChange={(e) => setHebergementRequis(e.target.checked)}
                        className="w-4 h-4 rounded text-gold-600 focus:ring-gold-500 border-gold-300"
                      />
                      <span className="text-xs text-zinc-700 dark:text-zinc-300">
                        🏨 Je souhaite réserver une chambre avec le tarif préférentiel mariage
                      </span>
                    </label>
                  </div>
                )}

                {/* Message to Bride & Groom */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Un petit message ou vœu pour Radene & Kevin :
                  </label>
                  <textarea
                    rows={4}
                    value={messageMaries}
                    onChange={(e) => setMessageMaries(e.target.value)}
                    placeholder="Écrivez vos vœux, félicitations ou anecdotes..."
                    className="w-full px-4 py-3 rounded-2xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(statutRsvp === 'decline' ? 2 : 3)}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="px-8 py-3.5 rounded-full bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-600 hover:to-gold-800 text-white font-semibold text-xs uppercase tracking-widest shadow-gold hover:shadow-gold-glow transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Enregistrement...' : 'Valider ma Réponse'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: SUCCESS / CONFIRMATION & QR PASS */}
            {step === 5 && submittedGuest && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-gold-100 dark:bg-zinc-800 text-gold-600 mx-auto flex items-center justify-center border-2 border-gold-400 shadow-gold">
                  <Sparkles className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="font-serif-luxury text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                    Merci {submittedGuest.prenom} !
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 max-w-md mx-auto">
                    {submittedGuest.statut_rsvp === 'confirme'
                      ? 'Votre présence est bien confirmée ! Voici votre Pass d’accès VIP pour le Jour J.'
                      : 'Votre réponse a bien été prise en compte. Merci infiniment pour votre délicatesse.'}
                  </p>
                </div>

                {/* VIP Gold QR Pass Card */}
                {submittedGuest.statut_rsvp === 'confirme' && (
                  <div className="max-w-md mx-auto rounded-3xl p-6 bg-gradient-to-b from-ivory to-gold-50 dark:from-zinc-900 dark:to-zinc-950 border-2 border-gold-400 shadow-gold-glow relative overflow-hidden text-center">
                    {/* Header Monogram */}
                    <div className="flex items-center justify-between border-b border-gold-300 pb-3 mb-4">
                      <span className="font-script-calligraphy text-2xl text-gold-600">R & K</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gold-700 bg-gold-100 px-2.5 py-1 rounded-full">
                        Pass Accès Jour J
                      </span>
                    </div>

                    <div className="my-4 flex justify-center bg-white p-4 rounded-2xl max-w-[200px] mx-auto shadow-inner border border-gold-200">
                      <QRCodeSVG
                        value={submittedGuest.qr_code_uid}
                        size={160}
                        level="H"
                        includeMargin={false}
                        fgColor="#271C0B"
                      />
                    </div>

                    <div className="font-mono text-sm tracking-widest text-gold-800 font-bold mb-3">
                      CODE : {submittedGuest.qr_code_uid}
                    </div>

                    <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p>
                        <strong>{submittedGuest.prenom} {submittedGuest.nom}</strong>
                        {submittedGuest.nombre_invites > 1 && ` (+${submittedGuest.nombre_invites - 1} pers.)`}
                      </p>
                      <p>📍 Eglise Protestante de Dieuppeul &amp; Fun Time • 5 &amp; 6 Déc. 2026</p>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-4 italic">
                      Présentez ce QR Code au protocole d'accueil lors de votre arrivée.
                    </p>
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => {
                      setStep(1);
                      setSubmittedGuest(null);
                      setExistingGuest(null);
                    }}
                    className="px-6 py-2.5 rounded-full border border-gold-300 text-xs uppercase tracking-wider text-gold-800 font-semibold hover:bg-gold-50"
                  >
                    Modifier ma réponse
                  </button>
                  <a
                    href="#programme"
                    className="px-6 py-2.5 rounded-full bg-gold-500 text-white text-xs uppercase tracking-wider font-semibold hover:bg-gold-600 shadow-sm"
                  >
                    Voir le Programme →
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
