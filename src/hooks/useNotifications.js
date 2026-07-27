import { useEffect, useState, useMemo, useRef } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  deleteDoc,
  limit,
} from 'firebase/firestore'
import { db, COL } from '../lib/firebase'

// Cuántas notificaciones LEÍDAS conservamos como máximo. Al superar este
// número, las leídas más antiguas se borran solas en segundo plano.
// Las no leídas nunca cuentan para este límite ni se tocan.
const MAX_READ_KEPT = 20

function tsMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  return new Date(value).getTime()
}

/**
 * Suscripción en tiempo real a las notificaciones del usuario.
 * Ordenamos en cliente (createdAt desc) para evitar índices compuestos.
 *
 * Además, cada vez que llega una actualización, si hay más de
 * MAX_READ_KEPT notificaciones leídas, borra las más antiguas en
 * segundo plano (silencioso, sin bloquear la UI).
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const pruningRef = useRef(false)

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

        // Auto-limpieza silenciosa de leídas antiguas (best-effort).
        if (!pruningRef.current) {
          const read = docs.filter((n) => n.read)
          if (read.length > MAX_READ_KEPT) {
            const toDelete = read.slice(MAX_READ_KEPT) // ya vienen ordenadas desc
            pruningRef.current = true
            deleteNotifications(toDelete.map((n) => n.id))
              .catch((e) => console.error('auto-prune notifications failed', e))
              .finally(() => {
                pruningRef.current = false
              })
          }
        }
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
 * Hook LIGERO solo para el indicador de la campana.
 *
 * La campana vive en la cabecera de todas las pantallas, así que no puede
 * permitirse descargar el histórico completo de notificaciones (que es lo
 * que hacía antes vía useNotifications). Aquí pedimos únicamente las NO
 * leídas y con un tope pequeño: para pintar el punto naranja basta saber
 * si hay al menos una.
 *
 * Nota: son dos filtros de igualdad (userId + read), que Firestore resuelve
 * combinando índices simples. No hace falta crear ningún índice compuesto.
 */
export function useUnreadCount(userId) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      return
    }
    const q = query(
      collection(db, COL.notifications),
      where('userId', '==', userId),
      where('read', '==', false),
      limit(20)
    )
    const unsub = onSnapshot(
      q,
      (snap) => setUnreadCount(snap.size),
      (err) => {
        console.error('useUnreadCount error', err)
        setUnreadCount(0)
      }
    )
    return unsub
  }, [userId])

  return unreadCount
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

/**
 * Borra una lista de notificaciones por id (batch, hasta 500 a la vez
 * que es el límite de Firestore; con los volúmenes de esta app nunca
 * se acerca).
 */
export async function deleteNotifications(ids) {
  if (!ids.length) return
  const batch = writeBatch(db)
  ids.forEach((id) => batch.delete(doc(db, COL.notifications, id)))
  await batch.commit()
}

/**
 * Borra una única notificación.
 */
export async function deleteNotification(id) {
  await deleteDoc(doc(db, COL.notifications, id))
}

/**
 * Borra todas las notificaciones YA LEÍDAS del usuario. Las no leídas
 * se conservan siempre.
 */
export async function deleteAllRead(notifications) {
  const read = notifications.filter((n) => n.read)
  await deleteNotifications(read.map((n) => n.id))
  return read.length
}
