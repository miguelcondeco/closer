import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '../../components/logout-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <span className="text-white font-semibold text-lg">Closer</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/leads">Leads</NavLink>
          <NavLink href="/owners">Proprietários</NavLink>
          <NavLink href="/properties">Imóveis</NavLink>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2 truncate">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
    >
      {children}
    </Link>
  )
}
