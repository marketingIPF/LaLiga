// ====================================================================
// La Liga · Seed de Staff + Obra Nueva (v2)
// --------------------------------------------------------------------
// - Crea las 11 cuentas nuevas (Auth + Firestore)
// - Actualiza a Rober y Almudena con league: 'staff' (siguen siendo admins)
// - Añade league: 'agentes' a los agentes existentes que no lo tengan
// - Idempotente: puedes ejecutarlo varias veces sin duplicar
//
// Uso (igual que seed.mjs):
//   1. service-account.json en la raíz (NO subir al repo)
//   2. node scripts/seed-staff.mjs
// ====================================================================

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { SEED_STAFF } from '../src/data/seedUsers.js'

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const adminAuth = getAuth()
const db = getFirestore()

async function upsertAuthUser(user) {
  const uid = user.id
  try {
    await adminAuth.getUser(uid)
    await adminAuth.updateUser(uid, { email: user.email, displayName: user.name })
    return 'updated'
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        uid,
        email: user.email,
        emailVerified: false,
        displayName: user.name,
        password: user.phone,
        disabled: false,
      })
      return 'created'
    }
    throw e
  }
}

async function upsertUserDoc(user) {
  const ref = db.collection('users').doc(user.id)
  const snap = await ref.get()
  if (snap.exists) {
    await ref.update({ name: user.name, role: user.role, league: user.league, email: user.email })
    return 'updated'
  }
  await ref.set({
    name: user.name,
    email: user.email,
    role: user.role,
    league: user.league,
    groupId: null,
    points: 0,
    lifetimePoints: 0,
    periodBilling: 0,
    totalBilling: 0,
    inTop3: false,
    mustChangePassword: true,
    lastActionAt: null,
    createdAt: FieldValue.serverTimestamp(),
  })
  return 'created'
}

async function main() {
  console.log('— Sembrando Staff + Obra Nueva…')
  for (const user of SEED_STAFF) {
    const a = await upsertAuthUser(user)
    const d = await upsertUserDoc(user)
    console.log(`  ${user.name} → auth:${a} · doc:${d}`)
  }

  console.log('— Actualizando admins que compiten (Rober, Almudena)…')
  for (const id of ['admin-rober', 'admin-almudena']) {
    const ref = db.collection('users').doc(id)
    const snap = await ref.get()
    if (snap.exists) {
      await ref.update({ league: 'staff' })
      console.log(`  ${id} → league: staff`)
    } else {
      console.log(`  ⚠️  ${id} no existe en Firestore, sáltalo`)
    }
  }

  console.log('— Añadiendo league:agentes a los agentes existentes…')
  const agentsSnap = await db
    .collection('users')
    .where('role', '==', 'Agente Comercial')
    .get()
  let patched = 0
  for (const doc of agentsSnap.docs) {
    if (!doc.data().league) {
      await doc.ref.update({ league: 'agentes' })
      patched++
    }
  }
  console.log(`  ${patched} agentes actualizados`)

  console.log('✓ Seed completado')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
