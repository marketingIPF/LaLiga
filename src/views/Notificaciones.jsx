import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BellOff, CheckCheck, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  useNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from '../hooks/useNotifications'
import { relativeDate, cn } from '../lib/utils'
import GlassCard from '../components/ui/GlassCard'

export default function Notificaciones() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, loading } = useNotifications(firebaseUser?.uid)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const readCount = notifications.length - unreadCount

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

  async function handleDeleteOne(e, notif) {
    e.stopPropagation() // no disparar la navegación de la tarjeta
    setDeletingId(notif.id)
    try {
      await deleteNotification(notif.id)
    } catch (err) {
      console.error('deleteNotification failed', err)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleClearRead() {
    setClearing(true)
    try {
      await deleteAllRead(notifications)
      setConfirmClear(false)
    } catch (err) {
      console.error('deleteAllRead failed', err)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <header className="flex items-center gap-3 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center shrink-0"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            La Liga
          </p>
          <h1 className="text-2xl font-black">Notificaciones</h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead(notifications).catch(() => {})}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full glass text-xs font-bold shrink-0"
          >
            <CheckCheck size={14} />
            Marcar todas
          </button>
        )}
      </header>

      {/* Borrar leídas */}
      {!loading && readCount > 0 && (
        <div>
          {confirmClear ? (
            <div className="glass rounded-2xl p-3.5 flex items-center gap-3">
              <p className="flex-1 text-xs font-semibold">
                ¿Borrar {readCount} {readCount === 1 ? 'notificación leída' : 'notificaciones leídas'}?
              </p>
              <button
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
                className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-xs font-bold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearRead}
                disabled={clearing}
                className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {clearing ? 'Borrando…' : 'Borrar'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-rk-ink/50 dark:text-rk-cream/50 px-1"
            >
              <Trash2 size={13} />
              Borrar leídas ({readCount})
            </button>
          )}
        </div>
      )}

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
            <NotificationCard
              key={n.id}
              notif={n}
              onTap={() => handleTap(n)}
              onDelete={(e) => handleDeleteOne(e, n)}
              deleting={deletingId === n.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationCard({ notif, onTap, onDelete, deleting }) {
  return (
    <button
      onClick={onTap}
      disabled={deleting}
      className={cn(
        'w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] relative group',
        deleting && 'opacity-40',
        notif.read
          ? 'bg-black/3 dark:bg-white/3'
          : 'glass ring-1 ring-rk-orange/30 shadow-md shadow-rk-orange/5'
      )}
    >
      {!notif.read && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rk-orange" />
      )}
      <div className="font-bold text-sm leading-snug pr-8">{notif.title}</div>
      {notif.message && (
        <div className="text-xs text-rk-ink/70 dark:text-rk-cream/70 mt-1 leading-relaxed pr-8">
          {notif.message}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-rk-ink/40 dark:text-rk-cream/40">
          {relativeDate(notif.createdAt)}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={onDelete}
          onKeyDown={(e) => e.key === 'Enter' && onDelete(e)}
          aria-label="Borrar notificación"
          className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-rk-ink/30 dark:text-rk-cream/30 hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </div>
      </div>
    </button>
  )
}
