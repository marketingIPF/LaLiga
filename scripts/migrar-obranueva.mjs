// ====================================================================
// La Liga · Migración: separar liga 'staff' en 'staff' + 'obranueva'
// --------------------------------------------------------------------
// Reasigna en Firestore la liga de cada usuario según su rol:
//   role 'Obra Nueva' → league 'obranueva'
//   role 'Staff'      → league 'staff'
// Rober y Almudena (Codirector) se quedan en 'staff'.
// Los agentes no se tocan.
//
// Es idempotente: puedes ejecutarlo varias veces sin problema.
//
// Uso desde Codespaces (raíz del repo, con service-account.json):
//   node scripts/migrar-obranueva.mjs
// ====================================================================

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// Liga objetivo según el rol
function targetLeague(role) {
  if (role === 'Obra Nueva') return 'obranueva'
  if (role === 'Staff') return 'staff'
  return null // agentes y codirectores: no forzar aquí
}

async function main() {
  const snap = await db.collection('users').get()
  let changed = 0
  let skipped = 0

  for (const docSnap of snap.docs) {
    const u = docSnap.data()
    const target = targetLeague(u.role)

    // Solo tocamos roles Obra Nueva / Staff cuya liga no coincida ya
    if (target && u.league !== target) {
      await docSnap.ref.update({ league: target })
      console.log(`  ✓ ${u.name} (${u.role}) → league: ${target}`)
      changed++
    } else {
      skipped++
    }
  }

  console.log(`\n✓ Migración completada. ${changed} actualizados, ${skipped} sin cambios.`)
  console.log('Recuerda: los agentes y admins no se han tocado.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
