// ====================================================================
// La Liga · Alta de Alex Moreno y Andrea Máñez (Staff)
// --------------------------------------------------------------------
// Crea las dos cuentas (Auth + Firestore) en la liga 'staff' y las
// añade a SEED_STAFF en src/data/seedUsers.js.
//
// - Alex Moreno: sin teléfono. ID 'staff-alex', contraseña 'Alex2026'.
// - Andrea Máñez: ID = teléfono, contraseña = teléfono.
//
// Idempotente: puedes ejecutarlo varias veces sin duplicar.
//
// Uso desde Codespaces (raíz del repo, con service-account.json):
//   node scripts/add-alex-andrea.mjs
// Después: git add . && git commit -m "Alta Alex Moreno y Andrea Máñez (Staff)" && git push
// ====================================================================

import { readFileSync, writeFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const NUEVOS = [
  {
    id: 'staff-alex',
    name: 'Alex Moreno',
    role: 'Staff',
    league: 'staff',
    email: 'info@inmobiliariapalanca.com',
    password: 'Alex2026',
    phone: null,
  },
  {
    id: '653569847',
    name: 'Andrea Máñez',
    role: 'Staff',
    league: 'staff',
    email: 'andrea@inmobiliariapalanca.com',
    password: '653569847',
    phone: '653569847',
  },
]

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const adminAuth = getAuth()
const db = getFirestore()

async function upsertAuth(u) {
  try {
    await adminAuth.getUser(u.id)
    await adminAuth.updateUser(u.id, { email: u.email, displayName: u.name })
    return 'ya existía, actualizado'
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        uid: u.id,
        email: u.email,
        emailVerified: false,
        displayName: u.name,
        password: u.password,
        disabled: false,
      })
      return 'cuenta creada'
    }
    throw e
  }
}

async function upsertDoc(u) {
  const ref = db.collection('users').doc(u.id)
  const snap = await ref.get()
  if (snap.exists) {
    await ref.update({ name: u.name, role: u.role, league: u.league, email: u.email })
    return 'doc ya existía, actualizado'
  }
  await ref.set({
    name: u.name,
    email: u.email,
    role: u.role,
    league: u.league,
    groupId: null,
    points: 0,
    lifetimePoints: 0,
    inTop3: false,
    mustChangePassword: true,
    lastActionAt: null,
    createdAt: FieldValue.serverTimestamp(),
  })
  return 'doc creado'
}

async function main() {
  console.log('— Alta de nuevos Staff…')
  for (const u of NUEVOS) {
    const a = await upsertAuth(u)
    const d = await upsertDoc(u)
    console.log(`  ${u.name} → auth: ${a} · firestore: ${d}`)
  }

  // Añadir a SEED_STAFF para futuros reseeds
  const FILE = 'src/data/seedUsers.js'
  let c = readFileSync(FILE, 'utf8')
  const lines = [
    "  { id: 'staff-alex', name: 'Alex Moreno', role: 'Staff', league: 'staff', email: 'info@inmobiliariapalanca.com', phone: '' },",
    "  { id: '653569847', name: 'Andrea Máñez', role: 'Staff', league: 'staff', email: 'andrea@inmobiliariapalanca.com', phone: '653569847' },",
  ]
  const anchor = "  { id: '621022064', name: 'Pedro Carrillo', role: 'Staff', league: 'staff', email: 'facturacion@inmobiliariapalanca.com', phone: '621022064' },"
  let added = 0
  if (c.includes(anchor)) {
    let insert = ''
    if (!c.includes("'staff-alex'")) { insert += '\n' + lines[0]; added++ }
    if (!c.includes("id: '653569847'")) { insert += '\n' + lines[1]; added++ }
    if (insert) {
      c = c.replace(anchor, anchor + insert)
      writeFileSync(FILE, c)
    }
    console.log(`— seedUsers.js: ${added} añadidos${added ? ' (haz commit)' : ' (ya estaban)'}`)
  } else {
    console.log('  ⚠️  No encontré el ancla en seedUsers.js. Añade a mano a SEED_STAFF:')
    lines.forEach((l) => console.log(l))
  }

  console.log('\n✓ Listo. Alex (contraseña Alex2026) y Andrea (contraseña 653569847).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
