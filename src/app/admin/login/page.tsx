'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Mail, Eye, EyeOff, Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured, weddingStore } from '@/lib/supabase/client';

const loginSchema = z.object({
  email: z.string().min(1, 'L’adresse e-mail est requise').email('Adresse e-mail invalide'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);

    try {
      if (supabase && isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) {
          throw new Error(error.message || 'Identifiants invalides');
        }

        const user = data.user;
        let role: 'ADMIN' | 'PROTOCOLE' = 'ADMIN';

        if (user) {
          // Fetch role from user_roles
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          if (roleData?.role) {
            role = roleData.role;
          } else if (user.user_metadata?.role) {
            role = user.user_metadata.role;
          }
        }

        await weddingStore.setUserRole(role);
        toast.success(`Bienvenue ! Connecté en tant que ${role === 'ADMIN' ? 'Administrateur' : 'Protocole'}`);

        // Route redirection based on role
        if (role === 'PROTOCOLE') {
          router.push('/admin/scanner');
        } else {
          router.push(redirectTo || '/admin');
        }
        router.refresh();
      } else {
        // Mock fallback for local demo mode without active remote supabase credentials
        const isProtocole = values.email.toLowerCase().includes('protocole') || values.email.toLowerCase().includes('accueil');
        const role = isProtocole ? 'PROTOCOLE' : 'ADMIN';
        await weddingStore.setUserRole(role);
        
        toast.success(`Connexion réussie (Mode Démo : ${role})`);
        if (role === 'PROTOCOLE') {
          router.push('/admin/scanner');
        } else {
          router.push(redirectTo || '/admin');
        }
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Échec de la connexion. Vérifiez vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (role: 'MARIES' | 'ADMIN' | 'PROTOCOLE') => {
    if (role === 'MARIES') {
      setValue('email', 'radenkevinmabiala@gmail.com');
      setValue('password', 'RK-Mab2023');
    } else if (role === 'ADMIN') {
      setValue('email', 'admin@radene-kevin.com');
      setValue('password', 'Mariage2026!');
    } else {
      setValue('email', 'protocole@radene-kevin.com');
      setValue('password', 'Protocole2026!');
    }
  };

  return (
    <div className="glass-panel-dark rounded-3xl p-8 sm:p-10 border border-gold-400/50 shadow-2xl relative">
      {/* Header Monogram Logo */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative w-20 h-20 rounded-full p-1 border-2 border-gold-400 shadow-gold bg-white mb-4 hover:scale-105 transition-transform">
          <img
            src="/img/logo.png"
            alt="Monogramme R & K"
            className="w-full h-full object-contain"
          />
        </div>

        <span className="font-serif-luxury text-2xl font-bold text-white tracking-wide">
          Radène <span className="font-script-calligraphy text-gold-400 text-3xl font-normal">&amp;</span> Kévin
        </span>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-400/40 text-gold-300 text-[11px] uppercase tracking-widest font-semibold mt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
          <span>Espace Protocole &amp; Organisation</span>
        </div>

        <p className="text-xs text-zinc-400 mt-2">
          Authentification sécurisée par E-mail &amp; Mot de passe
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-1.5">
            Adresse E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gold-400" />
            <input
              type="email"
              {...register('email')}
              placeholder="nom@exemple.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-royal-900/90 border border-gold-400/40 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-rose-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-300">
              Mot de Passe
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-gold-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="••••••••"
              className="w-full pl-11 pr-11 py-3 rounded-xl bg-royal-900/90 border border-gold-400/40 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-gold-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-rose-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 hover:from-gold-600 hover:to-gold-800 text-white font-semibold text-xs uppercase tracking-widest shadow-gold hover:shadow-gold-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Vérification en cours...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Se Connecter au Tableau de Bord</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Access Presets */}
      <div className="mt-6 pt-4 border-t border-zinc-800/80">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block text-center mb-2">
          Raccourcis Démo (Pré-remplissage rapide) :
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('MARIES')}
            className="py-2 px-2 rounded-lg bg-gold-500/20 border border-gold-400/50 text-[11px] text-gold-200 hover:bg-gold-500/30 transition-colors font-medium flex items-center justify-center gap-1 shadow-sm"
          >
            <span>💍 Mariés</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('ADMIN')}
            className="py-2 px-2 rounded-lg bg-royal-900/60 border border-gold-400/30 text-[11px] text-gold-300 hover:bg-gold-500/20 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <span>👑 Admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('PROTOCOLE')}
            className="py-2 px-2 rounded-lg bg-royal-900/60 border border-gold-400/30 text-[11px] text-gold-300 hover:bg-gold-500/20 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <span>📱 Protocole</span>
          </button>
        </div>
      </div>

      {/* Back to public site */}
      <div className="mt-6 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-gold-400 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour au site public du mariage</span>
        </a>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-royal-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient royal blue & metallic gold background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-royal-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <Suspense
          fallback={
            <div className="glass-panel-dark rounded-3xl p-10 text-center text-gold-400 flex flex-col items-center gap-3">
              <Sparkles className="w-8 h-8 animate-spin" />
              <span className="text-xs uppercase tracking-widest font-semibold">Chargement...</span>
            </div>
          }
        >
          <LoginFormContent />
        </Suspense>
      </div>
    </div>
  );
}
