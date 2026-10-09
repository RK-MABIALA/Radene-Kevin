'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertTriangle,
  Send,
  Calendar,
  MapPin,
  Heart,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Search,
  Download,
  Share2,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import { GuestItem } from '@/lib/database.types';
import { triggerConfetti } from '@/lib/utils';
import { verifyGuestInvitationAction, submitRsvpAction } from '@/app/actions/rsvp';

export const RsvpSection: React.FC = () => {
  const [step, setStep] = useState<number>(1);

  // Identification State (Strict & Confidential)
  const [searchMode, setSearchMode] = useState<'code' | 'identity'>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [searchNom, setSearchNom] = useState('');
  const [searchPrenom, setSearchPrenom] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Verified Guest & Companion
  const [existingGuest, setExistingGuest] = useState<GuestItem | null>(null);
  const [linkedCompanion, setLinkedCompanion] = useState<{
    id: string;
    nom: string;
    prenom: string;
    relation_type?: string;
    statut_rsvp?: string;
    qr_code_uid?: string;
  } | null>(null);

  // Form State
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [statutRsvp, setStatutRsvp] = useState<'confirme' | 'decline' | ''>('confirme');
  const [allergies, setAllergies] = useState('');
  const [navetteRequise, setNavetteRequise] = useState(false);
  const [hebergementRequis, setHebergementRequis] = useState(false);
  const [messageMaries, setMessageMaries] = useState('');

  // Result & Pass Download State
  const [submittedGuest, setSubmittedGuest] = useState<GuestItem | null>(null);
  const [isReturningGuest, setIsReturningGuest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  const applyFoundGuest = (found: GuestItem, companion: any) => {
    setExistingGuest(found);
    setNom(found.nom);
    setPrenom(found.prenom);
    setEmail(found.email || '');
    setTelephone(found.telephone || '');
    setStatutRsvp(found.statut_rsvp === 'en_attente' ? 'confirme' : (found.statut_rsvp as any));
    if (found.allergies) setAllergies(found.allergies);
    setNavetteRequise(Boolean(found.navette_requise));
    setHebergementRequis(Boolean(found.hebergement_requis));
    setMessageMaries(found.message_maries || '');
    setLinkedCompanion(companion || null);
    setSearchError(null);

    // Si l'invité a DÉJÀ confirmé sa présence, on l'amène directement sur son Pass QR pour qu'il puisse le voir et le télécharger immédiatement !
    if (found.statut_rsvp === 'confirme') {
      setSubmittedGuest(found);
      setIsReturningGuest(true);
      setStep(4);
    } else {
      setIsReturningGuest(false);
      setStep(2);
    }
  };

  // Auto-detect code from URL on load (ex: ?code=RK-046)
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
      setInviteCode(codeFromUrl);
      setIsSearching(true);
      verifyGuestInvitationAction({ code: codeFromUrl })
        .then((res) => {
          if (res.success && res.guest) {
            applyFoundGuest(res.guest, res.companion);
          } else {
            setSearchError(res.message || `Le code d'invitation "${codeFromUrl}" est introuvable.`);
          }
        })
        .finally(() => setIsSearching(false));
    }
  }, []);

  // Search by personal invite code
  const handleCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      setSearchError("Veuillez saisir votre code d'invitation.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await verifyGuestInvitationAction({ code: trimmed });
      if (res.success && res.guest) {
        applyFoundGuest(res.guest, res.companion);
      } else {
        setSearchError(res.message || "Invitation introuvable. Veuillez vérifier votre code.");
      }
    } catch {
      setSearchError("Une erreur est survenue lors de la vérification.");
    } finally {
      setIsSearching(false);
    }
  };

  // Search by identity (Nom + Prénom + Téléphone)
  const handleIdentitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNom.trim() || !searchPrenom.trim()) {
      setSearchError("Veuillez renseigner votre Nom et votre Prénom.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await verifyGuestInvitationAction({
        nom: searchNom.trim(),
        prenom: searchPrenom.trim(),
        telephone: searchPhone.trim() || undefined,
      });

      if (res.success && res.guest) {
        applyFoundGuest(res.guest, res.companion);
      } else {
        setSearchError(res.message || "Aucune invitation correspondante n'a été trouvée.");
      }
    } catch {
      setSearchError("Une erreur est survenue lors de la recherche.");
    } finally {
      setIsSearching(false);
    }
  };

  // Submit RSVP
  const handleSubmit = async () => {
    if (!existingGuest) {
      alert("Veuillez d'abord déverrouiller votre invitation officielle avec votre code d'invitation.");
      setStep(1);
      return;
    }

    if (!statutRsvp) {
      alert('Veuillez indiquer si vous serez présent(e) ou non.');
      return;
    }

    setIsSubmitting(true);
    try {
      const guestData: Partial<GuestItem> = {
        id: existingGuest.id,
        nom: existingGuest.nom,
        prenom: existingGuest.prenom,
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        statut_rsvp: statutRsvp as any,
        allergies: allergies.trim() || undefined,
        companion_id: existingGuest.companion_id,
        relation_type: existingGuest.relation_type,
        accompagnants_json: [],
        navette_requise: navetteRequise,
        hebergement_requis: hebergementRequis,
        message_maries: messageMaries.trim() || undefined,
        qr_code_uid: existingGuest.qr_code_uid,
      };

      const actionRes = await submitRsvpAction(guestData);

      if (!actionRes.success || !actionRes.guest) {
        alert(actionRes.message || "Une erreur est survenue lors de l'enregistrement.");
        return;
      }

      setSubmittedGuest(actionRes.guest);
      setIsReturningGuest(false);
      setStep(4);
      if (statutRsvp === 'confirme') {
        triggerConfetti();
      }
    } catch (err) {
      console.error('Erreur soumission RSVP:', err);
      alert("Une erreur technique s'est produite lors de l'enregistrement de votre réponse.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // High-Resolution VIP Pass Canvas Generator & Downloader
  const generatePassDataUrl = async (guest: GuestItem, companionName?: string): Promise<string> => {
    const qrDataUrl = await QRCode.toDataURL(guest.qr_code_uid, {
      width: 320,
      margin: 1,
      color: { dark: '#1E140A', light: '#FFFFFF' },
    });

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1120;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas non disponible');

    // Support roundRect fallback
    const roundRectPoly = (x: number, y: number, w: number, h: number, r: number) => {
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
    };

    // 1. Fond luxueux ivoire avec dégradé royal
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#FAF7F0');
    grad.addColorStop(0.5, '#FFFFFF');
    grad.addColorStop(1, '#F4EDE0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Double cadre or raffiné
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    ctx.strokeStyle = '#DFCA9F';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

    // 3. Ornements de coin (losanges dorés)
    const drawDiamond = (x: number, y: number, s: number) => {
      ctx.fillStyle = '#C5A059';
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s, y);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(34, 34, 6);
    drawDiamond(canvas.width - 34, 34, 6);
    drawDiamond(34, canvas.height - 34, 6);
    drawDiamond(canvas.width - 34, canvas.height - 34, 6);

    // 4. En-tête : Noms des mariés
    ctx.fillStyle = '#C5A059';
    ctx.font = 'italic 52px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Radène & Kévin', canvas.width / 2, 110);

    ctx.fillStyle = '#8C6B32';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('CÉLÉBRATION SACRÉE • SAMEDI 5 DÉCEMBRE 2026', canvas.width / 2, 145);

    // 5. Badge doré : PASS D'ACCÈS JOUR J
    const badgeWidth = 320;
    const badgeHeight = 36;
    const badgeX = (canvas.width - badgeWidth) / 2;
    const badgeY = 175;
    ctx.fillStyle = '#C5A059';
    ctx.beginPath();
    roundRectPoly(badgeX, badgeY, badgeWidth, badgeHeight, 18);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PASS D’ACCÈS OFFICIEL JOUR-J', canvas.width / 2, badgeY + 23);

    // 6. Cadre blanc avec ombre pour le QR code
    const cardW = 380;
    const cardH = 380;
    const cardX = (canvas.width - cardW) / 2;
    const cardY = 240;

    ctx.shadowColor = 'rgba(197, 160, 89, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    roundRectPoly(cardX, cardY, cardW, cardH, 24);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#E8D8BF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 7. Dessin de l'image QR Code
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, cardX + 30, cardY + 30, 320, 320);
        resolve();
      };
      img.onerror = reject;
      img.src = qrDataUrl;
    });

    // 8. Code d'invitation (monospace doré)
    ctx.fillStyle = '#7E5E2E';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`CODE : ${guest.qr_code_uid}`, canvas.width / 2, 665);

    // Séparateur fin
    ctx.strokeStyle = '#DFCA9F';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150, 700);
    ctx.lineTo(canvas.width - 150, 700);
    ctx.stroke();

    // 9. Informations Invité
    ctx.fillStyle = '#1E140A';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText(`${guest.prenom} ${guest.nom}`, canvas.width / 2, 750);

    if (companionName) {
      ctx.fillStyle = '#8C6B32';
      ctx.font = '500 16px sans-serif';
      ctx.fillText(`💍 Duo officiel avec ${companionName}`, canvas.width / 2, 785);
    }

    // 10. Lieux et horaires
    const startLocY = companionName ? 825 : 805;
    ctx.fillStyle = '#4A3B28';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('⛪ 11h00 : Bénédiction Nuptiale • Paroisse de Dieuppeul', canvas.width / 2, startLocY);
    ctx.fillText('🥂 20h00 : Soirée de Gala & Banquet • Fun Time', canvas.width / 2, startLocY + 28);

    ctx.fillStyle = '#8C6B32';
    ctx.font = '13px sans-serif';
    ctx.fillText('Dakar, Sénégal', canvas.width / 2, startLocY + 54);

    // 11. Instructions bas de page
    ctx.fillStyle = '#7A6852';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('Présentez ce QR Code au protocole d’accueil lors de votre arrivée.', canvas.width / 2, 990);

    ctx.fillStyle = '#C5A059';
    ctx.font = '11px sans-serif';
    ctx.fillText('radene-kevin.com', canvas.width / 2, 1040);

    return canvas.toDataURL('image/png');
  };

  const handleDownloadPass = async () => {
    if (!submittedGuest) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const compName = linkedCompanion ? `${linkedCompanion.prenom} ${linkedCompanion.nom}` : undefined;
      const dataUrl = await generatePassDataUrl(submittedGuest, compName);

      const link = document.createElement('a');
      link.download = `Pass-Acces-Mariage-Radene-Kevin-${submittedGuest.prenom}-${submittedGuest.nom}-${submittedGuest.qr_code_uid}.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Erreur téléchargement Pass:', err);
      // Fallback simple QR code download
      try {
        const qrUrl = await QRCode.toDataURL(submittedGuest.qr_code_uid, { width: 500, margin: 1 });
        const link = document.createElement('a');
        link.download = `QR-Pass-${submittedGuest.qr_code_uid}.png`;
        link.href = qrUrl;
        link.click();
        setDownloadSuccess(true);
      } catch {
        alert("Erreur lors de la génération de l'image. N'hésitez pas à faire une capture d'écran de votre QR Code.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSharePass = async () => {
    if (!submittedGuest) return;
    try {
      const compName = linkedCompanion ? `${linkedCompanion.prenom} ${linkedCompanion.nom}` : undefined;
      const dataUrl = await generatePassDataUrl(submittedGuest, compName);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `Pass-Acces-${submittedGuest.qr_code_uid}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Pass d’accès — Mariage Radène & Kévin',
          text: `Voici mon Pass d’accès officiel pour le mariage de Radène & Kévin le Samedi 5 Décembre 2026 à Dakar (Code: ${submittedGuest.qr_code_uid}).`,
          files: [file],
        });
      } else {
        handleDownloadPass();
      }
    } catch {
      handleDownloadPass();
    }
  };

  return (
    <section id="rsvp" className="py-24 px-4 bg-gradient-to-b from-champagne/30 via-ivory to-champagne/30 dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950 relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-100 dark:bg-zinc-800 border border-gold-300 text-gold-900 dark:text-gold-300 text-xs uppercase tracking-widest font-semibold mb-4 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-gold-600" />
            <span>Espace Privé des Invités Officiels</span>
          </div>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl lg:text-6xl text-zinc-900 dark:text-zinc-50 font-normal">
            Confirmez Votre Présence
          </h2>
          <p className="font-serif-luxury italic text-lg text-zinc-600 dark:text-zinc-400 mt-2">
            Votre présence est le plus précieux des cadeaux pour illuminer notre journée.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gold-700 dark:text-gold-400 font-semibold tracking-wider uppercase">
            <Calendar className="w-4 h-4" />
            <span>Réponse Souhaitée avant le 5 Novembre 2026</span>
          </div>
        </div>

        {/* Wizard Form Card */}
        <div className="glass-card-gold rounded-3xl p-6 sm:p-10 shadow-gold border border-gold-300/80 dark:border-zinc-800">
          {/* Stepper Progress */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 text-[11px] sm:text-xs">
              <span className={`font-semibold uppercase tracking-wider ${step === 1 ? 'text-gold-700 font-bold' : 'text-zinc-400'}`}>
                1. Identification
              </span>
              <span className="text-zinc-300">•</span>
              <span className={`font-semibold uppercase tracking-wider ${step === 2 ? 'text-gold-700 font-bold' : 'text-zinc-400'}`}>
                2. Présence
              </span>
              <span className="text-zinc-300">•</span>
              <span className={`font-semibold uppercase tracking-wider ${step === 3 ? 'text-gold-700 font-bold' : 'text-zinc-400'}`}>
                3. Logistique &amp; Vœux
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: Secure Identification */}
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
                    Accédez à votre invitation
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
                    Saisissez votre code personnel d&apos;invitation pour confirmer votre présence ou retrouver et télécharger votre Pass d&apos;accès Jour J.
                  </p>
                </div>

                {/* Tabs Mode */}
                <div className="flex justify-center border-b border-gold-200 dark:border-zinc-800 pb-3">
                  <div className="inline-flex rounded-xl bg-gold-50/80 dark:bg-zinc-800 p-1 border border-gold-200 dark:border-zinc-700 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchMode('code');
                        setSearchError(null);
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        searchMode === 'code'
                          ? 'bg-gold-500 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      Avec mon Code d&apos;invitation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchMode('identity');
                        setSearchError(null);
                      }}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        searchMode === 'identity'
                          ? 'bg-gold-500 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                    >
                      Recherche par Nom &amp; Téléphone
                    </button>
                  </div>
                </div>

                {/* Mode A : Par Code */}
                {searchMode === 'code' && (
                  <form onSubmit={handleCodeSearch} className="space-y-4 max-w-md mx-auto">
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-gold-600" />
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value);
                          if (searchError) setSearchError(null);
                        }}
                        placeholder="Ex: RK-046 ou RK-029..."
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-gold-300 text-zinc-900 dark:text-zinc-100 font-mono text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-gold-500 shadow-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSearching || !inviteCode.trim()}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-semibold text-xs uppercase tracking-widest transition-all shadow-gold hover:shadow-gold-glow disabled:opacity-50"
                    >
                      {isSearching ? 'Vérification en cours...' : 'Vérifier mon invitation →'}
                    </button>

                    <p className="text-[11px] text-center text-zinc-500 dark:text-zinc-400 italic">
                      💡 Votre code figure sur votre faire-part ou dans votre message d&apos;invitation WhatsApp. Si vous avez déjà confirmé, vous accéderez directement à votre Pass QR.
                    </p>
                  </form>
                )}

                {/* Mode B : Par Nom & Téléphone */}
                {searchMode === 'identity' && (
                  <form onSubmit={handleIdentitySearch} className="space-y-4 max-w-md mx-auto">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                          Prénom *
                        </label>
                        <input
                          type="text"
                          required
                          value={searchPrenom}
                          onChange={(e) => {
                            setSearchPrenom(e.target.value);
                            if (searchError) setSearchError(null);
                          }}
                          placeholder="Votre prénom officiel"
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                          Nom de famille *
                        </label>
                        <input
                          type="text"
                          required
                          value={searchNom}
                          onChange={(e) => {
                            setSearchNom(e.target.value);
                            if (searchError) setSearchError(null);
                          }}
                          placeholder="Votre nom de famille"
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                          Numéro de Téléphone (pour vérification)
                        </label>
                        <input
                          type="tel"
                          value={searchPhone}
                          onChange={(e) => {
                            setSearchPhone(e.target.value);
                            if (searchError) setSearchError(null);
                          }}
                          placeholder="Ex: +221 77 123 45 67 ou 06..."
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSearching || !searchNom.trim() || !searchPrenom.trim()}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-semibold text-xs uppercase tracking-widest transition-all shadow-gold hover:shadow-gold-glow disabled:opacity-50"
                    >
                      {isSearching ? 'Recherche sécurisée...' : 'Retrouver mon invitation →'}
                    </button>
                  </form>
                )}

                {/* Error Banner */}
                {searchError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3 text-left max-w-md mx-auto"
                  >
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-rose-800 dark:text-rose-300">Invitation non validée</p>
                      <p className="leading-relaxed">{searchError}</p>
                    </div>
                  </motion.div>
                )}

                <div className="p-4 rounded-2xl bg-gold-50/50 dark:bg-zinc-800/40 border border-gold-200/60 text-center text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                  <p>
                    🔒 <strong>Accès Protégé :</strong> Seules les personnes détentrices de leur code officiel ou enregistrées sur la liste des mariés peuvent confirmer ou décliner leur présence.
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
                {/* Verified Guest Header Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-gold-50 via-champagne/40 to-gold-50 dark:from-zinc-900 dark:to-zinc-850 border border-gold-300 dark:border-gold-700/60 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gold-100 dark:bg-zinc-800 text-gold-700 dark:text-gold-300 flex items-center justify-center font-serif-luxury font-bold text-lg border border-gold-200 shadow-inner">
                      {prenom.charAt(0)}{nom.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gold-800 dark:text-gold-300 bg-gold-200/70 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                          Invitation Officielle
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500 font-bold">
                          {existingGuest?.qr_code_uid}
                        </span>
                      </div>
                      <p className="font-serif-luxury text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {prenom} {nom}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExistingGuest(null);
                      setLinkedCompanion(null);
                      setStep(1);
                    }}
                    className="text-xs text-gold-700 dark:text-gold-400 hover:underline font-semibold"
                  >
                    Changer
                  </button>
                </div>

                {/* Quick shortcut if already confirmed */}
                {existingGuest?.statut_rsvp === 'confirme' && (
                  <div className="p-3.5 rounded-2xl bg-gold-50/90 dark:bg-zinc-800 border border-gold-300 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
                    <div className="text-xs text-gold-900 dark:text-gold-200 text-center sm:text-left">
                      <span className="font-bold">✨ Vous avez déjà confirmé votre présence.</span>
                      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                        Vous pouvez accéder immédiatement à votre Pass QR ou modifier vos choix ci-dessous.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedGuest(existingGuest);
                        setIsReturningGuest(true);
                        setStep(4);
                      }}
                      className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Voir mon Pass QR →</span>
                    </button>
                  </div>
                )}

                <div className="text-center space-y-1">
                  <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Vos Coordonnées &amp; Présence
                  </h3>
                  <p className="text-xs text-zinc-500">Étape 1 sur 2</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Prénom (invité officiel)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={prenom}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Nom de Famille
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={nom}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Email (pour recevoir votre Pass QR Jour J)
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
                      placeholder="+221 77 123 45 67"
                      className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                </div>

                {/* Présence selection buttons */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-3 text-center">
                    Serez-vous présent(e) parmi nous pour la bénédiction nuptiale le Samedi 5 Décembre 2026 ? *
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
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-8 py-3 rounded-full bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-widest shadow-gold transition-colors"
                  >
                    Continuer →
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Logistique & Vœux */}
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
                    Logistique &amp; Mots Doux
                  </h3>
                  <p className="text-xs text-zinc-500">Étape 2 sur 2 avant validation</p>
                </div>

                {/* Linked companion info banner */}
                {linkedCompanion && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gold-50/80 dark:bg-zinc-800/80 border border-gold-300/80 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-3 shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gold-100 dark:bg-zinc-700 text-gold-700 dark:text-gold-300 flex items-center justify-center text-lg shrink-0">
                      💍
                    </div>
                    <div>
                      <p className="font-semibold text-gold-900 dark:text-gold-200">
                        Vous êtes associé(e) avec {linkedCompanion.prenom} {linkedCompanion.nom}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Votre conjoint(e) / accompagnant(e) officiel(le) est également enregistré(e) sur la liste (Code : <span className="font-mono font-bold text-gold-700 dark:text-gold-300">{linkedCompanion.qr_code_uid}</span>).
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Logistique checkboxes if confirmed */}
                {statutRsvp === 'confirme' && (
                  <div className="space-y-4">
                    <div className="space-y-3 p-4 rounded-2xl bg-white/70 dark:bg-zinc-800 border border-gold-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={navetteRequise}
                          onChange={(e) => setNavetteRequise(e.target.checked)}
                          className="w-4 h-4 rounded text-gold-600 focus:ring-gold-500 border-gold-300"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">
                          🚍 J&apos;aurai besoin du service de navettes entre l&apos;église, la salle de réception et les hôtels partenaires
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
                          🏨 Je souhaite bénéficier du tarif préférentiel hébergement réservé aux invités du mariage
                        </span>
                      </label>
                    </div>

                    {/* Allergies / Particularités alimentaires */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                        Régimes particuliers ou allergies alimentaires (si applicable) :
                      </label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Ex: Végétarien, sans gluten, sans arachide, allergie fruits de mer..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                      />
                    </div>
                  </div>
                )}

                {/* Message to Bride & Groom */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Un petit mot ou vœu pour Radène &amp; Kévin :
                  </label>
                  <textarea
                    rows={4}
                    value={messageMaries}
                    onChange={(e) => setMessageMaries(e.target.value)}
                    placeholder="Écrivez vos vœux, bénédictions, félicitations ou mots doux..."
                    className="w-full px-4 py-3 rounded-2xl bg-white/90 dark:bg-zinc-800 border border-gold-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
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

            {/* STEP 4: SUCCESS / CONFIRMATION & QR PASS */}
            {step === 4 && submittedGuest && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-gold-100 dark:bg-zinc-800 text-gold-600 mx-auto flex items-center justify-center border-2 border-gold-400 shadow-gold">
                  <Sparkles className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="font-serif-luxury text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                    {isReturningGuest
                      ? `Ravi de vous revoir ${submittedGuest.prenom} !`
                      : `Merci ${submittedGuest.prenom} !`}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 max-w-md mx-auto">
                    {submittedGuest.statut_rsvp === 'confirme'
                      ? (isReturningGuest
                          ? 'Votre présence est bien confirmée pour le Samedi 5 Décembre 2026. Vous pouvez télécharger votre Pass QR ci-dessous pour le Jour J.'
                          : 'Votre présence est bien confirmée ! Voici votre Pass d’accès officiel pour le Jour J.')
                      : 'Votre réponse a bien été prise en compte. Merci infiniment pour votre délicate attention.'}
                  </p>
                </div>

                {/* VIP Gold QR Pass Card */}
                {submittedGuest.statut_rsvp === 'confirme' && (
                  <div className="max-w-md mx-auto rounded-3xl p-6 bg-gradient-to-b from-ivory to-gold-50 dark:from-zinc-900 dark:to-zinc-950 border-2 border-gold-400 shadow-gold-glow relative overflow-hidden text-center">
                    {/* Header Monogram */}
                    <div className="flex items-center justify-between border-b border-gold-300 pb-3 mb-4">
                      <span className="font-script-calligraphy text-2xl text-gold-600">R &amp; K</span>
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
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {submittedGuest.prenom} {submittedGuest.nom}
                      </p>
                      {linkedCompanion && (
                        <p className="text-[11px] text-gold-700 dark:text-gold-300 font-medium">
                          💍 Duo associé : {linkedCompanion.prenom} {linkedCompanion.nom}
                        </p>
                      )}
                      <p>📍 Eglise Protestante de Dieuppeul &amp; Fun Time • Samedi 5 Décembre 2026</p>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-4 italic">
                      Présentez ce QR Code au protocole d&apos;accueil lors de votre arrivée.
                    </p>

                    {/* Download & Share Action Buttons */}
                    <div className="mt-6 pt-5 border-t border-gold-200/80 dark:border-zinc-800 space-y-2.5">
                      <button
                        type="button"
                        onClick={handleDownloadPass}
                        disabled={isDownloading}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 hover:from-gold-600 hover:to-gold-800 text-white font-bold text-xs uppercase tracking-widest shadow-gold hover:shadow-gold-glow flex items-center justify-center gap-2.5 transition-all active:scale-98 disabled:opacity-75"
                      >
                        {isDownloading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Génération de votre Pass...</span>
                          </>
                        ) : downloadSuccess ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            <span>Pass téléchargé avec succès !</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Télécharger mon Pass QR (Image)</span>
                          </>
                        )}
                      </button>

                      {canShare && (
                        <button
                          type="button"
                          onClick={handleSharePass}
                          disabled={isDownloading}
                          className="w-full py-2.5 px-4 rounded-xl border border-gold-300 dark:border-gold-700 text-gold-900 dark:text-gold-200 hover:bg-gold-50/80 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5 text-gold-600" />
                          <span>Enregistrer dans Photos / Partager</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                    }}
                    className="px-6 py-2.5 rounded-full border border-gold-300 text-xs uppercase tracking-wider text-gold-800 dark:text-gold-300 font-semibold hover:bg-gold-50 dark:hover:bg-zinc-800"
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

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSubmittedGuest(null);
                      setExistingGuest(null);
                      setLinkedCompanion(null);
                      setIsReturningGuest(false);
                      setInviteCode('');
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
                  >
                    Saisir un autre code d&apos;invitation
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
