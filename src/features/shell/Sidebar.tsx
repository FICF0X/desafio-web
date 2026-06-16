'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PackagePlus,
  Receipt,
  Send,
  Factory,
  Users,
  LogOut,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/features/auth/actions'
import { ThemeToggle } from '@/components/theme-toggle'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const primaryNav: NavItem[] = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Productos', href: '/products', icon: Package },
  { label: 'Órdenes de Compra', href: '/purchase-orders', icon: ShoppingCart },
  { label: 'Ingreso de Mercadería', href: '/goods-receipts', icon: PackagePlus },
  { label: 'Facturación', href: '/invoices', icon: Receipt },
  { label: 'Despacho', href: '/dispatches', icon: Send },
]

const masterNav: NavItem[] = [
  { label: 'Proveedores', href: '/suppliers', icon: Factory },
  { label: 'Clientes', href: '/customers', icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  function linkClass(href: string): string {
    return cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      isActive(href)
        ? 'bg-primary/10 text-primary font-semibold'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen sticky top-0 bg-card border-r">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          Desafío Web
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto py-4 px-3 gap-1">
        {primaryNav.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}

        {/* Divider with label */}
        <div className="my-3 px-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Maestros
          </p>
          <hr className="border-border" />
        </div>

        {masterNav.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom: portfolio + theme toggle + logout */}
      <div className="border-t p-3 space-y-1">
        {/* Portfolio link */}
        <a
          href="https://github.com/FICF0X/FICF0X"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span>Mi portafolio</span>
        </a>

        {/* Theme toggle + logout row */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={logout} className="flex-1">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </aside>
  )
}
