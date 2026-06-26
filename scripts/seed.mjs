// ====================================================================
// La Liga · Script de seed (Node.js)
// --------------------------------------------------------------------
// Crea cuentas en Firebase Auth (UID = id del agente) y siembra los
// documentos correspondientes en Firestore. Idempotente: si ya existe
// el usuario, lo actualiza en lugar de duplicar.
//
// Los EQUIPOS no se siembran: los crean los Codirectores desde la app.
//
// Uso:
//   1. Descarga la clave de servicio de Firebase Admin (JSON) desde
//      Project Settings → Service accounts → Generate new private key.
//   2. Guárdala como `service-account.json` en la raíz del proyecto
//      (NO la subas al repo — ya está en .gitignore).
//   3. Ejecuta:   node scripts/seed.mjs
//
// Contraseña inicial de cada usuario = su teléfono (la cambian en
// el primer login, forzado por mustChangePassword).
// ====================================================================

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { SEED_USERS } from '../src/data/seedUsers.js'

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

async function seedUsers() {
  console.log('\n👥  Sembrando usuarios (Auth + Firestore)...')

  for (const u of SEED_USERS) {
    try {
      const status = await upsertAuthUser(u)

      await db.collection('users').doc(u.id).set(
        {
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          groupId: null, // sin equipo de inicio; los admins lo asignan en la app
          points: 0,
          lifetimePoints: 0,
          mustChangePassword: true,
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
}

async function main() {
  console.log('🚀 La Liga · Seed inicial')
  console.log('   Inmobiliaria RK Palanca Fontestad')
  await seedUsers()
  console.log('\n✅  Seed completado.')
  console.log('\n📲  Credenciales iniciales:')
  console.log('   email    → email corporativo del agente')
  console.log('   password → su número de teléfono (forzado a cambiar en el primer login)')
  console.log('\n🏆  Los equipos se crean desde la app (panel Codirector).\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('Seed falló:', e)
  process.exit(1)
})
