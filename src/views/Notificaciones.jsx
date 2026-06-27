import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BellOff, CheckCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications, markAsRead, markAllAsRead } from '../hooks/useNotifications'
import { relativeDate, cn } from '../lib/utils'
import GlassCard from '../components/ui/GlassCard'

export default function Notificaciones() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, loading } = useNotifications(firebaseUser?.uid)

  // Marca todas como leídas automáticamente cuando se abre la pantalla,
  // con un pequeño delay para que el usuario llegue a ver el indicador.
  useEffect(() => {
    if (notifications.length === 0) return
    const t = setTimeout(() => {
      markAllAsRead(notifications).catch((e) =>
        console.error('markAllAsRead failed', e)
      )
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length])

  function handleTap(notif) {
    if (!notif.read) {
      markAsRead(notif.id).catch(() => {})
    }
    if (notif.link) {
      navigate(notif.link)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <header className="flex items-center gap-3 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            La Liga
          </p>
          <h1 className="text-2xl font-black">Notificaciones</h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead(notifications).catch(() => {})}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full glass text-xs font-bold"
          >
            <CheckCheck size={14} />
            Marcar todas
          </button>
        )}
      </header>

      {loading ? (
        <p className="text-center text-sm text-rk-ink/60 dark:text-rk-cream/60 py-12">
          Cargando…
        </p>
      ) : notifications.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-rk-orange/10 flex items-center justify-center mx-auto mb-4">
            <BellOff size={28} className="text-rk-orange" />
          </div>
          <p className="font-bold">Sin notificaciones</p>
          <p className="text-xs text-rk-ink/60 dark:text-rk-cream/60 mt-1.5 px-6">
            Cuando pase algo relevante, te avisaremos por aquí.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <NotificationCard key={n.id} notif={n} onTap={() => handleTap(n)} />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationCard({ notif, onTap }) {
  return (
    <button
      onClick={onTap}
      className={cn(
        'w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] relative',
        notif.read
          ? 'bg-black/3 dark:bg-white/3'
          : 'glass ring-1 ring-rk-orange/30 shadow-md shadow-rk-orange/5'
      )}
    >
      {!notif.read && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rk-orange" />
      )}
      <div className="font-bold text-sm leading-snug pr-6">{notif.title}</div>
      {notif.message && (
        <div className="text-xs text-rk-ink/70 dark:text-rk-cream/70 mt-1 leading-relaxed">
          {notif.message}
        </div>
      )}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40 mt-2">
        {relativeDate(notif.createdAt)}
      </div>
    </button>
  )
}
