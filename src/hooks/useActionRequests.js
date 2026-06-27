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
import { ACTION_TYPES } from '../lib/constants'

/**
 * Convierte un Firestore Timestamp (o un string/null) a milisegundos
 * para poder comparar. Devuelve 0 si no hay timestamp todavía
 * (los pending acabados de crear pueden tener createdAt=null durante 1 tick).
 */
function tsMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}

/**
 * Listado en tiempo real de solicitudes (filtrable por estado y/o agente).
 * Ordenamos en cliente para evitar índices compuestos en Firestore.
 */
export function useActionRequests({ userId = null, status = null } = {}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const constraints = []
    if (userId) constraints.push(where('userId', '==', userId))
    if (status) constraints.push(where('status', '==', status))

    const q = constraints.length
      ? query(collection(db, COL.actionRequests), ...constraints)
      : collection(db, COL.actionRequests)

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt))
        setRequests(docs)
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

    tx.update(userRef, {
      points: increment(req.points),
      lifetimePoints: increment(req.points),
      lastActionAt: serverTimestamp(),
    })

    if (req.groupId) {
      const groupRef = doc(db, COL.groups, req.groupId)
      tx.update(groupRef, {
        totalPoints: increment(req.points),
      })
    }

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
