'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeDollarSign,
  CalendarCheck,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { clearSession, getUser } from '@/lib/auth';

const supervisorLinks = [
  { href: '/supervisor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supervisor/rutas', label: 'Rutas del día', icon: Truck },
  { href: '/supervisor/encuestas', label: 'Encuestas', icon: ClipboardCheck },
  { href: '/supervisor/registro-diario', label: 'Registro diario', icon: ClipboardCheck },
  { href: '/supervisor/combustible', label: 'Combustible', icon: Truck },
  { href: '/supervisor/choferes', label: 'Choferes', icon: Users },
  { href: '/supervisor/chequeos', label: 'Chequeos', icon: Truck },
  { href: '/supervisor/verificaciones', label: 'Verificaciones', icon: CalendarCheck },
  { href: '/supervisor/mantenimientos', label: 'Mantenimientos', icon: Truck },
  { href: '/supervisor/incentivos', label: 'Incentivos', icon: BadgeDollarSign },
];

const choferLinks = [
  { href: '/chofer', label: 'Mi perfil', icon: UserRound },
  { href: '/chofer/ruta', label: 'Mi ruta', icon: Truck },
  { href: '/chofer/check', label: 'Aviso y Check', icon: ClipboardCheck },
];

const checadorLinks = [
  { href: '/checador', label: 'Inicio', icon: LayoutDashboard },
  { href: '/checador/chequeos', label: 'Chequeos', icon: Truck },
];

export default function AppShell({ role, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links =
    role === 'supervisor' ? supervisorLinks : role === 'chofer' ? choferLinks : checadorLinks;

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-transparent">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-white/95 p-5 shadow-sm lg:block">
        <SidebarContent links={links} pathname={pathname} user={user} logout={logout} />
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B80000] to-[#002FB8] text-sm font-black text-white shadow-md">
              D
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">Sistema Choferes</p>
              <p className="truncate text-xs font-medium text-slate-500">
                {user?.nombre_completo || user?.username || ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm"
            aria-label="Abrir menú"
          >
            <Menu size={23} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/45"
          />
          <aside className="absolute left-0 top-0 h-full w-[84%] max-w-80 bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B80000] to-[#002FB8] text-lg font-black text-white shadow-md">
                  D
                </div>
                <h1 className="mt-4 text-xl font-black text-slate-950">Sistema Choferes</h1>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-800"
                aria-label="Cerrar menú"
              >
                <X size={21} />
              </button>
            </div>

            <NavLinks links={links} pathname={pathname} onClick={() => setMobileOpen(false)} />

            <div className="absolute bottom-5 left-5 right-5">
              <UserBox user={user} />
              <LogoutButton logout={logout} />
            </div>
          </aside>
        </div>
      )}

      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl p-4 pb-24 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({ links, pathname, user, logout }) {
  return (
    <>
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B80000] to-[#002FB8] text-lg font-black text-white shadow-md">
          D
        </div>
        <h1 className="mt-4 text-xl font-black tracking-tight text-slate-950">
          Sistema Choferes
        </h1>
      </div>
      <NavLinks links={links} pathname={pathname} />
      <div className="absolute bottom-5 left-5 right-5">
        <UserBox user={user} />
        <LogoutButton logout={logout} />
      </div>
    </>
  );
}

function NavLinks({ links, pathname, onClick }) {
  return (
    <nav className="space-y-1.5">
      {links.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
              active
                ? 'bg-[#B80000] text-white shadow-md shadow-red-900/10'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBox({ user }) {
  return (
    <div className="mb-3 rounded-3xl bg-slate-50 p-4">
      <p className="truncate text-sm font-black text-slate-950">
        {user?.nombre_completo || user?.username}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {user?.rol}
      </p>
    </div>
  );
}

function LogoutButton({ logout }) {
  return (
    <button
      onClick={logout}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
    >
      <LogOut size={17} />
      Cerrar sesión
    </button>
  );
}
