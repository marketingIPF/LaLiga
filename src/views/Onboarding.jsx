import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { LEAGUES, selfServiceActions } from '../lib/constants'
import { getUserLeague } from '../data/seedUsers'
import { useUsers } from '../hooks/useUsers'
import { cn } from '../lib/utils'

// Cuántos puestos reparten premio en cada liga (igual que en Dashboard)
const PRIZE_SPOTS = { agentes: 5, obranueva: 2, staff: 3 }

// ====================================================================
// Onboarding · solo lo ven los usuarios nuevos
// --------------------------------------------------------------------
// Se muestra una única vez, después del cambio de contraseña obligatorio
// y antes de entrar a la app. Al terminar (o al saltar) se marca el
// perfil con onboardingVisto: true y no vuelve a aparecer.
// ====================================================================
export default function Onboarding() {
  const { profile, markOnboardingSeen } = useAuth()
  const { users } = useUsers()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const league = getUserLeague(profile) ?? 'agentes'
  const leagueLabel = LEAGUES[league]?.label ?? 'Agentes'
  const spots = PRIZE_SPOTS[league] ?? 3
  const actions = selfServiceActions(league)
  const firstName = profile?.name?.split(' ')[0] ?? ''

  const leagueMates = users.filter(
    (u) => getUserLeague(u) === league && u.id !== profile?.id
  ).length

  async function finish() {
    setSaving(true)
    try {
      await markOnboardingSeen()
    } catch (e) {
      console.error('markOnboardingSeen failed', e)
      setSaving(false)
    }
    // Si va bien, el perfil se actualiza y App deja pasar a la home.
  }

  const STEPS = [
    // ---------- 1 · Bienvenida ----------
    {
      render: () => (
        <>
          <div className="text-6xl text-center my-8">🏆</div>
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            Bienvenid{profile?.name?.endsWith('a') ? 'a' : 'o'} a
            <br />
            La Liga
          </h1>
          <p className="text-sm text-white/60 leading-relaxed mt-3.5">
            Tu trabajo del día a día se convierte en puntos, rankings y premios
            reales. Esto es lo que necesitas saber, {firstName}.
          </p>
        </>
      ),
      cta: 'Empezar',
    },
    // ---------- 2 · Cómo se suma ----------
    {
      render: () => (
        <>
          <h1 className="text-2xl font-black leading-tight tracking-tight">
            Hay muchas
            <br />
            formas de sumar
          </h1>
          <p className="text-sm text-white/60 leading-relaxed mt-3 mb-5">
            No hace falta cerrar una venta. Tú registras estas desde la app; el
            resto de puntos los carga administración desde el CRM.
          </p>
          <div className="space-y-2.5">
            {actions.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-white/[0.07] rounded-2xl p-3"
              >
                <span className="text-xl">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-extrabold truncate">
                    {a.label}
                  </div>
                  <div className="text-[10.5px] text-white/50 truncate">
                    {a.description}
                  </div>
                </div>
                <span className="text-xs font-black text-rk-orange-light shrink-0">
                  +{a.points}
                </span>
              </div>
            ))}
          </div>
        </>
      ),
      cta: 'Siguiente',
    },
    // ---------- 3 · Tu liga y los premios ----------
    {
      render: () => (
        <>
          <div className="text-5xl text-center mt-6 mb-5">🏅</div>
          <h1 className="text-2xl font-black leading-tight tracking-tight">
            Compites con
            <br />
            los tuyos
          </h1>
          <p className="text-sm text-white/60 leading-relaxed mt-3">
            Estás en la liga de <span className="text-white font-bold">{leagueLabel}</span>
            {leagueMates > 0 && <>, con {leagueMates} compañeros más</>}. Cada liga
            tiene su propia clasificación.
          </p>
          <div className="mt-5 rounded-2xl p-4 bg-amber-400/[0.13] border border-dashed border-amber-400/40">
            <div className="text-[13px] font-extrabold text-amber-300">
              🏅 Los {spots} primeros ganan premio
            </div>
            <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">
              {league === 'agentes'
                ? 'Y hay premios de equipo aparte. El 1º y 2º puesto exigen mínimo 5 captaciones, sin contar gerencia y oficina.'
                : 'Y hay premios de equipo aparte. Cualquiera de los premios requiere al menos 1 captación.'}
            </p>
          </div>
        </>
      ),
      cta: 'Siguiente',
    },
    // ---------- 4 · A jugar ----------
    {
      render: () => (
        <>
          <div className="text-6xl text-center my-8">⚡</div>
          <h1 className="text-3xl font-black leading-tight tracking-tight">
            Tu marcador
            <br />
            arranca hoy
          </h1>
          <p className="text-sm text-white/60 leading-relaxed mt-3.5">
            Registra tu primera acción y sal del cero. En la pantalla de inicio
            tienes una lista con los primeros pasos.
          </p>
        </>
      ),
      cta: saving ? 'Entrando…' : 'Entrar en La Liga',
    },
  ]

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 bg-rk-ink text-white overflow-y-auto">
      <div
        className="min-h-full flex flex-col px-6 pb-8"
        style={{ paddingTop: 'max(2rem, var(--safe-top))' }}
      >
        {/* Progreso */}
        <div className="flex gap-1.5 justify-center mb-7">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-rk-orange' : 'w-1.5 bg-white/20'
              )}
            />
          ))}
        </div>

        <div className="animate-fade-in" key={step}>
          {current.render()}
        </div>

        <div className="flex-1 min-h-8" />

        <button
          onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          disabled={saving}
          className="w-full bg-rk-orange text-white rounded-2xl py-4 font-black text-[15px] shadow-orange-glow active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {current.cta}
          {!isLast && <ChevronRight size={17} />}
        </button>

        {!isLast && (
          <button
            onClick={finish}
            disabled={saving}
            className="w-full text-center text-[11.5px] font-bold text-white/40 mt-3.5 py-1"
          >
            Saltar introducción
          </button>
        )}
      </div>
    </div>
  )
}
