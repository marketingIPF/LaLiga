// ====================================================================
// La Liga · Script de RESET de equipos (Node.js)
// --------------------------------------------------------------------
// Borra todos los equipos existentes y deja a todos los agentes
// sin equipo (groupId: null). Úsalo UNA VEZ para limpiar los equipos
// sembrados por error (Norte / Sur / Centro / Metro).
//
// Después de esto, los Codirectores crean los equipos desde la app.
//
// Uso:   node scripts/reset-groups.mjs
// ====================================================================

import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function main() {
  console.log('🧹 La Liga · Reset de equipos')

  // 1. Quitar groupId a todos los usuarios
  console.log('\n👥  Quitando groupId a todos los usuarios...')
  const usersSnap = await db.collection('users').get()
  let updated = 0
  for (const docSnap of usersSnap.docs) {
    if (docSnap.data().groupId !== null) {
      await docSnap.ref.update({ groupId: null })
      updated++
    }
  }
  console.log(`   ✓ ${updated} usuarios actualizados`)

  // 2. Borrar todos los grupos
  console.log('\n📁  Borrando todos los equipos...')
  const groupsSnap = await db.collection('groups').get()
  let deleted = 0
  for (const docSnap of groupsSnap.docs) {
    await docSnap.ref.delete()
    deleted++
  }
  console.log(`   ✓ ${deleted} equipos borrados`)

  console.log('\n✅  Reset completado. Ahora crea los equipos desde la app.')
  process.exit(0)
}

main().catch((e) => {
  console.error('Reset falló:', e)
  process.exit(1)
})
