// ==============================================================================
// SUPABASE EDGE FUNCTION : SEND-REMINDER-EMAIL (RESEND API)
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'mariage@radene-kevin.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { guest_id, email, prenom, qr_code_uid } = await req.json();

    if (!email || !prenom) {
      return new Response(JSON.stringify({ error: 'Missing email or prenom' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = `
      <div style="font-family: 'Georgia', serif; background-color: #FDFBF7; padding: 40px 20px; color: #271C0B;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 36px; border: 1px solid #E8D8BF; box-shadow: 0 10px 30px rgba(184,147,85,0.15); text-align: center;">
          <h1 style="font-size: 38px; color: #B89355; margin: 0 0 10px 0; font-family: 'Great Vibes', cursive;">Radene & Kevin</h1>
          <p style="text-transform: uppercase; font-size: 11px; letter-spacing: 2px; color: #7E5E2E; margin-bottom: 24px;">Samedi 5 Décembre 2026 • Eglise Protestante de Dieuppeul &amp; Fun Time, Dakar</p>
          
          <h2 style="font-size: 22px; margin-bottom: 16px;">Chère/Cher ${prenom},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #443217; margin-bottom: 24px;">
            Le grand jour approche à grands pas ! Nous serions honorés de vous compter parmi nous pour célébrer notre bénédiction nuptiale et notre mariage à Dakar.
          </p>

          <div style="background-color: #FAF7F0; border-radius: 16px; padding: 20px; margin-bottom: 28px; border: 1px dashed #CAAB79;">
            <p style="font-size: 13px; font-weight: bold; color: #604722; margin: 0 0 8px 0;">VOTRE CODE INVITATION PERSONNEL</p>
            <p style="font-size: 24px; font-family: monospace; font-weight: bold; color: #9C793F; letter-spacing: 4px; margin: 0;">${qr_code_uid}</p>
          </div>

          <a href="https://radene-kevin.com/#rsvp?code=${qr_code_uid}" style="display: inline-block; background: linear-gradient(135deg, #CAAB79 0%, #B89355 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-size: 13px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
            Confirmer ma présence (RSVP)
          </a>

          <p style="font-size: 12px; color: #8D4739; margin-top: 32px; font-style: italic;">
            Avec toute notre tendresse et notre amour,<br><strong>Radene & Kevin</strong>
          </p>
        </div>
      </div>
    `;

    // Call Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: 'Radene & Kevin — Votre réponse souhaitée pour le 5 Décembre 2026 🥂',
        html: emailHtml,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
