import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as authSignOut,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore'
import { app, db, COL } from './firebase'

/**
 * Devuelve una instancia secundaria de Firebase Auth.
 *
 * Esto permite crear nuevos usuarios sin que el admin pierda su sesión:
 * createUserWithEmailAndPassword normalmente loguea al nuevo usuario y
 * desloguea al actual. Al usar una app secundaria, la sesión principal
 * del admin queda intacta.
 */
function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === 'Secondary')
  if (existing) return getAuth(existing)
  const secondary = initializeApp(app.options, 'Secondary')
  return getAuth(secondary)
}

/**
 * Crea un agente nuevo:
 *  - Crea cuenta en Firebase Auth con contraseña inicial = teléfono.
 *  - Crea el documento Firestore con el UID generado.
 *  - Marca mustChangePassword=true para forzar cambio en el primer login.
 *  - Si se asigna grupo, incrementa memberCount.
 */
export async function createAgent({
  name,
  email,
  phone,
  role = 'Agente Comercial',
  groupId = null,
}) {
  const cleanName = name?.trim()
  const cleanEmail = email?.trim().toLowerCase()
  const cleanPhone = phone?.trim()

  if (!cleanName) throw new Error('El nombre es obligatorio.')
  if (!cleanEmail) throw new Error('El email es obligatorio.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('El email no es válido.')
  }
  if (!cleanPhone || cleanPhone.length < 6) {
    throw new Error('El teléfono / contraseña inicial debe tener al menos 6 caracteres.')
  }

  const secondaryAuth = getSecondaryAuth()

  let uid
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPhone)
    uid = cred.user.uid
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      throw new Error('Ya existe un usuario con ese email.')
    }
    if (e.code === 'auth/invalid-email') {
      throw new Error('El email no es válido.')
    }
    if (e.code === 'auth/weak-password') {
      throw new Error('La contraseña inicial es demasiado débil (mínimo 6 caracteres).')
    }
    throw e
  }

  try {
    await setDoc(doc(db, COL.users, uid), {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role,
      groupId,
      points: 0,
      lifetimePoints: 0,
      periodBilling: 0,
      totalBilling: 0,
      mustChangePassword: true,
      createdAt: serverTimestamp(),
      lastActionAt: null,
    })

    if (groupId) {
      const batch = writeBatch(db)
      batch.update(doc(db, COL.groups, groupId), { memberCount: increment(1) })
      await batch.commit()
    }
  } finally {
    // Cerramos la sesión secundaria SIEMPRE para no dejar estado huérfano.
    await authSignOut(secondaryAuth).catch(() => {})
  }

  return uid
}

/**
 * Borra un agente del sistema:
 *  - Borra el documento Firestore (perderá acceso a la app).
 *  - Decrementa el memberCount del equipo si tenía uno.
 *  - NOTA: el usuario en Firebase Auth NO se borra desde el cliente.
 *    Hay que limpiarlo manualmente en Firebase Console (Authentication
 *    → Users → ··· → Delete). Sin doc Firestore no puede acceder a nada,
 *    así que es seguro dejarlo huérfano hasta limpiarlo.
 */
export async function removeAgent({ userId, groupId }) {
  const batch = writeBatch(db)
  batch.delete(doc(db, COL.users, userId))
  if (groupId) {
    batch.update(doc(db, COL.groups, groupId), { memberCount: increment(-1) })
  }
  await batch.commit()
}
