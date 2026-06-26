import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { db, COL } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import GlassCard from '../components/ui/GlassCard'

export default function CambiarPassword() {
  const { profile, firebaseUser } = useAuth()
  const navigate = useNavigate()
  const forced = profile?.mustChangePassword === true

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    setError(null)

    if (newPw.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPw !== confirmPw) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!forced && !currentPw) {
      setError('Introduce tu contraseña actual.')
      return
    }

    setLoading(true)
    try {
      if (!forced) {
        const cred = EmailAuthProvider.credential(firebaseUser.email, currentPw)
        await reauthenticateWithCredential(firebaseUser, cred)
      }

      await updatePassword(firebaseUser, newPw)

      await updateDoc(doc(db, COL.users, firebaseUser.uid), {
        mustChangePassword: false,
      })

      setSuccess(true)
      setTimeout(() => navigate('/', { replace: true }), 1600)
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('La contraseña actual es incorrecta.')
      } else if (e.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil.')
      } else if (e.code === 'auth/requires-recent-login') {
        setError('Por seguridad, cierra sesión y vuelve a entrar antes de cambiar la contraseña.')
      } else {
        setError('No se pudo cambiar la contraseña. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 safe-top safe-bottom">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={42} />
          </div>
          <h2 className="text-2xl font-black mb-2">¡Listo!</h2>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60">
            Entrando a La Liga…
          </p>
        </div>
      </div>
    )
  }

  const formContent = (
    <div className="space-y-5 animate-fade-in">
      {forced && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rk-orange/10 text-rk-orange flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-black mb-2">Cambia tu contraseña</h1>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 px-2">
            Por seguridad, antes de empezar a usar La Liga elige una contraseña personal.
          </p>
        </div>
      )}

      <GlassCard className="space-y-4">
        {!forced && (
          <PasswordField
            label="Contraseña actual"
            value={currentPw}
            onChange={setCurrentPw}
            show={showPw}
            autoComplete="current-password"
          />
        )}
        <PasswordField
          label="Nueva contraseña"
          value={newPw}
          onChange={setNewPw}
          show={showPw}
          autoComplete="new-password"
          hint="Mínimo 8 caracteres"
        />
        <PasswordField
          label="Repite la nueva contraseña"
          value={confirmPw}
          onChange={setConfirmPw}
          show={showPw}
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          className="text-xs font-semibold text-rk-ink/50 dark:text-rk-cream/50 flex items-center gap-1.5"
        >
          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPw ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>
      </GlassCard>

      {error && (
        <div className="bg-red-500/10 text-red-500 text-sm font-semibold text-center p-3 rounded-2xl">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>
    </div>
  )

  if (forced) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 safe-top safe-bottom">
        <div className="w-full max-w-md">{formContent}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-rk-ink/60 dark:text-rk-cream/60"
      >
        <ArrowLeft size={16} /> Volver
      </button>
      <h1 className="text-2xl font-black">Cambiar contraseña</h1>
      {formContent}
    </div>
  )
}

function PasswordField({ label, value, onChange, show, autoComplete, hint }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50 block mb-1.5">
        {label}
      </label>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-rk-orange"
      />
      {hint && (
        <p className="text-xs text-rk-ink/40 dark:text-rk-cream/40 mt-1.5">{hint}</p>
      )}
    </div>
  )
}
