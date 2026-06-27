import { writeBatch, doc, getDocs, collection } from 'firebase/firestore'
import { db, COL } from './firebase'

/**
 * Resetea TODOS los puntos del periodo y facturación del periodo a cero
 * para todos los usuarios y grupos. No toca lifetimePoints ni totalBilling.
 *
 * Solo debe ejecutarlo un admin. Las reglas de Firestore lo refuerzan.
 */
export async function resetPeriod() {
  const [usersSnap, groupsSnap] = await Promise.all([
    getDocs(collection(db, COL.users)),
    getDocs(collection(db, COL.groups)),
  ])

  // Firestore batch tiene un límite de 500 operaciones. Para 25 users + N grupos
  // estamos muy por debajo, pero por seguridad partimos en bloques de 400.
  const allWrites = []
  for (const u of usersSnap.docs) {
    allWrites.push({
      ref: doc(db, COL.users, u.id),
      data: { points: 0, periodBilling: 0 },
    })
  }
  for (const g of groupsSnap.docs) {
    allWrites.push({
      ref: doc(db, COL.groups, g.id),
      data: { totalPoints: 0, totalBilling: 0 },
    })
  }

  const chunks = []
  for (let i = 0; i < allWrites.length; i += 400) {
    chunks.push(allWrites.slice(i, i + 400))
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db)
    for (const w of chunk) batch.update(w.ref, w.data)
    await batch.commit()
  }

  return { users: usersSnap.size, groups: groupsSnap.size }
}
