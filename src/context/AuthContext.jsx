import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db, COL } from '../lib/firebase'
import { isAdminRole } from '../data/seedUsers'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

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
          setAuthError('Tu usuario no está dado de alta en La Liga. Habla con un codirector.')
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

  const isAdmin = profile ? isAdminRole(profile.role) : false

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isAdmin,
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
