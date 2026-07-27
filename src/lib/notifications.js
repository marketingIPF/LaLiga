// ============================================================
// La Liga · Notificaciones in-app
// ============================================================
// Helpers centralizados para crear notificaciones desde cualquier
// punto del código. Se basan en una colección `notifications` en
// Firestore. Cada doc tiene: userId (destinatario), type, title,
// message, link, read, createdAt, metadata.
//
// Tipos:
//   - action_pending      → admin: hay una nueva acción por aprobar
//   - action_approved     → agente: te han aprobado la acción
//   - action_rejected     → agente: te han rechazado la acción
//   - team_added          → agente: te han metido en un equipo
//   - top3_ranking        → agente: has entrado en el top 3
// ============================================================

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, COL } from './firebase'

// ----------------------------------------------------------------
// Ajustes de rendimiento
// ----------------------------------------------------------------

// Avisar a TODOS los admins cada vez que un agente registra una acción
// genera mucho ruido (una notificación por admin por envío) y hace que la
// campana y la lista crezcan sin parar. La pantalla de Aprobaciones ya
// muestra el contador de pendientes, así que por defecto está desactivado.
// Ponlo en true si algún día queréis recuperar el aviso.
const NOTIFY_ADMINS_ON_NEW_REQUEST = false

// checkAndNotifyTop3 tiene que leer usuarios para recalcular el podio.
// Ejecutarlo en CADA aprobación lo hacía lento. Con esto se ejecuta como
// máximo una vez cada X minutos por dispositivo; el podio no necesita ser
// instantáneo al segundo.
const TOP3_THROTTLE_MINUTES = 10
const TOP3_LAST_RUN_KEY = 'laliga-top3-last-run'

// Ligas de personas vigentes
const PERSON_LEAGUES = ['agentes', 'obranueva', 'staff']

// ----------------------------------------------------------------
// Núcleo: crear una notificación
// ----------------------------------------------------------------

export async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  metadata = {},
}) {
  if (!userId || !type || !title) {
    console.warn('createNotification: faltan campos obligatorios', { userId, type, title })
    return
  }
  return addDoc(collection(db, COL.notifications), {
    userId,
    type,
    title,
    message: message || '',
    link,
    read: false,
    createdAt: serverTimestamp(),
    metadata,
  })
}

// ----------------------------------------------------------------
// Notificar a todos los admins
// ----------------------------------------------------------------

export async function notifyAllAdmins({ type, title, message, link = null, metadata = {} }) {
  try {
    const snap = await getDocs(
      query(collection(db, COL.users), where('role', '==', 'Codirector'))
    )
    if (snap.empty) return

    const batch = writeBatch(db)
    snap.docs.forEach((u) => {
      const ref = doc(collection(db, COL.notifications))
      batch.set(ref, {
        userId: u.id,
        type,
        title,
        message: message || '',
        link,
        read: false,
        createdAt: serverTimestamp(),
        metadata,
      })
    })
    await batch.commit()
  } catch (e) {
    console.error('notifyAllAdmins error', e)
  }
}

// ----------------------------------------------------------------
// Detectar entradas al Top 3 y notificar
// ----------------------------------------------------------------
// Recalcula el podio de cada liga y avisa a los nuevos entrantes.
// Optimizaciones respecto a la primera versión:
//   1. Throttle: como máximo una ejecución cada TOP3_THROTTLE_MINUTES.
//   2. Solo lee usuarios con puntos > 0 (los que están a 0 no pueden
//      estar en ningún podio), en vez de la colección entera.
//   3. Contempla las tres ligas actuales (antes se saltaba Obra Nueva).

function top3ThrottleBlocks() {
  try {
    const last = Number(localStorage.getItem(TOP3_LAST_RUN_KEY) || 0)
    const elapsedMin = (Date.now() - last) / 60000
    if (elapsedMin < TOP3_THROTTLE_MINUTES) return true
    localStorage.setItem(TOP3_LAST_RUN_KEY, String(Date.now()))
    return false
  } catch {
    // Sin localStorage no aplicamos throttle
    return false
  }
}

export async function checkAndNotifyTop3({ force = false } = {}) {
  try {
    if (!force && top3ThrottleBlocks()) return

    // Solo quien tiene puntos puede estar en un podio.
    const scoredSnap = await getDocs(
      query(collection(db, COL.users), where('points', '>', 0))
    )
    const scored = scoredSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const leagueOf = (u) => {
      if (u.league) return u.league
      if (u.role === 'Agente Comercial') return 'agentes'
      if (u.role === 'Obra Nueva') return 'obranueva'
      if (u.role === 'Staff') return 'staff'
      return null
    }

    // Top 3 de cada liga por separado
    const newTop3Ids = new Set()
    for (const league of PERSON_LEAGUES) {
      scored
        .filter((u) => leagueOf(u) === league)
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 3)
        .forEach((u) => newTop3Ids.add(u.id))
    }

    // Quién estaba marcado antes (consulta pequeña, solo los del flag)
    const flaggedSnap = await getDocs(
      query(collection(db, COL.users), where('inTop3', '==', true))
    )
    const previouslyFlagged = new Set(flaggedSnap.docs.map((d) => d.id))

    const newEntrants = [...newTop3Ids].filter((id) => !previouslyFlagged.has(id))
    const droppedOut = [...previouslyFlagged].filter((id) => !newTop3Ids.has(id))

    if (!newEntrants.length && !droppedOut.length) return

    const batch = writeBatch(db)

    for (const userId of newEntrants) {
      batch.update(doc(db, COL.users, userId), { inTop3: true })
      const notifRef = doc(collection(db, COL.notifications))
      batch.set(notifRef, {
        userId,
        type: 'top3_ranking',
        title: '🏆 ¡Estás en el top 3!',
        message: 'Acabas de entrar en el podio de tu liga. A por el primer puesto.',
        link: '/ranking',
        read: false,
        createdAt: serverTimestamp(),
        metadata: {},
      })
    }

    for (const userId of droppedOut) {
      batch.update(doc(db, COL.users, userId), { inTop3: false })
    }

    await batch.commit()
  } catch (e) {
    // No bloqueamos la aprobación si esto falla.
    console.error('checkAndNotifyTop3 error', e)
  }
}

// ----------------------------------------------------------------
// Helpers específicos por evento (los views/hooks llaman a estos)
// ----------------------------------------------------------------

export async function notifyActionPending({ agentName, actionLabel }) {
  if (!NOTIFY_ADMINS_ON_NEW_REQUEST) return
  return notifyAllAdmins({
    type: 'action_pending',
    title: '🆕 Nueva solicitud',
    message: `${agentName} ha registrado: ${actionLabel}`,
    link: '/aprobaciones',
  })
}

export async function notifyActionApproved({ userId, actionLabel, points }) {
  return createNotification({
    userId,
    type: 'action_approved',
    title: '✅ Acción aprobada',
    message: `Te han aprobado: ${actionLabel} (+${points} pts)`,
    link: '/',
  })
}

export async function notifyActionRejected({ userId, actionLabel }) {
  return createNotification({
    userId,
    type: 'action_rejected',
    title: '❌ Acción no aprobada',
    message: `Tu solicitud de "${actionLabel}" no ha sido aprobada.`,
    link: '/',
  })
}

export async function notifyTeamAssignment({ userId, teamName }) {
  return createNotification({
    userId,
    type: 'team_added',
    title: '👥 Te han añadido a un equipo',
    message: `Ahora formas parte de "${teamName}".`,
    link: '/ranking',
  })
}
