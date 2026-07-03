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
//   - billing_pending     → admin: hay una nueva facturación
//   - billing_approved    → agente: te han aprobado la facturación
//   - billing_rejected    → agente: te han rechazado la facturación
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
// Se llama después de cada aprobación. Lee todos los usuarios,
// identifica quién está en el top 3 ahora, compara con el flag
// `inTop3` que tienen guardado. A los nuevos entrantes les avisa
// y les marca el flag. A los que han caído les limpia el flag.

export async function checkAndNotifyTop3() {
  try {
    const allSnap = await getDocs(collection(db, COL.users))
    const allUsers = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const leagueOf = (u) => {
      if (u.league) return u.league
      if (u.role === 'Agente Comercial') return 'agentes'
      if (u.role === 'Staff' || u.role === 'Obra Nueva') return 'staff'
      return null
    }

    // Top 3 de cada liga por separado
    const newTop3Ids = new Set()
    for (const league of ['agentes', 'staff']) {
      const competitors = allUsers
        .filter((u) => leagueOf(u) === league)
        .filter((u) => (u.points || 0) > 0)
        .sort((a, b) => (b.points || 0) - (a.points || 0))
      competitors.slice(0, 3).forEach((u) => newTop3Ids.add(u.id))
    }

    const previouslyFlagged = new Set(
      allUsers.filter((u) => u.inTop3 === true).map((u) => u.id)
    )

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
// Formateo de importes en € para los mensajes
// ----------------------------------------------------------------


// ----------------------------------------------------------------
// Helpers específicos por evento (los views/hooks llaman a estos)
// ----------------------------------------------------------------

export async function notifyActionPending({ agentName, actionLabel }) {
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
