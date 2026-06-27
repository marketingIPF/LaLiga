import { writeBatch, doc, getDocs, collection } from 'firebase/firestore'
import { db, COL } from './firebase'

const BATCH_SIZE = 400 // por seguridad, por debajo del límite de 500 de Firestore

async function commitChunks(operations) {
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    for (const op of chunk) {
      if (op.type === 'update') batch.update(op.ref, op.data)
      else if (op.type === 'delete') batch.delete(op.ref)
    }
    await batch.commit()
  }
}

/**
 * Reset SOLO del periodo: pone a cero los puntos y facturación del periodo
 * (tanto en usuarios como en equipos). Conserva lifetimePoints, totalBilling
 * y todas las solicitudes (aprobadas, rechazadas, pendientes).
 *
 * Pensado para uso en producción: inicio de trimestre, mes, etc.
 */
export async function resetPeriod() {
  const [usersSnap, groupsSnap] = await Promise.all([
    getDocs(collection(db, COL.users)),
    getDocs(collection(db, COL.groups)),
  ])

  const ops = []
  for (const u of usersSnap.docs) {
    ops.push({
      type: 'update',
      ref: doc(db, COL.users, u.id),
      data: { points: 0, periodBilling: 0, inTop3: false },
    })
  }
  for (const g of groupsSnap.docs) {
    ops.push({
      type: 'update',
      ref: doc(db, COL.groups, g.id),
      data: { totalPoints: 0, totalBilling: 0 },
    })
  }
  await commitChunks(ops)
  return { users: usersSnap.size, groups: groupsSnap.size }
}

/**
 * Reset TOTAL: además del periodo, borra el histórico (lifetimePoints,
 * totalBilling) y elimina todas las solicitudes (acciones y facturación).
 *
 * Pensado para pruebas / setup inicial. NO conserva ningún dato de actividad.
 * No toca usuarios, equipos ni roles.
 */
export async function resetAll() {
  const [usersSnap, groupsSnap, actionsSnap, billingSnap, notifsSnap] = await Promise.all([
    getDocs(collection(db, COL.users)),
    getDocs(collection(db, COL.groups)),
    getDocs(collection(db, COL.actionRequests)),
    getDocs(collection(db, COL.billingRequests)),
    getDocs(collection(db, COL.notifications)),
  ])

  const ops = []
  for (const u of usersSnap.docs) {
    ops.push({
      type: 'update',
      ref: doc(db, COL.users, u.id),
      data: {
        points: 0,
        lifetimePoints: 0,
        periodBilling: 0,
        totalBilling: 0,
        lastActionAt: null,
        inTop3: false,
      },
    })
  }
  for (const g of groupsSnap.docs) {
    ops.push({
      type: 'update',
      ref: doc(db, COL.groups, g.id),
      data: { totalPoints: 0, totalBilling: 0 },
    })
  }
  for (const a of actionsSnap.docs) {
    ops.push({ type: 'delete', ref: doc(db, COL.actionRequests, a.id) })
  }
  for (const b of billingSnap.docs) {
    ops.push({ type: 'delete', ref: doc(db, COL.billingRequests, b.id) })
  }
  for (const n of notifsSnap.docs) {
    ops.push({ type: 'delete', ref: doc(db, COL.notifications, n.id) })
  }
  await commitChunks(ops)

  return {
    users: usersSnap.size,
    groups: groupsSnap.size,
    actionRequests: actionsSnap.size,
    billingRequests: billingSnap.size,
    notifications: notifsSnap.size,
  }
}
