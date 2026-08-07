import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, db, COL } from '../lib/firebase'
import { isAdminRole } from '../data/seedUsers'

const AuthContext = createContext(null)

const VIEW_AS_USER_KEY = 'laliga-view-as-user'

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Modo "ver como usuario" para admins. Se recuerda en el dispositivo.
  const [viewAsUser, setViewAsUserState] = useState(
    () => localStorage.getItem(VIEW_AS_USER_KEY) === '1'
  )
  const setViewAsUser = (value) => {
    setViewAsUserState(value)
    try {
      localStorage.setItem(VIEW_AS_USER_KEY, value ? '1' : '0')
    } catch {
      // localStorage no disponible: el modo durará solo esta sesión
    }
  }

  // 1) Escucha cambios de auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      if (!u) {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsub
  }, [])

  // 2) Suscripción en tiempo real al perfil — el UID de Auth coincide con
  //    el docId en Firestore (lo garantiza el script de seed).
  useEffect(() => {
    if (!firebaseUser) return
    const unsub = onSnapshot(
      doc(db, COL.users, firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() })
          setAuthError(null)
        } else {
          setAuthError('Tu usuario no está dado de alta en La Liga. Habla con un admin.')
          setProfile(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setAuthError('Error al cargar tu perfil.')
        setLoading(false)
      }
    )
    return unsub
  }, [firebaseUser])

  const login = async (email, password) => {
    setAuthError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      const map = {
        'auth/invalid-credential': 'Email o contraseña incorrectos.',
        'auth/user-not-found': 'Usuario no encontrado.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/too-many-requests': 'Demasiados intentos. Inténtalo en unos minutos.',
        'auth/invalid-email': 'Email no válido.',
      }
      setAuthError(map[e.code] || 'No se pudo iniciar sesión.')
      throw e
    }
  }

  const signOut = () => fbSignOut(auth)

  /**
   * Marca el onboarding como visto para el usuario actual. Se llama al
   * terminar (o saltar) la introducción. Escribe solo ese campo, así que
   * las reglas de Firestore lo permiten sin cambios.
   */
  const markOnboardingSeen = async () => {
    if (!firebaseUser) return
    await updateDoc(doc(db, COL.users, firebaseUser.uid), {
      onboardingVisto: true,
    })
  }

  // isRealAdmin: el rol de verdad. isAdmin: lo que ve la interfaz —
  // si un admin activa "ver como usuario", toda la app le trata como
  // usuario normal hasta que lo desactive.
  const isRealAdmin = profile ? isAdminRole(profile.role) : false
  const isAdmin = isRealAdmin && !viewAsUser

  // Solo los usuarios nuevos pasan por el onboarding. A los que ya estaban
  // jugando se les marcó onboardingVisto: true con el script de backfill.
  const needsOnboarding = profile ? profile.onboardingVisto !== true : false

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isAdmin,
        isRealAdmin,
        viewAsUser,
        setViewAsUser,
        needsOnboarding,
        markOnboardingSeen,
        loading,
        authError,
        login,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
