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
    e.stopPropagation()
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
    <div className="animate-fade-in pb-8">
      <header className="flex items-center gap-3 pt-4 pb-1">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          aria-label="Volver"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[1.7px] text-rk-ink/38 dark:text-rk-cream/38">
            La Liga
          </p>
          <h1 className="text-[21px] font-black tracking-tight mt-0.5">
            Notificaciones
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead(notifications).catch(() => {})}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/[0.05] dark:bg-white/[0.07] text-[11px] font-extrabold shrink-0 active:opacity-70 transition-opacity"
          >
            <CheckCheck size={13} />
            Marcar todas
          </button>
        )}
      </header>

      {/* Borrar leídas */}
      {!loading && readCount > 0 && (
        <div className="mt-3">
          {confirmClear ? (
            <div className="rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-3.5 flex items-center gap-3">
              <p className="flex-1 text-[12px] font-semibold">
                ¿Borrar {readCount} {readCount === 1 ? 'notificación leída' : 'notificaciones leídas'}?
              </p>
              <button
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-rk-ink-card text-[11px] font-bold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearRead}
                disabled={clearing}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold disabled:opacity-50"
              >
                {clearing ? 'Borrando…' : 'Borrar'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 text-[11.5px] font-bold text-rk-ink/45 dark:text-rk-cream/45"
            >
              <Trash2 size={12} />
              Borrar leídas ({readCount})
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-center text-[12.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 py-14">
          Cargando…
        </p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-rk-orange/10 flex items-center justify-center mx-auto mb-3.5">
            <BellOff size={24} className="text-rk-orange" />
          </div>
          <p className="text-[13px] font-bold">Sin notificaciones</p>
          <p className="text-[11.5px] font-semibold text-rk-ink/45 dark:text-rk-cream/45 mt-1.5 px-8 leading-relaxed">
            Cuando pase algo relevante, te avisaremos por aquí.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="h-px bg-black/[0.075] dark:bg-white/[0.09]" />
          {notifications.map((n, i) => (
            <FilaNotificacion
              key={n.id}
              notif={n}
              onTap={() => handleTap(n)}
              onDelete={(e) => handleDeleteOne(e, n)}
              deleting={deletingId === n.id}
              ultimo={i === notifications.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilaNotificacion({ notif, onTap, onDelete, deleting, ultimo }) {
  return (
    <button
      onClick={onTap}
      disabled={deleting}
      className={cn(
        'w-full text-left py-3 relative group transition-opacity',
        !ultimo && 'border-b border-black/[0.075] dark:border-white/[0.09]',
        deleting && 'opacity-35'
      )}
    >
      <div className="flex items-start gap-2.5">
        {!notif.read && (
          <span className="w-[7px] h-[7px] rounded-full bg-rk-orange shrink-0 mt-[5px]" />
        )}
        <div className={cn('flex-1 min-w-0', notif.read && 'pl-[13px]')}>
          <div className="font-extrabold text-[13px] leading-snug pr-6">
            {notif.title}
          </div>
          {notif.message && (
            <div className="text-[11.5px] font-medium text-rk-ink/55 dark:text-rk-cream/55 mt-0.5 leading-relaxed pr-6">
              {notif.message}
            </div>
          )}
          <div className="text-[10px] font-bold text-rk-ink/35 dark:text-rk-cream/35 mt-1.5">
            {relativeDate(notif.createdAt)}
          </div>
        </div>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onDelete}
        onKeyDown={(e) => e.key === 'Enter' && onDelete(e)}
        aria-label="Borrar notificación"
        className="absolute top-2.5 right-0 w-7 h-7 rounded-full flex items-center justify-center text-rk-ink/25 dark:text-rk-cream/25 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition"
      >
        <X size={13} />
      </div>
    </button>
  )
}
