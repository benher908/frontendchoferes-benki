'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { clearSession, getUser } from '@/lib/auth';

const supervisorLinks = [
  { href: '/supervisor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supervisor/registro-diario', label: 'Registro diario', icon: ClipboardCheck },
  { href: '/supervisor/choferes', label: 'Choferes', icon: Users },
  { href: '/supervisor/chequeos', label: 'Chequeos', icon: Truck },
  { href: '/supervisor/verificaciones', label: 'Verificaciones', icon: CalendarCheck },
  { href: '/supervisor/incentivos', label: 'Incentivos', icon: BadgeDollarSign },
];

const choferLinks = [
  { href: '/chofer', label: 'Mi perfil', icon: UserRound },
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
    role === 'supervisor'
      ? supervisorLinks
      : role === 'chofer'
        ? choferLinks
        : checadorLinks;

  function logout() {
    clearSession();
    router.replace('/login');
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar escritorio */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-gray-200 bg-white p-5 lg:block">
        <SidebarContent
          links={links}
          pathname={pathname}
          user={user}
          logout={logout}
        />
      </aside>

      {/* Header móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07AE8B] text-sm font-bold text-white">
            D
          </div>

          <div>
            <p className="text-sm font-bold text-gray-950">Sistema Choferes</p>
            <p className="text-xs text-gray-500">
              {user?.rol === 'chofer'
                ? 'Chofer'
                : user?.rol === 'checador_unidad'
                  ? 'Checador'
                  : 'Supervisor'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeMobile}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute left-0 top-0 h-full w-[82%] max-w-80 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07AE8B] text-base font-bold text-white">
                  D
                </div>
                <h1 className="mt-3 text-lg font-bold text-gray-900">
                  Sistema Choferes
                </h1>
                <p className="text-sm text-gray-500">Gestión e incentivos</p>
              </div>

              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-1">
              {links.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      active
                        ? 'bg-[#07AE8B] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-5 left-5 right-5">
              <div className="mb-3 rounded-2xl bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.nombre_completo || user?.username}
                </p>
                <p className="text-xs text-gray-500">{user?.rol}</p>
              </div>

              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <LogOut size={17} />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Contenido */}
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ links, pathname, user, logout }) {
  return (
    <>
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07AE8B] text-lg font-bold text-white">
          D
        </div>

        <h1 className="mt-4 text-xl font-bold text-gray-900">
          Sistema Choferes
        </h1>

        <p className="text-sm text-gray-500">Gestión e incentivos</p>
      </div>

      <nav className="space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-[#07AE8B] text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-5 right-5">
        <div className="mb-3 rounded-2xl bg-gray-50 p-3">
          <p className="text-sm font-semibold text-gray-900">
            {user?.nombre_completo || user?.username}
          </p>
          <p className="text-xs text-gray-500">{user?.rol}</p>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}