import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, COL } from '../lib/firebase'

// ====================================================================
// Suscripción COMPARTIDA a la colección de usuarios
// --------------------------------------------------------------------
// Antes, cada componente que llamaba a useUsers() abría su propia
// escucha en tiempo real a TODA la colección. Con Ranking, Panel,
// PanelPuntos, PanelAgentes, Logros y GestionEquipos usándolo, eso
// significaba descargar los mismos datos varias veces y, al cambiar de
// pantalla, volver a empezar de cero (de ahí los rankings que aparecían
// a medias hasta cerrar y reabrir).
//
// Ahora hay una sola escucha para toda la app: el primer componente que
// monta la abre, los demás se enganchan al resultado ya cargado. Cuando
// nadie la usa, se cierra tras un margen (para que navegar entre
// pantallas no la destruya y recree). Los datos quedan en memoria, así
// que al volver a una pantalla se pintan al instante.
//
// La API del hook no cambia: { users, topLifetime, loading }. Ningún
// otro archivo necesita tocarse.
// ====================================================================

const SUBSCRIPTION_IDLE_MS = 30000 // margen antes de cerrar la escucha

const store = {
  users: [],
  loading: true,
  fromCache: true,
  listeners: new Set(),
  unsub: null,
  idleTimer: null,
}

function emit() {
  store.listeners.forEach((notify) => notify())
}

function openSubscription() {
  if (store.unsub) return
  const q = query(collection(db, COL.users), orderBy('points', 'desc'))
  store.unsub = onSnapshot(
    q,
    (snap) => {
      store.users = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      store.loading = false
      // fromCache = los datos vienen de la caché del dispositivo y puede
      // que aún falten cambios del servidor.
      store.fromCache = snap.metadata?.fromCache ?? false
      emit()
    },
    (err) => {
      console.error('useUsers error', err)
      store.loading = false
      emit()
    }
  )
}

function ensureSubscribed() {
  if (store.idleTimer) {
    clearTimeout(store.idleTimer)
    store.idleTimer = null
  }
  openSubscription()
}

function scheduleClose() {
  if (store.listeners.size > 0 || store.idleTimer) return
  store.idleTimer = setTimeout(() => {
    store.idleTimer = null
    if (store.listeners.size === 0 && store.unsub) {
      store.unsub()
      store.unsub = null
      // Mantenemos `users` en memoria a propósito: si el usuario vuelve a
      // una pantalla, ve los datos al momento en lugar de un hueco.
    }
  }, SUBSCRIPTION_IDLE_MS)
}

/**
 * Limpia la caché compartida. Útil al cerrar sesión, para que un usuario
 * no vea por un instante los datos de la sesión anterior.
 */
export function resetUsersCache() {
  if (store.unsub) {
    store.unsub()
    store.unsub = null
  }
  if (store.idleTimer) {
    clearTimeout(store.idleTimer)
    store.idleTimer = null
  }
  store.users = []
  store.loading = true
  store.fromCache = true
  emit()
}

/**
 * Suscripción en tiempo real a todos los usuarios (compartida).
 * Devuelve además el top histórico de la agencia (para el Embajador).
 */
export function useUsers() {
  const [state, setState] = useState(() => ({
    users: store.users,
    loading: store.loading,
    fromCache: store.fromCache,
  }))

  useEffect(() => {
    const notify = () =>
      setState({
        users: store.users,
        loading: store.loading,
        fromCache: store.fromCache,
      })

    store.listeners.add(notify)
    ensureSubscribed()
    notify() // sincroniza con lo que ya hubiera cargado

    return () => {
      store.listeners.delete(notify)
      scheduleClose()
    }
  }, [])

  const topLifetime = useMemo(
    () => state.users.reduce((max, u) => Math.max(max, u.lifetimePoints ?? 0), 0),
    [state.users]
  )

  return {
    users: state.users,
    topLifetime,
    loading: state.loading,
    fromCache: state.fromCache,
  }
}
