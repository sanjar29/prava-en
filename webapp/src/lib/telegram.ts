/**
 * Thin wrapper around the Telegram Mini App SDK.
 * Everything degrades gracefully so the app also runs in a plain browser
 * (which is how you develop it, and how a non-Telegram web fallback works).
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'

interface TgWebApp {
  ready(): void
  expand(): void
  close(): void
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } }
  colorScheme?: 'light' | 'dark'
  themeParams?: Record<string, string>
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  enableClosingConfirmation?(): void
  disableVerticalSwipes?(): void
  HapticFeedback?: {
    impactOccurred(style: HapticStyle): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void }
  MainButton?: {
    setText(t: string): void
    show(): void
    hide(): void
    enable(): void
    disable(): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

export const tg = (): TgWebApp | undefined => window.Telegram?.WebApp

export const inTelegram = (): boolean => Boolean(tg()?.initDataUnsafe)

export function initTelegram(): void {
  const app = tg()
  if (!app) return
  app.ready()
  app.expand()
  app.disableVerticalSwipes?.()

  // Mirror Telegram's theme onto CSS custom properties so the app matches
  // whatever theme the user has set, in both light and dark.
  const p = app.themeParams ?? {}
  const root = document.documentElement
  const map: Record<string, string | undefined> = {
    '--tg-bg': p.bg_color,
    '--tg-text': p.text_color,
    '--tg-hint': p.hint_color,
    '--tg-link': p.link_color,
    '--tg-button': p.button_color,
    '--tg-button-text': p.button_text_color,
    '--tg-secondary-bg': p.secondary_bg_color,
  }
  for (const [k, v] of Object.entries(map)) if (v) root.style.setProperty(k, v)
  if (app.colorScheme) root.setAttribute('data-theme', app.colorScheme)
}

export function haptic(kind: 'select' | 'success' | 'error' | 'tap'): void {
  const h = tg()?.HapticFeedback
  if (!h) return
  try {
    if (kind === 'select') h.selectionChanged()
    else if (kind === 'success') h.notificationOccurred('success')
    else if (kind === 'error') h.notificationOccurred('error')
    else h.impactOccurred('light')
  } catch {
    /* haptics are a nice-to-have */
  }
}

export function userId(): string {
  const id = tg()?.initDataUnsafe?.user?.id
  return id ? String(id) : 'local'
}

export function userName(): string | null {
  return tg()?.initDataUnsafe?.user?.first_name ?? null
}
