import { Injectable, computed, signal } from '@angular/core';

export type LearnTheme = 'light' | 'dark';

const THEME_KEY = 'learning.theme';

/**
 * Clair ou sombre pour l'app enfant.
 * Le choix reste sur cet appareil, il n'est pas envoyé au back.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly mode = signal<LearnTheme>(readStoredTheme());

  readonly theme = this.mode.asReadonly();
  readonly isDark = computed(() => this.mode() === 'dark');
  readonly hostClass = computed(() =>
    this.mode() === 'dark' ? 'theme-learn theme-learn-dark' : 'theme-learn theme-learn-light',
  );

  toggle(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  set(theme: LearnTheme): void {
    this.mode.set(theme);
    localStorage.setItem(THEME_KEY, theme);
  }
}

function readStoredTheme(): LearnTheme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
}
