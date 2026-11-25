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

  it('laisse les pages admin, le login et l’attente sans fil', () => {
    expect(spaceTrail('/admin/humeurs', null)).toEqual([]);
    expect(spaceTrail('/admin/teacher-requests', null)).toEqual([]);
    expect(spaceTrail('/admin/ia', null)).toEqual([]);
    expect(spaceTrail('/admin/horaires', null)).toEqual([]);
    expect(spaceTrail('/login', null)).toEqual([]);
    expect(spaceTrail('/teacher-pending', null)).toEqual([]);
  });
});
