'use server';

import { Resend } from 'resend';
import QRCode from 'qrcode';
import { GuestItem, TableItem } from '@/lib/database.types';
import { generateUUID } from '@/lib/supabase/client';
import { parseGuestFromDb, saveGuestAction } from './guests';
import { getSupabaseAdminClient as getSupabaseServerClient, cleanInviteCode } from '@/lib/supabase/server';

function normalizePhoneDigits(phone?: string | null): string {
  return (phone || '').replace(/[^\d]/g, '');
}

/**
 * Server Action Sécurisée : Vérification d'une invitation sans exposer la liste d'invités
 */
export async function verifyGuestInvitationAction(params: {
  code?: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
}): Promise<VerifiedGuestResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, message: 'Service temporairement indisponible (base de données non connectée).' };
  }

  try {
    const cleanCode = cleanInviteCode(params.code);

    // 1. Recherche par Code d'invitation (méthode principale et directe)
    if (cleanCode) {
      if (cleanCode.length < 4 || cleanCode === 'RK' || cleanCode === 'RK-') {
        return {
          success: false,
          message: "Veuillez saisir votre code d'invitation complet (ex: RK-046) figurant sur votre faire-part.",
        };
      }

      const { data: row, error } = await supabase
        .from('guests')
        .select('*')
        .ilike('qr_code_uid', cleanCode)
        .maybeSingle();

      if (error) {
        console.error('verifyGuestInvitationAction error:', error);
        return { success: false, message: 'Erreur lors de la vérification du code.' };
      }

      if (!row) {
        return {
          success: false,
          message: `Le code d'invitation "${cleanCode}" est introuvable. Veuillez vérifier votre faire-part ou contacter les mariés.`,
        };
      }

      const guest = await parseGuestFromDb(row);
      let companion = null;

      if (guest.companion_id) {
        const { data: compRow } = await supabase
          .from('guests')
          .select('id, nom, prenom, relation_type, statut_rsvp, qr_code_uid')
          .eq('id', guest.companion_id)
          .maybeSingle();

        if (compRow) {
          companion = {
            id: compRow.id,
            nom: compRow.nom,
            prenom: compRow.prenom,
            relation_type: compRow.relation_type || 'conjoint',
            statut_rsvp: compRow.statut_rsvp,
            qr_code_uid: compRow.qr_code_uid,
          };
        }
      }

      return { success: true, guest, companion };
    }

    // 2. Recherche par Nom & Prénom (+ téléphone pour vérification d'identité)
    const nomInput = (params.nom || '').trim().toLowerCase();
    const prenomInput = (params.prenom || '').trim().toLowerCase();

    if (!nomInput && !prenomInput) {
      return { success: false, message: "Veuillez saisir votre code d'invitation ou votre nom et prénom." };
    }

    if (nomInput.length < 2 && prenomInput.length < 2) {
      return { success: false, message: 'Veuillez saisir au moins 3 caractères pour la recherche.' };
    }

    // Récupérer uniquement les correspondances côté serveur
    const { data: allCandidates, error: searchErr } = await supabase
      .from('guests')
      .select('*');

    if (searchErr || !allCandidates) {
      return { success: false, message: 'Erreur de recherche en base de données.' };
    }

    const matched = allCandidates.filter((g) => {
      const gNom = (g.nom || '').trim().toLowerCase();
      const gPrenom = (g.prenom || '').trim().toLowerCase();
      const gFull = `${gPrenom} ${gNom}`.trim().toLowerCase();
      const gRev = `${gNom} ${gPrenom}`.trim().toLowerCase();

      let isNameMatch = false;
      if (nomInput && prenomInput) {
        isNameMatch =
          (gNom === nomInput && gPrenom === prenomInput) ||
          (gNom === prenomInput && gPrenom === nomInput) ||
          gFull === `${prenomInput} ${nomInput}` ||
          gRev === `${nomInput} ${prenomInput}`;
      } else {
        const singleQuery = (nomInput || prenomInput).toLowerCase();
        isNameMatch = gFull === singleQuery || gRev === singleQuery || gNom === singleQuery || gPrenom === singleQuery;
      }

      if (!isNameMatch) return false;

      // Si le téléphone est fourni, vérifier la concordance
      if (params.telephone) {
        const inputPhone = normalizePhoneDigits(params.telephone);
        const guestPhone = normalizePhoneDigits(g.telephone);
        if (inputPhone.length >= 6 && guestPhone.length >= 6) {
          return guestPhone.endsWith(inputPhone) || inputPhone.endsWith(guestPhone) || guestPhone.includes(inputPhone);
        }
      }

      return true;
    });

    if (matched.length === 0) {
      return {
        success: false,
        message: "Aucune invitation trouvée pour ce nom. Veuillez vérifier l'orthographe exacte ou utiliser votre code personnel d'invitation (ex: RK-046).",
      };
    }

    if (matched.length > 1) {
      return {
        success: false,
        message: "Plusieurs invitations correspondent à ce nom. Veuillez saisir votre code personnel d'invitation ou votre numéro de téléphone pour vous identifier.",
      };
    }

    const singleGuest = await parseGuestFromDb(matched[0]);
    let companion = null;

    if (singleGuest.companion_id) {
      const { data: compRow } = await supabase
        .from('guests')
        .select('id, nom, prenom, relation_type, statut_rsvp, qr_code_uid')
        .eq('id', singleGuest.companion_id)
        .maybeSingle();

      if (compRow) {
        companion = {
          id: compRow.id,
          nom: compRow.nom,
          prenom: compRow.prenom,
          relation_type: compRow.relation_type || 'conjoint',
          statut_rsvp: compRow.statut_rsvp,
          qr_code_uid: compRow.qr_code_uid,
        };
      }
    }

    return { success: true, guest: singleGuest, companion };
  } catch (err: any) {
    console.error('verifyGuestInvitationAction exception:', err);
    return { success: false, message: 'Une erreur est survenue lors de la vérification.' };
  }
}

