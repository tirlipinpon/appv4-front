import { Injectable, signal } from '@angular/core';

export interface ChildMenuEntry {
  id: string;
  label: string;
  link: string;
  testId: string;
}

export interface ChildTrailCrumb {
  label: string;
  path: string | null;
}

/** Une seule liste pour le menu enfant et le fil. */
export const CHILD_MENU: readonly ChildMenuEntry[] = [
  { id: 'home', label: 'Home', link: '/home', testId: 'nav-home' },
  { id: 'learn', label: 'Apprendre', link: '/learn', testId: 'nav-learn' },
  { id: 'rewards', label: 'Récompenses', link: '/rewards', testId: 'nav-rewards' },
  { id: 'ranking', label: 'Classement', link: '/ranking', testId: 'nav-ranking' },
  { id: 'profile', label: 'Profil', link: '/profile', testId: 'nav-profile' },
];

/**
 * Nom de matière déjà affiché par l'écran ouvert.
 * Le fil le lit. Il ne lance pas de lecture pour l'obtenir.
 */
@Injectable({ providedIn: 'root' })
export class ChildTrailNames {
  readonly subjectName = signal<string | null>(null);
  private generation = 0;

  publishSubject(name: string | null): number {
    this.generation += 1;
    this.subjectName.set(name?.trim() ? name.trim() : null);
    return this.generation;
  }

  clearSubject(generation: number): void {
    if (this.generation === generation) {
      this.subjectName.set(null);
    }
  }
}

/** Fil de l'app enfant. Vide au login, et sans nom de matière inventé. */
export function childTrail(url: string, subjectName: string | null): ChildTrailCrumb[] {
  const path = url.split(/[?#]/)[0] ?? url;
  const play = /^\/learn\/[^/]+\/play\/[^/]+$/.exec(path);
  if (play) {
    return withSubject(path, subjectName, { label: 'Jouer', path: null }, true);
  }
  const questions = /^\/learn\/[^/]+\/questions$/.exec(path);
  if (questions) {
    return withSubject(path, subjectName, { label: 'Questions', path: null }, false);
  }
  const board = /^\/learn\/[^/]+$/.exec(path);
  if (board) {
    const crumbs: ChildTrailCrumb[] = [{ label: 'Apprendre', path: '/learn' }];
    const name = subjectName?.trim() ?? '';
    if (name !== '') {
      crumbs.push({ label: name, path: null });
    }
    return crumbs;
  }
  const menu = CHILD_MENU.find((item) => item.link === path);
  if (menu) {
    return [{ label: menu.label, path: null }];
  }
  return [];
}

export function childRouteHasTrail(routePath: string): boolean {
  const sample: Record<string, string> = {
    home: '/home',
    learn: '/learn',
    'learn/:subjectId': '/learn/12',
    'learn/:subjectId/questions': '/learn/12/questions',
    'learn/:subjectId/play/:questionId': '/learn/12/play/4',
    rewards: '/rewards',
    ranking: '/ranking',
    profile: '/profile',
  };
  const url = sample[routePath];
  return url != null && childTrail(url, 'Mathématiques').length > 0;
}

function withSubject(
  path: string,
  subjectName: string | null,
  current: ChildTrailCrumb,
  questionsIsLink: boolean,
): ChildTrailCrumb[] {
  const subjectId = path.split('/')[2] ?? '';
  const crumbs: ChildTrailCrumb[] = [{ label: 'Apprendre', path: '/learn' }];
  const name = subjectName?.trim() ?? '';
  if (name !== '') {
    crumbs.push({ label: name, path: `/learn/${subjectId}` });
  }
  if (questionsIsLink) {
    crumbs.push({ label: 'Questions', path: `/learn/${subjectId}/questions` });
  }
  crumbs.push(current);
  return crumbs;
}
