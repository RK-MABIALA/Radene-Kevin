'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Utensils,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  MapPin,
  Volume2,
  VolumeX,
  Clock,
  UserCheck,
  Flame,
  Check,
  XCircle,
  HelpCircle,
  Heart,
  User,
} from 'lucide-react';
import { weddingStore } from '@/lib/supabase/client';
import { GuestItem, TableItem } from '@/lib/database.types';
import { triggerConfetti, formatDate } from '@/lib/utils';
import { checkInGuestAction, checkInCoupleAction, CheckInResult } from '@/app/actions/scanner';

/**
 * Web Audio API : Générateur de sons synthétisés sans fichier audio externe
 */
function playAudioFeedback(type: 'success' | 'warning' | 'error') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Accord majeur montant harmonieux (Do5 -> Mi5 -> Sol5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.35);
      });
    } else if (type === 'warning') {
      // Double bip d'attention (invité déjà pointé)
      [0, 0.15].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.12);
      });
    } else {
      // Son d'erreur grave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Audio context may be blocked by browser policy before first interaction
  }
}

export const QrScannerCamera: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoResetTimer, setAutoResetTimer] = useState<number>(0);
  const [protocolStaffName, setProtocolStaffName] = useState('Protocole Entrée');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    const [tList, gList] = await Promise.all([
      weddingStore.getTables(),
      weddingStore.getGuests(),
    ]);
    setTables(tList);
    setGuests(gList);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('wedding_data_changed', loadData);
    return () => {
      window.removeEventListener('wedding_data_changed', loadData);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [loadData]);

  // Statistics
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter((g) => g.checked_in).length;
  const remainingGuests = Math.max(0, totalGuests - checkedInGuests);
  const arrivalPercent = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  // Auto-reset countdown logic
  const startAutoResetCountdown = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    let secondsLeft = 6;
    setAutoResetTimer(secondsLeft);

    timerIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setAutoResetTimer(secondsLeft);
      if (secondsLeft <= 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setLastResult(null);
        isProcessingRef.current = false;
        startScanner();
      }
    }, 1000);
  }, []);

  const guestMap = useMemo(() => {
    const map = new Map<string, GuestItem>();
    guests.forEach((g) => map.set(g.id, g));
    return map;
  }, [guests]);

  // Live matching suggestions for manual search
  const matchingSuggestions = useMemo(() => {
    const q = manualCode.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return guests.filter((g) => {
      const qDigits = q.replace(/[^\d]/g, '');
      const comp = g.companion_id ? guestMap.get(g.companion_id) : null;
      if (g.qr_code_uid && g.qr_code_uid.toLowerCase().includes(q)) return true;
      if (/^\d+$/.test(q) && g.qr_code_uid.toLowerCase().includes(q.padStart(3, '0'))) return true;
      if (`${g.prenom} ${g.nom}`.toLowerCase().includes(q)) return true;
      if (`${g.nom} ${g.prenom}`.toLowerCase().includes(q)) return true;
      if (comp && `${comp.prenom} ${comp.nom}`.toLowerCase().includes(q)) return true;
      if (qDigits.length >= 4 && g.telephone && g.telephone.replace(/[^\d]/g, '').includes(qDigits)) return true;
      return false;
    }).slice(0, 5);
  }, [manualCode, guests, guestMap]);

  const handleProcessCode = async (decodedText: string, autoCheckInBoth: boolean = false) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode || isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // 1. Tenter l'appel via la Server Action Next.js
      let result = await checkInGuestAction(cleanCode, protocolStaffName, autoCheckInBoth);

      // 2. Si le serveur renvoie NOT_FOUND ou ERROR, basculer sur le store réactif local
      if (!result.success) {
        const localGuest = await weddingStore.findGuestByQuery(cleanCode);
        if (localGuest) {
          const wasAlready = localGuest.checked_in;
          const updated = await weddingStore.checkInGuest(localGuest.id, protocolStaffName);
          const table = tables.find((t) => t.id === localGuest.table_id) || null;

          let companionGuest: GuestItem | null = null;
          let companionTable: TableItem | null = null;
          if (localGuest.companion_id) {
            companionGuest = guests.find((g) => g.id === localGuest.companion_id) || null;
            if (autoCheckInBoth && companionGuest) {
              companionGuest = await weddingStore.checkInGuest(companionGuest.id, protocolStaffName);
            }
            if (companionGuest && companionGuest.table_id) {
              companionTable = tables.find((t) => t.id === companionGuest?.table_id) || null;
            }
          }

          result = {
            success: true,
            status: wasAlready ? 'ALREADY_CHECKED_IN' : 'SUCCESS',
            message: wasAlready
              ? `Invité déjà pointé précédemment (${localGuest.checked_in_at ? new Date(localGuest.checked_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Aujourd\'hui'}).`
              : `Bienvenue ${localGuest.prenom} ${localGuest.nom} ! Pointage validé avec succès.`,
            guest: updated || localGuest,
            table,
            companionGuest,
            companionTable,
            isCouple: Boolean(companionGuest),
          };
        }
      }

      setLastResult(result);
      await loadData();

      // Audio & Visual Effects
      if (result.status === 'SUCCESS') {
        if (soundEnabled) playAudioFeedback('success');
        triggerConfetti();
      } else if (result.status === 'ALREADY_CHECKED_IN') {
        if (soundEnabled) playAudioFeedback('warning');
      } else {
        if (soundEnabled) playAudioFeedback('error');
      }

      // Arrêter le flux caméra pendant l'affichage et lancer le décompte de reprise
      await stopScanner();
      startAutoResetCountdown();
    } catch (err: any) {
      console.error('Erreur traitement scan:', err);
      setLastResult({
        success: false,
        status: 'ERROR',
        message: err?.message || 'Erreur lors du traitement du QR Code.',
      });
      if (soundEnabled) playAudioFeedback('error');
      startAutoResetCountdown();
    }
  };

  // Dedicated handler to check-in the entire couple at once
  const handleCheckInBoth = async (primaryId: string, companionId: string) => {
    setIsProcessingAction(true);
    try {
      const res = await checkInCoupleAction(primaryId, companionId, protocolStaffName);
      if (res.success) {
        await weddingStore.checkInMultipleGuests([primaryId, companionId], protocolStaffName);
        setLastResult(res);
        if (soundEnabled) playAudioFeedback('success');
        triggerConfetti();
      } else {
        // Local fallback
        await weddingStore.checkInMultipleGuests([primaryId, companionId], protocolStaffName);
        await loadData();
        const primary = guests.find((g) => g.id === primaryId);
        const companion = guests.find((g) => g.id === companionId);
        setLastResult({
          success: true,
          status: 'SUCCESS',
          message: `Pointage du couple validé avec succès !`,
          guest: primary,
          companionGuest: companion,
          isCouple: true,
        });
        if (soundEnabled) playAudioFeedback('success');
        triggerConfetti();
      }
      await loadData();
    } catch (e) {
      console.error('Error check-in couple:', e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Dedicated handler to check in single guest (e.g. only companion or only primary)
  const handleCheckInSingle = async (guestId: string) => {
    setIsProcessingAction(true);
    try {
      const updated = await weddingStore.checkInGuest(guestId, protocolStaffName);
      await loadData();
      if (lastResult) {
        if (lastResult.guest?.id === guestId) {
          setLastResult({
            ...lastResult,
            guest: updated || lastResult.guest,
          });
        } else if (lastResult.companionGuest?.id === guestId) {
          setLastResult({
            ...lastResult,
            companionGuest: updated || lastResult.companionGuest,
          });
        }
      }
      if (soundEnabled) playAudioFeedback('success');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    setScanning(true);
    isProcessingRef.current = false;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleProcessCode(decodedText);
        },
        () => {
          // Continuous frame scan error (silenced)
        }
      );
    } catch (err: any) {
      console.warn('Camera start issue:', err);
      setCameraError('Accès caméra indisponible ou refusé. Vous pouvez utiliser la saisie manuelle ci-dessous.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Stop camera error:', e);
      }
    }
    setScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessCode(manualCode);
    setManualCode('');
  };


  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 1. Top Real-time Reception Stats & Receptionist Config */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-gold-200/70 dark:border-zinc-800 shadow-gold">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gold-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/15 text-gold-700 dark:text-gold-300 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-luxury text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Protocole d'Accueil Jour J
              </h2>
              <p className="text-xs text-zinc-500">
                Poste actif : <span className="font-semibold text-gold-700 dark:text-gold-400">{protocolStaffName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                soundEnabled
                  ? 'border-gold-300 bg-gold-50 text-gold-800 dark:bg-zinc-800 dark:text-gold-300'
                  : 'border-zinc-200 text-zinc-400 bg-zinc-50 dark:bg-zinc-800'
              }`}
              title={soundEnabled ? 'Retour sonore activé' : 'Retour sonore désactivé'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-gold-600" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Bip ON' : 'Muet'}</span>
            </button>

            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Scan Direct</span>
            </span>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 pt-4 text-center">
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Pointés Arrivés</span>
            <span className="font-serif-luxury text-2xl sm:text-3xl font-bold text-emerald-600">
              {checkedInGuests}
            </span>
            <span className="text-[10px] text-zinc-500 block">sur {totalGuests} prévus</span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Restants</span>
            <span className="font-serif-luxury text-2xl sm:text-3xl font-bold text-amber-600">
              {remainingGuests}
            </span>
            <span className="text-[10px] text-zinc-500 block">personnes attendues</span>
          </div>

          <div className="p-3 rounded-2xl bg-gold-50/70 dark:bg-zinc-800/60 border border-gold-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-gold-700 dark:text-gold-300 block tracking-wider">Taux d'Arrivée</span>
            <span className="font-serif-luxury text-2xl sm:text-3xl font-bold text-gold-800 dark:text-gold-200">
              {arrivalPercent}%
            </span>
            <span className="text-[10px] text-gold-600 dark:text-gold-400 block">de la salle</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Camera Viewfinder Card */}
      <div className="glass-card-gold rounded-3xl p-6 sm:p-8 shadow-gold text-center relative overflow-hidden">
        {/* Camera Box */}
        <div className="relative rounded-3xl overflow-hidden bg-black/95 min-h-[300px] sm:min-h-[340px] flex flex-col items-center justify-center p-4 border-2 border-gold-400 shadow-inner">
          <div id="qr-reader-container" className="w-full max-w-[320px] rounded-2xl overflow-hidden" />

          {!scanning && !lastResult && (
            <div className="text-center p-6 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-gold-500/20 text-gold-400 mx-auto flex items-center justify-center border border-gold-400/40">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif-luxury text-lg font-bold text-white">
                  Caméra prête pour le pointage
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-sm mx-auto">
                  Pointez la caméra vers le Pass QR Code de l'invité pour pointer individuellement ou pour le couple.
                </p>
              </div>
              <button
                type="button"
                onClick={startScanner}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 hover:from-gold-600 hover:to-gold-800 text-white font-bold text-xs uppercase tracking-widest shadow-gold hover:shadow-gold-glow transition-all active:scale-95"
              >
                Démarrer le Scanner Caméra
              </button>
            </div>
          )}

          {scanning && (
            <div className="absolute bottom-4 z-20 flex gap-2">
              <button
                type="button"
                onClick={stopScanner}
                className="px-5 py-2 rounded-full bg-zinc-900/90 text-zinc-300 hover:text-white text-xs uppercase tracking-wider font-semibold border border-zinc-700"
              >
                Mettre en pause
              </button>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-zinc-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-30">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-zinc-200 max-w-md">{cameraError}</p>
              <button
                onClick={startScanner}
                className="px-5 py-2 rounded-full bg-gold-500 text-white text-xs font-semibold uppercase tracking-wider"
              >
                Réessayer la caméra
              </button>
            </div>
          )}
        </div>

        {/* Manual Fallback Input with Autocomplete */}
        <div className="mt-6 pt-4 border-t border-gold-200/60 dark:border-zinc-800 relative">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Saisie manuelle : Nom, Prénom, Conjoint ou Code QR (ex: Dossou, RK-001)..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-zinc-800 border border-gold-300 dark:border-zinc-700 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-sm"
            >
              Valider
            </button>
          </form>

          {/* Autocomplete Suggestions Box */}
          {manualCode.trim().length >= 1 && matchingSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-gold-300/80 dark:border-zinc-700 rounded-2xl shadow-xl z-30 p-2 space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-gold-700 dark:text-gold-400">
                Suggestions trouvées ({matchingSuggestions.length}) :
              </div>
              {matchingSuggestions.map((g) => {
                const tableName = tables.find((t) => t.id === g.table_id)?.nom_numero || 'Table non assignée';
                const companion = g.companion_id ? guestMap.get(g.companion_id) : null;
                return (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-xl hover:bg-gold-50 dark:hover:bg-zinc-800/80 flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-gold-100 dark:bg-zinc-800 text-gold-900 dark:text-gold-300">
                        {g.qr_code_uid}
                      </span>
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                          {g.prenom} {g.nom}
                          {companion && (
                            <span className="text-gold-700 dark:text-gold-400 text-[11px] font-normal ml-1.5">
                              (💍 Conjoint : {companion.prenom} {companion.nom})
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          {tableName} • {g.telephone || 'Sans tél'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setManualCode('');
                          handleProcessCode(g.qr_code_uid);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all ${
                          g.checked_in
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        {g.checked_in ? 'Déjà Pointé ⚠️' : 'Pointer Invité ✨'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Live Result Card (Shown immediately upon scan) */}
      {lastResult && (
        <div
          className={`rounded-3xl p-6 sm:p-8 border-2 shadow-2xl transition-all animate-in zoom-in-95 duration-300 relative overflow-hidden ${
            lastResult.status === 'SUCCESS'
              ? 'bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-zinc-900 border-emerald-500 shadow-emerald-500/20'
              : lastResult.status === 'ALREADY_CHECKED_IN'
              ? 'bg-gradient-to-b from-amber-50/90 to-white dark:from-amber-950/40 dark:to-zinc-900 border-amber-500 shadow-amber-500/20'
              : 'bg-gradient-to-b from-rose-50/90 to-white dark:from-rose-950/40 dark:to-zinc-900 border-rose-500 shadow-rose-500/20'
          }`}
        >
          {/* Status Header Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {lastResult.status === 'SUCCESS' && (
                <>
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 animate-bounce" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 block">
                      Pointage Validé • Bienvenue !
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      {lastResult.message}
                    </span>
                  </div>
                </>
              )}

              {lastResult.status === 'ALREADY_CHECKED_IN' && (
                <>
                  <Clock className="w-7 h-7 text-amber-600" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300 block">
                      Déjà Pointé Antérieurement ⚠️
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">
                      {lastResult.guest?.checked_in_at
                        ? `Pointé à ${new Date(lastResult.guest.checked_in_at).toLocaleTimeString('fr-FR')}`
                        : 'Déjà enregistré'}
                    </span>
                  </div>
                </>
              )}

              {lastResult.status !== 'SUCCESS' && lastResult.status !== 'ALREADY_CHECKED_IN' && (
                <>
                  <XCircle className="w-7 h-7 text-rose-600" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-rose-800 dark:text-rose-300 block">
                      Code Non Validé
                    </span>
                    <span className="text-[11px] text-rose-600">{lastResult.message}</span>
                  </div>
                </>
              )}
            </div>

            {lastResult.guest && (
              <span className="font-mono text-xs font-bold bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300">
                {lastResult.guest.qr_code_uid}
              </span>
            )}
          </div>

          {/* Guest & Placement Details */}
          {lastResult.guest && (
            <div className="py-6 space-y-6">
              {/* If couple is present */}
              {lastResult.companionGuest ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 dark:bg-zinc-800 text-gold-800 dark:text-gold-300 text-xs font-bold uppercase tracking-widest mb-2 border border-gold-300/60">
                      <Heart className="w-3.5 h-3.5 text-gold-600 fill-gold-600/40" />
                      <span>Pass Couple Associé</span>
                    </div>
                    <h3 className="font-serif-luxury text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      {lastResult.guest.prenom} {lastResult.guest.nom} &amp; {lastResult.companionGuest.prenom} {lastResult.companionGuest.nom}
                    </h3>
                  </div>

                  {/* Dual Guest Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    {/* Primary Guest Card */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                      lastResult.guest.checked_in
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Invité 1 (Scanné)
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lastResult.guest.checked_in
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {lastResult.guest.checked_in ? 'Pointé ✅' : 'Non pointé'}
                        </span>
                      </div>

                      <div className="font-serif-luxury text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {lastResult.guest.prenom} {lastResult.guest.nom}
                      </div>
                      <div className="font-mono text-xs text-gold-700 dark:text-gold-400 mt-0.5">
                        {lastResult.guest.qr_code_uid}
                      </div>

                      <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Table :</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {lastResult.table?.nom_numero || 'Non assignée'}
                          </span>
                        </div>
                        {lastResult.guest.allergies && (
                          <div className="text-[11px] text-rose-600 font-semibold pt-1">
                            ⚠️ {lastResult.guest.allergies}
                          </div>
                        )}
                      </div>

                      {!lastResult.guest.checked_in && (
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleCheckInSingle(lastResult.guest!.id)}
                          className="mt-3 w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
                        >
                          Pointer {lastResult.guest.prenom}
                        </button>
                      )}
                    </div>

                    {/* Companion Guest Card */}
                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                      lastResult.companionGuest.checked_in
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Conjoint(e) Lié(e)
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lastResult.companionGuest.checked_in
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {lastResult.companionGuest.checked_in ? 'Pointé ✅' : 'Non pointé'}
                        </span>
                      </div>

                      <div className="font-serif-luxury text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {lastResult.companionGuest.prenom} {lastResult.companionGuest.nom}
                      </div>
                      <div className="font-mono text-xs text-gold-700 dark:text-gold-400 mt-0.5">
                        {lastResult.companionGuest.qr_code_uid}
                      </div>

                      <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Table :</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {lastResult.companionTable?.nom_numero || lastResult.table?.nom_numero || 'Non assignée'}
                          </span>
                        </div>
                        {lastResult.companionGuest.allergies && (
                          <div className="text-[11px] text-rose-600 font-semibold pt-1">
                            ⚠️ {lastResult.companionGuest.allergies}
                          </div>
                        )}
                      </div>

                      {!lastResult.companionGuest.checked_in && (
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleCheckInSingle(lastResult.companionGuest!.id)}
                          className="mt-3 w-full py-1.5 rounded-xl bg-gold-600 hover:bg-gold-700 text-white text-xs font-semibold transition-colors"
                        >
                          Pointer {lastResult.companionGuest.prenom}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Couple Action Button: Pointer les 2 à la fois */}
                  {(!lastResult.guest.checked_in || !lastResult.companionGuest.checked_in) && (
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => handleCheckInBoth(lastResult.guest!.id, lastResult.companionGuest!.id)}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Valider l'Entrée pour le Couple Complet (2 Personnes)</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Individual Guest Card */
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                      {lastResult.guest.prenom} {lastResult.guest.nom}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Invitation individuelle officielle (Code : {lastResult.guest.qr_code_uid})
                    </p>
                  </div>

                  {/* High-visibility Table Badge */}
                  <div className="inline-block p-5 rounded-3xl bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 text-white shadow-gold max-w-sm w-full mx-auto">
                    <span className="text-[11px] uppercase font-bold tracking-widest block opacity-90 mb-1">
                      Orientation Table
                    </span>
                    <span className="font-serif-luxury text-3xl font-bold block">
                      {lastResult.table?.nom_numero || 'Table Non Assignée'}
                    </span>
                    <div className="flex items-center justify-center gap-2 text-xs opacity-90 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Zone : {lastResult.table?.zone || 'Salle Principale'}</span>
                    </div>
                  </div>

                  {/* Régime & Allergies */}
                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-zinc-200 text-left text-xs max-w-sm mx-auto">
                    <span className="font-bold text-zinc-500 uppercase text-[10px] block mb-1">
                      Régime &amp; Allergies
                    </span>
                    {lastResult.guest.allergies ? (
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>Attention : {lastResult.guest.allergies}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Régime standard (aucune allergie signalée)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto-reset Progress Countdown & Next Scan Button */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-zinc-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-500 animate-ping" />
              <span>
                Reprise automatique du scan dans <strong>{autoResetTimer}s</strong>...
              </span>
            </div>

            <button
              onClick={() => {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                setLastResult(null);
                isProcessingRef.current = false;
                startScanner();
              }}
              className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors"
            >
              Scanner Invité Suivant Immédiatement →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
