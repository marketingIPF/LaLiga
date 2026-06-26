import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { ACTION_TYPES } from '../lib/constants'

/**
 * Listado en tiempo real de solicitudes (filtrable por estado y/o agente).
 */
export function useActionRequests({ userId = null, status = null } = {}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const constraints = []
    if (userId) constraints.push(where('userId', '==', userId))
    if (status) constraints.push(where('status', '==', status))
    constraints.push(orderBy('createdAt', 'desc'))

    const q = query(collection(db, COL.actionRequests), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('useActionRequests error', err)
        setLoading(false)
      }
    )
    return unsub
  }, [userId, status])

  return { requests, loading }
}

/**
 * Crear una nueva solicitud (la firma el agente, queda pending).
 */
export async function submitActionRequest({ user, actionType, notes = '' }) {
  const action = ACTION_TYPES[actionType]
  if (!action) throw new Error('Tipo de acción no válido')

  return addDoc(collection(db, COL.actionRequests), {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    groupId: user.groupId ?? null,
    actionType: action.id,
    actionLabel: action.label,
    points: action.points,
    notes: notes.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
  })
}

/**
 * Aprobar una solicitud: marca como aprobada y suma puntos al agente y al grupo
 * en una sola transacción (atomicidad garantizada).
 */
export async function approveRequest({ requestId, adminUid }) {
  const reqRef = doc(db, COL.actionRequests, requestId)

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) throw new Error('Solicitud no encontrada')
    const req = reqSnap.data()
    if (req.status !== 'pending') throw new Error('La solicitud ya fue revisada')

    const userRef = doc(db, COL.users, req.userId)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('Agente no encontrado')

    // Sumar puntos al agente
    tx.update(userRef, {
      points: increment(req.points),
      lifetimePoints: increment(req.points),
      lastActionAt: serverTimestamp(),
    })

    // Sumar puntos al grupo si existe
    if (req.groupId) {
      const groupRef = doc(db, COL.groups, req.groupId)
      tx.update(groupRef, {
        totalPoints: increment(req.points),
      })
    }

    // Cerrar la solicitud
    tx.update(reqRef, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid,
    })
  })
}

/**
 * Rechazar una solicitud.
 */
export async function rejectRequest({ requestId, adminUid, note = '' }) {
  const reqRef = doc(db, COL.actionRequests, requestId)
  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) throw new Error('Solicitud no encontrada')
    if (reqSnap.data().status !== 'pending') throw new Error('Ya fue revisada')
    tx.update(reqRef, {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid,
      reviewNote: note,
    })
  })
}
