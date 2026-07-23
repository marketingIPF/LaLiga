// ====================================================================
// La Liga · Alta de Vicky (Staff)
// --------------------------------------------------------------------
// - Crea la cuenta de Vicky (Auth + Firestore) en la liga 'staff'.
//   ID: 'staff-vicky' (su número lo usa Mireia como ID, no se puede
//   repetir). Contraseña inicial: 662658360, cambio forzado al entrar.
// - Añade a Vicky a SEED_STAFF en src/data/seedUsers.js.
// - Actualiza el teléfono de Mireia en SEED_STAFF (657169789), solo
//   como ficha de referencia — no cambia su cuenta ni su contraseña.
//
// Idempotente. Uso desde Codespaces (raíz, con service-account.json):
//   node scripts/add-vicky.mjs
// Después: git add src/data/seedUsers.js scripts/add-vicky.mjs && git commit -m "Alta Vicky (Staff)" && git push
// ====================================================================

import { readFileSync, writeFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const VICKY = {
  id: 'staff-vicky',
  name: 'Vicky',
  role: 'Staff',
  league: 'staff',
  email: 'vicky@inmobiliariapalanca.com',
  password: '662658360',
}

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const adminAuth = getAuth()
const db = getFirestore()

async function main() {
  // 1) Auth
  try {
    await adminAuth.getUser(VICKY.id)
    await adminAuth.updateUser(VICKY.id, { email: VICKY.email, displayName: VICKY.name })
    console.log('  Auth: ya existía, actualizado')
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        uid: VICKY.id,
        email: VICKY.email,
        emailVerified: false,
        displayName: VICKY.name,
        password: VICKY.password,
        disabled: false,
      })
      console.log('  Auth: cuenta creada (contraseña inicial: 662658360)')
    } else {
      throw e
    }
  }

  // 2) Firestore
  const ref = db.collection('users').doc(VICKY.id)
  const snap = await ref.get()
  if (snap.exists) {
    await ref.update({ name: VICKY.name, role: VICKY.role, league: VICKY.league, email: VICKY.email })
    console.log('  Firestore: doc ya existía, actualizado')
  } else {
    await ref.set({
      name: VICKY.name,
      email: VICKY.email,
      role: VICKY.role,
      league: VICKY.league,
      groupId: null,
      points: 0,
      lifetimePoints: 0,
      inTop3: false,
      mustChangePassword: true,
      lastActionAt: null,
      createdAt: FieldValue.serverTimestamp(),
    })
    console.log('  Firestore: doc creado')
  }

  // 3) seedUsers.js: añadir a Vicky + actualizar móvil de Mireia
  const FILE = 'src/data/seedUsers.js'
  let c = readFileSync(FILE, 'utf8')
  let touched = false

  if (!c.includes("'staff-vicky'")) {
    const anchor = "  { id: '621022064', name: 'Pedro Carrillo', role: 'Staff', league: 'staff', email: 'facturacion@inmobiliariapalanca.com', phone: '621022064' },"
    const line = "  { id: 'staff-vicky', name: 'Vicky', role: 'Staff', league: 'staff', email: 'vicky@inmobiliariapalanca.com', phone: '662658360' },"
    if (c.includes(anchor)) {
      c = c.replace(anchor, anchor + '\n' + line)
      touched = true
      console.log('  seedUsers.js: Vicky añadida a SEED_STAFF')
    } else {
      console.log('  ⚠️  No encontré el ancla de Pedro; añade a mano a SEED_STAFF:')
      console.log(line)
    }
  } else {
    console.log('  seedUsers.js: Vicky ya estaba')
  }

  const mireiaOld = "{ id: '662658360', name: 'Mireia Sáez', role: 'Staff', league: 'staff', email: 'msaez@inmobiliariapalanca.com', phone: '662658360' }"
  const mireiaNew = "{ id: '662658360', name: 'Mireia Sáez', role: 'Staff', league: 'staff', email: 'msaez@inmobiliariapalanca.com', phone: '657169789' }"
  if (c.includes(mireiaOld)) {
    c = c.replace(mireiaOld, mireiaNew)
    touched = true
    console.log('  seedUsers.js: móvil de Mireia actualizado (657169789)')
  }

  if (touched) writeFileSync(FILE, c)

  console.log('\n✓ Vicky dada de alta en la liga Staff.')
  console.log('  Login: vicky@inmobiliariapalanca.com · contraseña inicial: 662658360')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
