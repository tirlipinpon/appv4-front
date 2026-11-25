import { Injectable, signal } from '@angular/core';

export interface SpaceMenuEntry {
  label: string;
  path: string;
  testId?: string;
}

export interface TrailCrumb {
  label: string;
  path: string | null;
}

/** Une seule liste pour le menu parent et le fil. */
export const PARENT_MENU: readonly SpaceMenuEntry[] = [
  { label: 'Accueil', path: '/parent', testId: 'parent-nav-home' },
  { label: 'Enfants', path: '/parent/enfants', testId: 'parent-nav-children' },
  { label: 'Profil', path: '/parent/profil', testId: 'parent-nav-profile' },
  { label: 'Matières', path: '/parent/matieres', testId: 'parent-nav-subjects' },
  { label: 'Humeur', path: '/parent/humeur', testId: 'parent-nav-humeur' },
  { label: 'Temps', path: '/parent/temps', testId: 'parent-nav-temps' },
  { label: 'Suivi', path: '/parent/suivis', testId: 'parent-nav-suivis' },
];

/** Une seule liste pour le menu professeur et le fil. */
export const TEACHER_MENU: readonly SpaceMenuEntry[] = [
  { label: 'Accueil', path: '/teacher' },
  { label: 'Profil', path: '/teacher/profil' },
  { label: 'Écoles', path: '/teacher/ecoles' },
  { label: 'Élèves', path: '/teacher/eleves' },
  { label: 'Matières', path: '/teacher/matieres' },
  { label: 'Questions', path: '/teacher/questions' },
];

/**
 * Nom déjà affiché par le séjour d'un élève.
 * Le fil le lit. Il ne va pas le chercher.
 */
@Injectable({ providedIn: 'root' })
export class SpaceTrailNames {
  readonly studentName = signal<string | null>(null);
  private generation = 0;

  publishStudent(name: string | null): number {
    this.generation += 1;
    this.studentName.set(name);
    return this.generation;
  }

  clearStudent(generation: number): void {
    if (this.generation === generation) {
      this.studentName.set(null);
    }
  }
}

/** Fil de l'espace ouvert. Vide hors parent et professeur, et sans nom inventé. */
export function spaceTrail(url: string, studentName: string | null): TrailCrumb[] {
  const path = url.split(/[?#]/)[0] ?? url;
  const student = /^\/teacher\/eleves\/[^/]+$/.exec(path);
  if (student) {
    const crumbs: TrailCrumb[] = [
      { label: 'Professeur', path: '/teacher' },
      { label: 'Élèves', path: '/teacher/eleves' },
    ];
    const name = studentName?.trim() ?? '';
    if (name !== '') {
      crumbs.push({ label: name, path: null });
    }
    return crumbs;
  }
  const parent = PARENT_MENU.find((item) => item.path === path);
  if (parent) {
    return [
      { label: 'Parent', path: '/parent' },
      { label: parent.label, path: null },
    ];
  }
  const teacher = TEACHER_MENU.find((item) => item.path === path);
  if (teacher) {
    return [
      { label: 'Professeur', path: '/teacher' },
      { label: teacher.label, path: null },
    ];
  }
  return [];
}

export function parentRouteHasTrail(routePath: string): boolean {
  const full = routePath === '' ? '/parent' : `/parent/${routePath}`;
  return PARENT_MENU.some((item) => item.path === full);
}

export function teacherRouteHasTrail(routePath: string): boolean {
  if (routePath === 'eleves/:childId') {
    return true;
  }
  const full = routePath === '' ? '/teacher' : `/teacher/${routePath}`;
  return TEACHER_MENU.some((item) => item.path === full);
}
