'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CivicPulseLogo } from '@/components/CivicPulseLogo';
import { usePersona } from '@/context/PersonaContext';
import {
  PlusCircle,
  FileText,
  LayoutDashboard,
  Map,
  SlidersHorizontal,
  Menu,
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  HelpCircle,
  Mail,
  Info,
  ArrowUpRight,
  Download,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { role, currentUser, isAuthenticated, logout } = usePersona();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const residentLinks = [
    {
      name: 'Report Issue',
      href: '/complaints/new',
      icon: PlusCircle,
      code: '01',
    },
    {
      name: 'My Reports',
      href: '/complaints',
      icon: FileText,
      code: '02',
    },
    {
      name: 'About',
      href: '/about',
      icon: Info,
      code: '03',
    },
    {
      name: 'FAQ',
      href: '/faq',
      icon: HelpCircle,
      code: '04',
    },
    {
      name: 'Contact',
      href: '/contact',
      icon: Mail,
      code: '05',
    },
  ];

  const adminLinks = [
    {
      name: 'Triage Queue',
      href: '/admin',
      icon: LayoutDashboard,
      code: 'Q1',
    },
    {
      name: 'Spatial Map',
      href: '/admin/map',
      icon: Map,
      code: 'M2',
    },
    {
      name: 'Scoring Rules',
      href: '/admin/rules',
      icon: SlidersHorizontal,
      code: 'R3',
    },
    {
      name: 'Public Ledger',
      href: '/complaints',
      icon: FileText,
      code: 'L4',
    },
    {
      name: 'Contact',
      href: '/contact',
      icon: Mail,
      code: 'C5',
    },
  ];

  const navLinks = mounted && isAuthenticated && role === 'admin' ? adminLinks : residentLinks;

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--surface-card)] border-b border-[var(--border-subtle)]">
      {/* Top Municipal Micro-Ledger Bar */}
      <div className="hidden sm:block border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-7 flex items-center justify-between font-mono text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
              <span className="w-1.5 h-1.5 bg-[var(--brand-primary)] inline-block" />
              <span>MUNICIPAL DISPATCH LEDGER · SC-01</span>
            </span>
            <span className="text-[var(--border-strong)]">|</span>
            <span>OPEN311 PROTOCOL COMPLIANT</span>
          </div>
          <div className="flex items-center gap-4 tabular-nums">
            <span>LATENCY: 18ms</span>
            <span className="text-[var(--border-strong)]">|</span>
            <span className="text-[var(--text-secondary)]">WARDS 01–05 ACTIVE</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-stretch justify-between">
          {/* Left: Brand Identity */}
          <div className="flex items-stretch">
            <Link
              href="/"
              className="flex items-center gap-3 pr-6 border-r border-[var(--border-subtle)] group"
            >
              <CivicPulseLogo size="md" />
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-editorial text-2xl tracking-tight text-[var(--text-primary)] leading-none">
                    CivicPulse
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--border-strong)] text-[var(--text-secondary)]">
                    v2.4
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                  Public Works Triage
                </span>
              </div>
            </Link>

            {/* Desktop Architectural Navigation Links */}
            <nav className="hidden md:flex items-stretch">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 border-r border-[var(--border-subtle)] text-xs font-medium transition-colors relative ${
                      isActive
                        ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]/60'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{link.code}</span>
                    <span>{link.name}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--brand-primary)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Theme Toggle & Auth Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-3 pl-4">
            <ThemeToggle />

            {mounted && isAuthenticated ? (
              <div className="flex items-center gap-2 pl-3 border-l border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-center w-6 h-6 bg-[var(--text-primary)] text-[var(--canvas-base)] font-mono text-[11px] font-bold uppercase">
                    {currentUser.name ? currentUser.name.charAt(0) : <UserIcon className="w-3 h-3" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-[var(--text-primary)] leading-none max-w-[130px] truncate">
                      {currentUser.name || 'Resident'}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase mt-1 leading-none">
                      {role === 'admin' ? 'Dispatcher · Admin' : 'Verified Citizen'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out of account"
                  className="inline-flex items-center justify-center w-8 h-8 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-3 border-l border-[var(--border-subtle)]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/complaints/new"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold stitch-btn-accent"
                >
                  <span>File Report</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center w-9 h-9 border border-[var(--border-subtle)] text-[var(--text-primary)] bg-[var(--surface-elevated)]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-4 pt-2 pb-5 space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 border text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--text-primary)] bg-[var(--surface-elevated)] border-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">{link.code}</span>
                  <span>{link.name}</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>
            );
          })}

          {/* Quick Install Mobile App Link */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              window.dispatchEvent(new CustomEvent('civicpulse_open_pwa_install'));
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 border border-dashed border-[var(--brand-primary)]/40 bg-[var(--brand-glow)] text-[var(--brand-primary)] text-xs font-medium hover:bg-[var(--brand-primary)]/15 transition-colors mt-2"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-3.5 h-3.5" />
              <span className="font-semibold">Install App on Phone</span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[var(--brand-primary)] text-white rounded-xs">
              PWA
            </span>
          </button>

          <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]">
            {mounted && isAuthenticated ? (
              <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 bg-[var(--text-primary)] text-[var(--canvas-base)] font-mono text-xs font-bold uppercase">
                    {currentUser.name ? currentUser.name.charAt(0) : <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{currentUser.name}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                      {role === 'admin' ? 'Dispatcher · Admin' : 'Verified Citizen'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 border border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs font-mono uppercase transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[var(--surface-elevated)] text-[var(--text-primary)] font-semibold text-xs border border-[var(--border-subtle)]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 stitch-btn-accent font-semibold text-xs"
                >
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

