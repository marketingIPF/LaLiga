import { useEffect, useState, useMemo } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'

function tsMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}

/**
 * Suscripción en tiempo real a las notificaciones del usuario.
 * Ordenamos en cliente (createdAt desc) para evitar índices compuestos.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setLoading(false)
      return
    }

    const q = query(collection(db, COL.notifications), where('userId', '==', userId))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt))
        setNotifications(docs)
        setLoading(false)
      },
      (err) => {
        console.error('useNotifications error', err)
        setLoading(false)
      }
    )
    return unsub
  }, [userId])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  return { notifications, unreadCount, loading }
}

/**
 * Marca una notificación como leída.
 */
export async function markAsRead(notificationId) {
  const ref = doc(db, COL.notifications, notificationId)
  await updateDoc(ref, { read: true })
}

/**
 * Marca todas las notificaciones no leídas del usuario como leídas.
 */
export async function markAllAsRead(notifications) {
  const unread = notifications.filter((n) => !n.read)
  if (!unread.length) return
  const batch = writeBatch(db)
  unread.forEach((n) => {
    batch.update(doc(db, COL.notifications, n.id), { read: true })
  })
  await batch.commit()
}
