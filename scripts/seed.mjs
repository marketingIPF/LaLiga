// ====================================================================
// La Liga · Script de seed (Node.js)
// --------------------------------------------------------------------
// Crea cuentas en Firebase Auth (UID = id del agente) y siembra los
// documentos correspondientes en Firestore. Idempotente: si ya existe
// el usuario, lo actualiza en lugar de duplicar.
//
// Uso:
//   1. Descarga la clave de servicio de Firebase Admin (JSON) desde
//      Project Settings → Service accounts → Generate new private key.
//   2. Guárdala como `service-account.json` en la raíz del proyecto
//      (NO la subas al repo — ya está en .gitignore).
//   3. Ejecuta:   node scripts/seed.mjs
//
// Contraseña inicial de cada usuario = los últimos 9 dígitos de su
// teléfono. Se les pedirá cambiarla en el primer login (opcional).
// ====================================================================

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { SEED_USERS, SEED_GROUPS, assignGroup, isAdminRole } from '../src/data/seedUsers.js'

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const adminAuth = getAuth()
const db = getFirestore()

async function upsertAuthUser(user) {
  const uid = user.id
  try {
    await adminAuth.getUser(uid)
    await adminAuth.updateUser(uid, {
      email: user.email,
      displayName: user.name,
    })
    return 'updated'
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        uid,
        email: user.email,
        emailVerified: false,
        displayName: user.name,
        password: user.phone, // contraseña inicial = teléfono
        disabled: false,
      })
      return 'created'
    }
    throw e
  }
}

async function seedGroups() {
  console.log('\n📁  Sembrando grupos...')
  const batch = db.batch()
  for (const g of SEED_GROUPS) {
    const ref = db.collection('groups').doc(g.id)
    batch.set(
      ref,
      {
        name: g.name,
        color: g.color,
        totalPoints: 0,
        memberCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }
  await batch.commit()
  console.log(`   ✓ ${SEED_GROUPS.length} grupos listos`)
}

async function seedUsers() {
  console.log('\n👥  Sembrando usuarios (Auth + Firestore)...')
  const groupCounts = {}

  for (let i = 0; i < SEED_USERS.length; i++) {
    const u = SEED_USERS[i]
    const groupId = isAdminRole(u.role) ? null : assignGroup(i)
    if (groupId) groupCounts[groupId] = (groupCounts[groupId] ?? 0) + 1

    try {
      const status = await upsertAuthUser(u)

      await db.collection('users').doc(u.id).set(
        {
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          groupId,
          points: 0,
          lifetimePoints: 0,
          createdAt: FieldValue.serverTimestamp(),
          lastActionAt: null,
        },
        { merge: true }
      )

      console.log(`   ✓ [${status}] ${u.name} (${u.role})`)
    } catch (e) {
      console.error(`   ✗ Error con ${u.name}:`, e.message)
    }
  }

  // Actualiza el memberCount de cada grupo
  console.log('\n🔢  Actualizando contadores de grupo...')
  for (const [groupId, count] of Object.entries(groupCounts)) {
    await db.collection('groups').doc(groupId).update({ memberCount: count })
  }
}

async function main() {
  console.log('🚀 La Liga · Seed inicial')
  console.log('   Inmobiliaria RK Palanca Fontestad')
  await seedGroups()
  await seedUsers()
  console.log('\n✅  Seed completado.')
  console.log('\n📲  Credenciales iniciales:')
  console.log('   email    → email corporativo del agente')
  console.log('   password → su número de teléfono (se cambia en el primer login)\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('Seed falló:', e)
  process.exit(1)
})
