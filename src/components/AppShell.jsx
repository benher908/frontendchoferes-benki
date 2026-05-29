'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Truck,
  Users,
  CalendarCheck,
  BadgeDollarSign,
  LogOut,
  UserRound,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { clearSession, getUser } from '@/lib/auth';

const supervisorLinks = [
  { href: '/supervisor', label: 'Dashboard', icon: LayoutDashboard, description: 'Resumen general' },
  { href: '/supervisor/registro-diario', label: 'Registro diario', icon: ClipboardCheck, description: 'Capturas del día' },
  { href: '/supervisor/choferes', label: 'Choferes', icon: Users, description: 'Perfiles e historial' },
  { href: '/supervisor/chequeos', label: 'Chequeos', icon: Truck, description: 'Unidades y evidencias' },
  { href: '/supervisor/verificaciones', label: 'Verificaciones', icon: CalendarCheck, description: 'Alertas vehiculares' },
  { href: '/supervisor/incentivos', label: 'Incentivos', icon: BadgeDollarSign, description: 'Cálculo mensual' },
];

const choferLinks = [
  { href: '/chofer', label: 'Mi perfil', icon: UserRound, description: 'Resumen personal' },
  { href: '/chofer/check', label: 'Aviso y Check', icon: ClipboardCheck, description: 'Reportar unidad' },
];

const checadorLinks = [
  { href: '/checador', label: 'Inicio', icon: LayoutDashboard, description: 'Resumen' },
  { href: '/checador/chequeos', label: 'Chequeos', icon: Truck, description: 'Nuevo e historial' },
];

export default function AppShell({ role, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo(() => {
    if (role === 'supervisor') return supervisorLinks;
    if (role === 'chofer') return choferLinks;
    return checadorLinks;
  }, [role]);

  const current = links.find((link) => pathname === link.href) || links[0];

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 hidden h-screen w-[19rem] border-r border-gray-200 bg-white p-5 lg:block">
        <SidebarContent links={links} pathname={pathname} user={user} logout={logout} />
      </aside>

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-wide text-[#04745f]">
              Sistema Choferes
            </p>
            <p className="truncate text-lg font-black text-gray-950">{current?.label || 'Inicio'}</p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm"
            aria-label="Abrir menú"
          >
            <Menu size={25} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-gray-950/45 backdrop-blur-sm"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <Brand />

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-gray-800"
                aria-label="Cerrar menú"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="space-y-2">
              {links.map((item) => (
                <MobileNavItem
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>

            <UserFooter user={user} logout={logout} mobile />
          </aside>
        </div>
      )}

      <main className="lg:pl-[19rem]">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[#07AE8B] text-lg font-black text-white shadow-sm">
        D
      </div>
      <h1 className="mt-4 text-xl font-black text-gray-950">Sistema Choferes</h1>
      <p className="text-sm text-gray-600">Gestión e incentivos</p>
    </div>
  );
}

function SidebarContent({ links, pathname, user, logout }) {
  return (
    <div className="flex h-full flex-col">
      <Brand />

      <nav className="mt-8 space-y-2">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                active ? 'bg-[#07AE8B] text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950'
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-white/15' : 'bg-gray-100'}`}>
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block font-bold leading-5">{item.label}</span>
                <span className={`block truncate text-xs ${active ? 'text-white/80' : 'text-gray-500'}`}>{item.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <UserFooter user={user} logout={logout} />
    </div>
  );
}

function MobileNavItem({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-3xl border p-3 transition ${
        active ? 'border-[#07AE8B] bg-[#07AE8B]/10 text-gray-950' : 'border-gray-200 bg-white text-gray-800'
      }`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${active ? 'bg-[#07AE8B] text-white' : 'bg-gray-100 text-gray-700'}`}>
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-black">{item.label}</span>
        <span className="block text-sm text-gray-600">{item.description}</span>
      </span>
      <ChevronRight size={19} className="text-gray-400" />
    </Link>
  );
}

function UserFooter({ user, logout, mobile = false }) {
  return (
    <div className={`${mobile ? 'mt-auto' : 'mt-auto'} pt-5`}>
      <div className="mb-3 rounded-3xl bg-gray-50 p-4">
        <p className="truncate text-sm font-black text-gray-950">{user?.nombre_completo || user?.username || 'Usuario'}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{user?.rol || 'Sesión activa'}</p>
      </div>

      <button
        type="button"
        onClick={logout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-sm font-black text-gray-800 hover:bg-gray-50"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </div>
  );
}
