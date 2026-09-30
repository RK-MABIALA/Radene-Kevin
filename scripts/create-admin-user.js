const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgdoudwqamjxlzawqtkl.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZG91ZHdxYW1qeGx6YXdxdGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4MTczMywiZXhwIjoyMTA2MzU3NzMzfQ.ELWyHoxDpnGyYQeOW4VylZcH8raUHlkoXujn97jivjc';

const ws = require('ws');

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
});

async function createOrUpdateAdmin(email, password, fullName, role = 'ADMIN') {
  console.log(`\n🔍 Vérification du compte pour: ${email}...`);

  // 1. Lister les utilisateurs pour voir s'il existe déjà
  const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', listError);
    return;
  }

  const existing = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  let userId;

  if (existing) {
    console.log(`ℹ️ Le compte existe déjà (ID: ${existing.id}). Mise à jour du mot de passe et des métadonnées...`);
    const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: password,
      email_confirm: true,
      user_metadata: {
        role: role,
        full_name: fullName,
      },
    });

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return;
    }
    userId = updated.user.id;
    console.log(`✅ Compte mis à jour avec succès !`);
  } else {
    console.log(`✨ Création d'un nouveau compte...`);
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: role,
        full_name: fullName,
      },
    });

    if (createError) {
      console.error('❌ Erreur lors de la création:', createError);
      return;
    }
    userId = created.user.id;
    console.log(`✅ Compte créé avec succès (ID: ${userId}) !`);
  }

  // 2. Assigner le rôle dans la table `user_roles`
  try {
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role,
      }, { onConflict: 'user_id' });

    if (roleError) {
      console.warn('⚠️ Note sur user_roles:', roleError.message);
    } else {
      console.log(`✅ Rôle "${role}" enregistré dans la table user_roles.`);
    }
  } catch (err) {
    console.warn('⚠️ Exception user_roles:', err.message);
  }
}

async function main() {
  console.log('🚀 Configuration des comptes administrateurs...');

  // Compte officiel des mariés
  await createOrUpdateAdmin(
    'radenkevinmabiala@gmail.com',
    'RK-Mab2023',
    'Radène & Kévin Mabiala',
    'ADMIN'
  );

  // Compte admin générique
  await createOrUpdateAdmin(
    'admin@radene-kevin.com',
    'Mariage2026!',
    'Administrateur Mariage',
    'ADMIN'
  );

  // Compte équipe protocole
  await createOrUpdateAdmin(
    'protocole@radene-kevin.com',
    'Protocole2026!',
    'Équipe Protocole & Accueil',
    'PROTOCOLE'
  );

  console.log('\n🎉 Tous les comptes sont configurés et opérationnels !');
}

main().catch(console.error);