/**
 * Server Action Sécurisée : Recherche de la table attribuée sans exposer la liste globale des invités
 */
export async function findTableForGuestAction(params: {
  code?: string;
  nom?: string;
  prenom?: string;
}): Promise<TableSearchResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, message: 'Base de données non disponible.' };
  }

  try {
    const verified = await verifyGuestInvitationAction(params);
    if (!verified.success || !verified.guest) {
      return { success: false, message: verified.message || 'Invité introuvable.' };
    }

    const guest = verified.guest;
    if (!guest.table_id) {
      return {
        success: true,
        guestName: `${guest.prenom} ${guest.nom}`,
        table: null,
        message: 'Votre placement est en cours de finalisation par les mariés. Votre table sera affichée très prochainement !',
      };
    }

    const { data: tableData } = await supabase
      .from('tables')
      .select('*')
      .eq('id', guest.table_id)
      .maybeSingle();

    let tableMates: Array<{ nom: string; prenom: string }> = [];
    if (tableData) {
      const { data: mates } = await supabase
        .from('guests')
        .select('nom, prenom')
        .eq('table_id', guest.table_id)
        .neq('id', guest.id);

      if (mates) {
        tableMates = mates.map((m) => ({ nom: m.nom, prenom: m.prenom }));
      }
    }

    return {
      success: true,
      guestName: `${guest.prenom} ${guest.nom}`,
      table: tableData || null,
      tableMates,
    };
  } catch (err) {
    console.error('findTableForGuestAction exception:', err);
    return { success: false, message: 'Erreur lors de la recherche de table.' };
  }
}

/**
 * Server Action : Enregistrement sécurisé du RSVP + Envoi automatique de l'e-mail de confirmation avec QR Pass
 */
export async function submitRsvpAction(guestData: Partial<GuestItem>): Promise<RsvpActionResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { success: false, message: 'Erreur de connexion à la base de données.' };
  }

  // Vérification de sécurité : l'invité DOIT déjà exister sur la liste officielle
  if (!guestData.id) {
    return { success: false, message: "Identification requise. Seuls les invités figurant sur la liste officielle peuvent confirmer leur présence." };
  }

  const { data: existingRow, error: checkErr } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestData.id)
    .maybeSingle();

  if (checkErr || !existingRow) {
    return { success: false, message: "Invitation introuvable sur la liste officielle du mariage." };
  }

  // Contrôle d'intégrité : le QR code UID doit concorder avec la fiche existante
  if (guestData.qr_code_uid && existingRow.qr_code_uid && guestData.qr_code_uid !== existingRow.qr_code_uid) {
    return { success: false, message: "Non concordance du code d'invitation." };
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    statut_rsvp: guestData.statut_rsvp || 'confirme',
    allergies: (guestData.allergies || '').trim() || null,
    navette_requise: Boolean(guestData.navette_requise),
    hebergement_requis: Boolean(guestData.hebergement_requis),
    message_maries: (guestData.message_maries || '').trim() || null,
    updated_at: now,
  };

  if (guestData.email && guestData.email.trim()) {
    updatePayload.email = guestData.email.trim();
  }
  if (guestData.telephone && guestData.telephone.trim()) {
    updatePayload.telephone = guestData.telephone.trim();
  }

  const { data: updatedRow, error: updateErr } = await supabase
    .from('guests')
    .update(updatePayload)
    .eq('id', existingRow.id)
    .select()
    .single();

  if (updateErr || !updatedRow) {
    console.error('submitRsvpAction update error:', updateErr);
    return { success: false, message: "Erreur lors de l'enregistrement de votre confirmation." };
  }

  const savedRecord = await parseGuestFromDb(updatedRow);

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
