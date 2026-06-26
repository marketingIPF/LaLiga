import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, COL } from '../lib/firebase'

/**
 * Suscripción en tiempo real a todos los usuarios.
 * Devuelve además el top histórico de la agencia (para calcular el Embajador).
 */
export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL.users), orderBy('points', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('useUsers error', err)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  const topLifetime = useMemo(
    () => users.reduce((max, u) => Math.max(max, u.lifetimePoints ?? 0), 0),
    [users]
  )

  return { users, topLifetime, loading }
}
