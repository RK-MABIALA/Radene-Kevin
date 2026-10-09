'use server';

import { Resend } from 'resend';
import QRCode from 'qrcode';
import { GuestItem } from '@/lib/database.types';
import { generateUUID } from '@/lib/supabase/client';
import { saveGuestAction } from './guests';

const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'mariage@radene-kevin.com';

export interface RsvpActionResult {
  success: boolean;
  message: string;
  guest?: GuestItem;
  emailSent?: boolean;
}

/**
 * Server Action : Enregistrement du RSVP + Envoi automatique de l'e-mail de confirmation avec QR Pass
 */
export async function submitRsvpAction(guestData: Partial<GuestItem>): Promise<RsvpActionResult> {
  const id = guestData.id || generateUUID();
  const now = new Date().toISOString();

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let fallbackQr = "RK-";
  for (let i = 0; i < 5; i++) fallbackQr += chars.charAt(Math.floor(Math.random() * chars.length));

  const qrCodeUid = guestData.qr_code_uid || fallbackQr;

  const record: GuestItem = {
    id,
    nom: (guestData.nom || '').trim(),
    prenom: (guestData.prenom || '').trim(),
    email: (guestData.email || '').trim() || undefined,
    telephone: (guestData.telephone || '').trim() || undefined,
    statut_rsvp: guestData.statut_rsvp || 'en_attente',
    menu_choisi: undefined,
    allergies: (guestData.allergies || '').trim() || undefined,
    companion_id: guestData.companion_id || null,
    relation_type: guestData.relation_type || 'conjoint',
    accompagnants_json: [],
    qr_code_uid: qrCodeUid,
    table_id: guestData.table_id || null,
    checked_in: guestData.checked_in || false,
    checked_in_at: guestData.checked_in_at || null,
    checked_in_by: guestData.checked_in_by || null,
    nombre_invites: 1,
    navette_requise: guestData.navette_requise || false,
    hebergement_requis: guestData.hebergement_requis || false,
    message_maries: (guestData.message_maries || '').trim() || undefined,
    created_at: now,
    updated_at: now,
  };

  // 1. Sauvegarde robuste dans Supabase
  let savedRecord: GuestItem = record;
  try {
    const saveResult = await saveGuestAction(record);
    if (saveResult.success && saveResult.data) {
      savedRecord = saveResult.data;
    }
  } catch (e) {
    console.warn('Erreur saveGuestAction dans submitRsvpAction:', e);
  }

  // 2. Envoi automatique de l'e-mail de confirmation via Resend
  let emailSent = false;
  if (savedRecord.email && savedRecord.statut_rsvp === 'confirme' && resendApiKey && !resendApiKey.startsWith('re_123456')) {
    try {
      const resend = new Resend(resendApiKey);

      // Génération du QR Code au format Base64 Data URL pour affichage dans l'e-mail
      const qrDataUrl = await QRCode.toDataURL(savedRecord.qr_code_uid, {
        margin: 1,
        width: 240,
        color: {
          dark: '#271C0B',
          light: '#FFFFFF',
        },
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmation de présence - Mariage Radene & Kevin</title>
        </head>
        <body style="font-family: 'Georgia', serif; background-color: #FDFBF7; padding: 30px 10px; color: #271C0B; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 40px 30px; border: 1px solid #E8D8BF; box-shadow: 0 10px 30px rgba(184,147,85,0.15); text-align: center;">
            <div style="font-size: 13px; letter-spacing: 3px; color: #B89355; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">
              MARIAGE DE
            </div>
            <h1 style="font-size: 42px; color: #B89355; margin: 0 0 8px 0; font-weight: normal; font-family: 'Georgia', serif;">
              Radene &amp; Kevin
            </h1>
            <p style="text-transform: uppercase; font-size: 11px; letter-spacing: 2px; color: #7E5E2E; margin-bottom: 28px;">
              Samedi 5 &bull; Dimanche 6 D&eacute;cembre 2026 &bull; Dakar, S&eacute;n&eacute;gal
            </p>
            
            <div style="border-top: 1px solid #F0E6D6; border-bottom: 1px solid #F0E6D6; padding: 20px 0; margin-bottom: 24px;">
              <h2 style="font-size: 22px; color: #271C0B; margin: 0 0 10px 0; font-weight: normal;">
                Ch&egrave;re / Cher ${savedRecord.prenom},
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #5A4322; margin: 0;">
                Nous avons le plaisir de vous confirmer la bonne r&eacute;ception de votre r&eacute;ponse. C&apos;est un bonheur immense de vous savoir &agrave; nos c&ocirc;t&eacute;s pour c&eacute;l&eacute;brer cette journ&eacute;e inoubliable !
              </p>
            </div>

            <!-- CARTE VIP PASS QR CODE -->
            <div style="background: linear-gradient(180deg, #FAF7F0 0%, #F5EEDF 100%); border-radius: 20px; padding: 24px; margin-bottom: 28px; border: 2px solid #CAAB79;">
              <p style="font-size: 11px; font-weight: bold; color: #7E5E2E; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px 0;">
                VOTRE PASS D&apos;ACC&Egrave;S JOUR J
              </p>
              
              <div style="background-color: #ffffff; display: inline-block; padding: 12px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #E8D8BF; margin-bottom: 12px;">
                <img src="${qrDataUrl}" alt="QR Code Pass" width="180" height="180" style="display: block; border-radius: 8px;" />
              </div>

              <p style="font-family: monospace; font-size: 20px; font-weight: bold; color: #9C793F; letter-spacing: 4px; margin: 0 0 12px 0;">
                CODE : ${savedRecord.qr_code_uid}
              </p>

              <div style="font-size: 13px; color: #443217; line-height: 1.5; border-top: 1px dashed #CAAB79; padding-top: 12px; margin-top: 8px;">
                <p style="margin: 4px 0;"><strong>Invit&eacute;(s) :</strong> ${savedRecord.prenom} ${savedRecord.nom} (${savedRecord.nombre_invites} personne${savedRecord.nombre_invites > 1 ? 's' : ''})</p>
                ${savedRecord.allergies ? `<p style="margin: 4px 0; color: #8D4739;"><strong>Allergies / R&eacute;gime :</strong> ${savedRecord.allergies}</p>` : ''}
              </div>
            </div>

            <p style="font-size: 13px; color: #7E5E2E; line-height: 1.5; margin-bottom: 28px;">
              <em>Conservez cet e-mail ou faites une capture d&apos;&eacute;cran de votre QR Code. Il vous suffira de le pr&eacute;senter au protocole d&apos;accueil lors de votre arriv&eacute;e.</em>
            </p>

            <a href="https://radene-kevin.com/#programme" style="display: inline-block; background: linear-gradient(135deg, #CAAB79 0%, #B89355 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 4px 15px rgba(184,147,85,0.4);">
              D&eacute;couvrir le Programme &bull; Dakar 2026
            </a>

            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #F0E6D6; font-size: 13px; color: #7E5E2E; font-style: italic;">
              Avec tout notre amour et notre reconnaissance,<br>
              <strong style="font-size: 18px; color: #B89355; font-style: normal; display: inline-block; margin-top: 6px; font-family: 'Georgia', serif;">
                Radene &amp; Kevin
              </strong>
            </div>
          </div>
        </body>
        </html>
      `;

      await resend.emails.send({
        from: `Mariage Radene & Kevin <${resendFromEmail}>`,
        to: [savedRecord.email],
        subject: `✨ Votre Pass d'Accès VIP — Mariage Radene & Kevin (5 Décembre 2026)`,
        html: emailHtml,
      });

      emailSent = true;
    } catch (mailError) {
      console.warn('Erreur envoi Resend confirmation:', mailError);
    }
  }

  return {
    success: true,
    message: savedRecord.statut_rsvp === 'confirme' 
      ? `Merci ${savedRecord.prenom} ! Votre présence a bien été confirmée.`
      : `Votre réponse a bien été enregistrée.`,
    guest: savedRecord,
    emailSent,
  };
}
