'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Check } from 'lucide-react';
import { CivicPulseLogo } from '@/components/CivicPulseLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Check if already installed in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return;
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if dismissed recently (24 hours)
    const dismissedAt = localStorage.getItem('civicpulse_pwa_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 24 * 60 * 60 * 1000) {
      // dismissed recently
    } else {
      if (isIosDevice) {
        // Show after a brief delay for iOS users
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }

    // 4. Capture native beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      const dismissed = localStorage.getItem('civicpulse_pwa_dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed, 10) >= 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. App installed listener
    const handleAppInstalled = () => {
      setInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Custom manual trigger listener (from Navbar or buttons)
    const handleManualInstallTrigger = () => {
      localStorage.removeItem('civicpulse_pwa_dismissed');
      setShowPrompt(true);
      if (isIosDevice) {
        setShowIosGuide(true);
      }
    };

    window.addEventListener('civicpulse_open_pwa_install', handleManualInstallTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('civicpulse_open_pwa_install', handleManualInstallTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    localStorage.setItem('civicpulse_pwa_dismissed', String(Date.now()));
  };

  if (isStandalone || installed || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom PWA Install Banner (Optimized for Mobile) */}
      <aside
        aria-label="Install Progressive Web App"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[var(--surface-card)] border border-[var(--border-strong)] p-4 shadow-2xl rounded-md animate-fade-in text-[var(--text-primary)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CivicPulseLogo size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-base font-semibold leading-tight text-[var(--text-primary)]">
                  Install CivicPulse
                </span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-[var(--brand-primary)] text-white font-bold rounded-xs">
                  PWA
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                Install as a mobile app for rapid one-tap hazard filing and offline ledger access.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss app install banner"
            className="p-1 rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Maybe Later
          </button>

          <button
            type="button"
            onClick={handleInstallClick}
            className="stitch-btn-accent flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIos ? 'How to Install' : 'Install App'}</span>
          </button>
        </div>
      </aside>

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-sm bg-[var(--surface-card)] border border-[var(--border-strong)] p-6 rounded-md space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <CivicPulseLogo size="sm" />
                <h3 className="font-editorial text-lg text-[var(--text-primary)]">Install on iOS (iPhone / iPad)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong className="text-[var(--text-primary)]">Share button</strong> (
                  <Share className="inline w-3.5 h-3.5 mx-0.5 text-[var(--brand-primary)]" />
                  ) at the bottom of Safari toolbar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Scroll down the share sheet and tap{' '}
                  <strong className="text-[var(--text-primary)]">&quot;Add to Home Screen&quot;</strong> (
                  <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-[var(--brand-primary)]" />
                  ).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Confirm by tapping <strong className="text-[var(--text-primary)]">&quot;Add&quot;</strong> in the top right corner. CivicPulse will install to your home screen!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="stitch-btn-accent w-full py-2.5 text-center font-mono uppercase tracking-wider font-semibold mt-2"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
