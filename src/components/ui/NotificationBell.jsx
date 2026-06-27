import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'

export default function NotificationBell() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const { unreadCount } = useNotifications(firebaseUser?.uid)

  return (
    <button
      onClick={() => navigate('/notificaciones')}
      className="w-10 h-10 rounded-full glass flex items-center justify-center relative"
      aria-label="Notificaciones"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rk-orange ring-2 ring-white dark:ring-rk-ink shadow-sm shadow-rk-orange/40" />
      )}
    </button>
  )
}
