import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email, password)
    } catch {
      // El error se muestra desde el contexto
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 safe-top">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / título */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-rk-orange to-rk-orange-dark flex items-center justify-center shadow-lg shadow-rk-orange/30 mb-4">
            <span className="text-3xl">🏆</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">La Liga</h1>
          <p className="text-sm text-rk-ink/60 dark:text-rk-cream/60 mt-1">
            RK Palanca Fontestad
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass rounded-2xl px-4 py-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
              Email corporativo
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tunombre@inmobiliariapalanca.com"
              className="w-full bg-transparent outline-none text-base mt-1 placeholder:text-rk-ink/40 dark:placeholder:text-rk-cream/40"
            />
          </div>

          <div className="glass rounded-2xl px-4 py-3 relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
              Contraseña
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-base mt-1 pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-rk-ink/50 dark:text-rk-cream/50"
              aria-label="Mostrar/ocultar contraseña"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {authError && (
            <div className="rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold px-4 py-3 text-center">
              {authError}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full py-4 text-base">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-rk-ink/50 dark:text-rk-cream/50">
          ¿Problemas para entrar? Habla con Almudena o Rober.
        </p>
      </div>
    </div>
  )
}
