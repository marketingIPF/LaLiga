import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fsLimit,
  doc,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { ACTION_TYPES } from '../lib/constants'
import {
  notifyActionPending,
  notifyActionApproved,
  notifyActionRejected,
  checkAndNotifyTop3,
} from '../lib/notifications'

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
 *
 * `max` limita cuántas se descargan. Importa mucho en las pestañas de
 * "Aprobadas" / "Rechazadas": el histórico crece sin parar (sobre todo con
 * las cargas masivas del CRM) y no tiene sentido traerlo entero al móvil.
 *
 * Para pedir "las N más recientes" hace falta un índice compuesto en
 * Firestore (status + createdAt). Si ese índice todavía no existe, la
 * consulta falla; en ese caso volvemos automáticamente al modo antiguo
 * (traer todo y ordenar en cliente) para que la pantalla nunca se quede
 * en blanco. Cuando el índice esté creado, se usa el camino rápido solo.
 */
export function useActionRequests({ userId = null, status = null, max = null } = {}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = null
    let cancelled = false

    const baseConstraints = []
    if (userId) baseConstraints.push(where('userId', '==', userId))
    if (status) baseConstraints.push(where('status', '==', status))

    const handleSnap = (snap, { sortInClient, sliceTo }) => {
      if (cancelled) return
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      if (sortInClient) {
        docs.sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt))
        if (sliceTo) docs = docs.slice(0, sliceTo)
      }
      setRequests(docs)
      setLoading(false)
    }

    // Plan B: sin orderBy/limit (no necesita índice). Ordena en cliente.
    const subscribeFallback = () => {
      const q = baseConstraints.length
        ? query(collection(db, COL.actionRequests), ...baseConstraints)
        : collection(db, COL.actionRequests)
      unsub = onSnapshot(
        q,
        (snap) => handleSnap(snap, { sortInClient: true, sliceTo: max }),
        (err) => {
          console.error('useActionRequests error', err)
          if (!cancelled) setLoading(false)
        }
      )
    }

    // Plan A: las N más recientes directamente del servidor.
    if (max) {
      const q = query(
        collection(db, COL.actionRequests),
        ...baseConstraints,
        orderBy('createdAt', 'desc'),
        fsLimit(max)
      )
      unsub = onSnapshot(
        q,
        (snap) => handleSnap(snap, { sortInClient: false }),
        (err) => {
          // Falta el índice compuesto: reintentamos sin él.
          if (err?.code === 'failed-precondition') {
            console.warn(
              'useActionRequests: falta el índice compuesto de Firestore ' +
                '(actionRequests: status Asc + createdAt Desc). Usando modo lento. ' +
                'Crea el índice para acelerar la app.'
            )
            if (unsub) unsub()
            if (!cancelled) subscribeFallback()
            return
          }
          console.error('useActionRequests error', err)
          if (!cancelled) setLoading(false)
        }
      )
    } else {
      subscribeFallback()
    }

    return () => {
      cancelled = true
      if (unsub) unsub()
    }
  }, [userId, status, max])

  return { requests, loading }
}

/**
 * Crear una nueva solicitud (la firma el agente, queda pending).
 */
// Tope de puntos por solicitud de autoservicio: lo fijan las reglas de
// Firestore (un usuario no puede crearse una solicitud de más de 200 pts).
export const SELF_REQUEST_MAX_POINTS = 200

/**
 * Cuántas unidades puede pedir un usuario de una acción en una sola
 * solicitud, sin pasarse del tope de puntos.
 *   RRSS (5 pts)   → hasta 40
 *   Reel (10 pts)  → hasta 20
 *   Evento (200)   → 1
 */
export function maxQuantityFor(action) {
  if (!action?.points || action.points <= 0) return 1
  return Math.max(1, Math.floor(SELF_REQUEST_MAX_POINTS / action.points))
}

/**
 * Crear una nueva solicitud (la firma el usuario, queda pending).
 *
 * `quantity` permite pedir varias unidades de la misma acción de golpe
 * (3 publicaciones en RRSS, 4 reseñas…). Se guarda UNA sola solicitud con
 * los puntos ya multiplicados, así el admin la aprueba de una vez en
 * lugar de tener que revisar tres entradas iguales.
 */
export async function submitActionRequest({
  user,
  actionType,
  notes = '',
  quantity = 1,
}) {
  const action = ACTION_TYPES[actionType]
  if (!action) throw new Error('Tipo de acción no válido')

  const qty = Math.min(
    maxQuantityFor(action),
    Math.max(1, Math.floor(Number(quantity) || 1))
  )
  const points = action.points * qty
  const label = qty > 1 ? `${action.label} ×${qty}` : action.label

  const result = await addDoc(collection(db, COL.actionRequests), {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    groupId: user.groupId ?? null,
    actionType: action.id,
    actionLabel: label,
    quantity: qty,
    points,
    notes: notes.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
  })

  // Notificar a todos los admins (best-effort, no bloquea el envío)
  notifyActionPending({ agentName: user.name, actionLabel: label }).catch((e) =>
    console.error('notifyActionPending failed', e)
  )

  return result
}

/**
 * Aprobar una solicitud: marca como aprobada y suma puntos al agente y al grupo
 * en una sola transacción (atomicidad garantizada).
 */
export async function approveRequest({ requestId, adminUid }) {
  const reqRef = doc(db, COL.actionRequests, requestId)
  let approvedReq = null

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

    approvedReq = req
  })

  // Notificar al agente + comprobar entradas al top 3
  if (approvedReq) {
    notifyActionApproved({
      userId: approvedReq.userId,
      actionLabel: approvedReq.actionLabel,
      points: approvedReq.points,
    }).catch((e) => console.error('notifyActionApproved failed', e))

    // Top 3: comprobamos en background (no bloquea la UI)
    checkAndNotifyTop3().catch((e) => console.error('checkAndNotifyTop3 failed', e))
  }
}

/**
 * Rechazar una solicitud.
 */
export async function rejectRequest({ requestId, adminUid, note = '' }) {
  const reqRef = doc(db, COL.actionRequests, requestId)
  let rejectedReq = null

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) throw new Error('Solicitud no encontrada')
    const data = reqSnap.data()
    if (data.status !== 'pending') throw new Error('Ya fue revisada')
    tx.update(reqRef, {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid,
      reviewNote: note,
    })
    rejectedReq = data
  })

  if (rejectedReq) {
    notifyActionRejected({
      userId: rejectedReq.userId,
      actionLabel: rejectedReq.actionLabel,
    }).catch((e) => console.error('notifyActionRejected failed', e))
  }
}
