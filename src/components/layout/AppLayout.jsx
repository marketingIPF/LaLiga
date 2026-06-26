import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-32 safe-top">
        <div className="max-w-md mx-auto px-4">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
