import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  doc,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import {
  notifyBillingPending,
  notifyBillingApproved,
  notifyBillingRejected,
  checkAndNotifyTop3,
} from '../lib/notifications'

function tsMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}

/**
 * Listado en tiempo real de facturaciones (filtrable por estado y/o agente).
 * Ordenamos en cliente para evitar índices compuestos en Firestore.
 */
export function useBillingRequests({ userId = null, status = null } = {}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const constraints = []
    if (userId) constraints.push(where('userId', '==', userId))
    if (status) constraints.push(where('status', '==', status))

    const q = constraints.length
      ? query(collection(db, COL.billingRequests), ...constraints)
      : collection(db, COL.billingRequests)

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt))
        setRequests(docs)
        setLoading(false)
      },
      (err) => {
        console.error('useBillingRequests error', err)
        setLoading(false)
      }
    )
    return unsub
  }, [userId, status])

  return { requests, loading }
}

/**
 * Crear nueva facturación (el agente reporta cantidad, queda pending).
 */
export async function submitBillingRequest({ user, amount, notes = '' }) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Importe no válido')
  }

  const result = await addDoc(collection(db, COL.billingRequests), {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    groupId: user.groupId ?? null,
    amount: value,
    notes: notes.trim(),
    status: 'pending',
    multiplier: null,
    finalAmount: null,
    createdAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
  })

  // Notificar a admins (best-effort, no bloquea)
  notifyBillingPending({ agentName: user.name, amount: value }).catch((e) =>
    console.error('notifyBillingPending failed', e)
  )

  return result
}

/**
 * Aprobar una facturación. El importe que entra es el reportado por el agente.
 * El bonus de la ruleta es físico (en oficina), fuera de la app.
 */
export async function approveBillingRequest({ requestId, adminUid }) {
  const reqRef = doc(db, COL.billingRequests, requestId)
  let approvedData = null

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) throw new Error('Facturación no encontrada')
    const req = reqSnap.data()
    if (req.status !== 'pending') throw new Error('Ya fue revisada')

    // El bonus de la ruleta se aplica fuera de la app, en la oficina.
    // En la app, el importe que entra al sistema es el reportado.
    const finalAmount = req.amount

    const userRef = doc(db, COL.users, req.userId)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('Agente no encontrado')

    tx.update(userRef, {
      periodBilling: increment(finalAmount),
      totalBilling: increment(finalAmount),
      lastActionAt: serverTimestamp(),
    })

    if (req.groupId) {
      const groupRef = doc(db, COL.groups, req.groupId)
      tx.update(groupRef, {
        totalBilling: increment(finalAmount),
      })
    }

    tx.update(reqRef, {
      status: 'approved',
      multiplier: 1,
      finalAmount,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid,
    })

    approvedData = { ...req, finalAmount }
  })

  if (approvedData) {
    notifyBillingApproved({
      userId: approvedData.userId,
      amount: approvedData.amount,
      finalAmount: approvedData.finalAmount,
    }).catch((e) => console.error('notifyBillingApproved failed', e))
  }
}

/**
 * Editar el multiplicador de una facturación YA APROBADA.
 * Calcula la diferencia entre el nuevo final y el anterior, y la aplica
 * de forma atómica al agente y al equipo. Conserva reviewedAt/reviewedBy
 * originales como histórico y añade editedAt/editedBy.
 */
export async function updateApprovedBillingMultiplier({ requestId, adminUid, newMultiplier }) {
  if (![0.5, 1, 2].includes(newMultiplier)) {
    throw new Error('Multiplicador no válido')
  }

  const reqRef = doc(db, COL.billingRequests, requestId)

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) throw new Error('Facturación no encontrada')
    const req = reqSnap.data()
    if (req.status !== 'approved') {
      throw new Error('Solo se pueden editar las facturaciones aprobadas')
    }
    if (req.multiplier === newMultiplier) return // sin cambios

    const oldFinal = req.finalAmount ?? 0
    const newFinal = Math.round(req.amount * newMultiplier * 100) / 100
    const delta = newFinal - oldFinal

    const userRef = doc(db, COL.users, req.userId)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('Agente no encontrado')

    tx.update(userRef, {
      periodBilling: increment(delta),
      totalBilling: increment(delta),
    })

    if (req.groupId) {
      const groupRef = doc(db, COL.groups, req.groupId)
      tx.update(groupRef, {
        totalBilling: increment(delta),
      })
    }

    tx.update(reqRef, {
      multiplier: newMultiplier,
      finalAmount: newFinal,
      editedAt: serverTimestamp(),
      editedBy: adminUid,
    })
  })
}

/**
 * Rechazar una facturación.
 */
export async function rejectBillingRequest({ requestId, adminUid, note = '' }) {
  const reqRef = doc(db, COL.billingRequests, requestId)
  let rejectedData = null

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) throw new Error('Facturación no encontrada')
    const data = reqSnap.data()
    if (data.status !== 'pending') throw new Error('Ya fue revisada')
    tx.update(reqRef, {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid,
      reviewNote: note,
    })
    rejectedData = data
  })

  if (rejectedData) {
    notifyBillingRejected({
      userId: rejectedData.userId,
      amount: rejectedData.amount,
    }).catch((e) => console.error('notifyBillingRejected failed', e))
  }
}
