import { PARENT_ROUTES } from '../../features/parent/parent.routes';
import { TEACHER_ROUTES } from '../../features/teacher/teacher.routes';
import { parentRouteHasTrail, spaceTrail, teacherRouteHasTrail } from './space-trail';

describe('catalogue du fil', () => {
  it('couvre chaque route parent', () => {
    for (const route of PARENT_ROUTES) {
      expect(parentRouteHasTrail(route.path ?? '')).withContext(route.path ?? '').toBeTrue();
    }
  });

  it('couvre chaque route professeur', () => {
    for (const route of TEACHER_ROUTES) {
      expect(teacherRouteHasTrail(route.path ?? '')).withContext(route.path ?? '').toBeTrue();
    }
  });

  it('sur Questions, le fil ajoute la matière ouverte', () => {
    expect(spaceTrail('/teacher/questions', null, 'Mathématiques')).toEqual([
      { label: 'Professeur', path: '/teacher' },
      { label: 'Questions', path: '/teacher/questions' },
      { label: 'Mathématiques', path: null },
    ]);
    expect(spaceTrail('/teacher/questions', null)).toEqual([
      { label: 'Professeur', path: '/teacher' },
      { label: 'Questions', path: null },
    ]);
    expect(spaceTrail('/teacher/profil', null, 'Mathématiques')).toEqual([
      { label: 'Professeur', path: '/teacher' },
      { label: 'Profil', path: null },
    ]);
  });

  it('laisse les pages admin, le login et l’attente sans fil', () => {
    expect(spaceTrail('/admin/humeurs', null)).toEqual([]);
    expect(spaceTrail('/admin/teacher-requests', null)).toEqual([]);
    expect(spaceTrail('/admin/ia', null)).toEqual([]);
    expect(spaceTrail('/admin/horaires', null)).toEqual([]);
    expect(spaceTrail('/login', null)).toEqual([]);
    expect(spaceTrail('/teacher-pending', null)).toEqual([]);
  });
});
