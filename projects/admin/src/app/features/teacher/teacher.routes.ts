import { Routes } from '@angular/router';

import { spaceGuard } from '../../core/auth/space.guard';
import { SpaceRoles } from '../../core/auth/space-roles';
import { TeacherSpacePage } from './teacher-space.page';

/** Espace professeur : le jeton doit dire teacher (SCRUM-128).
 * Le profil, les écoles, les élèves, les matières et les questions ne se chargent qu'à l'ouverture de leur page.
 * /teacher/questions montre les énoncés, hors de la page matières.
 */
export const TEACHER_ROUTES: Routes = [
  {
    path: 'profil',
    loadComponent: () => import('./teacher-profile.page').then((m) => m.TeacherProfilePage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: 'ecoles',
    loadComponent: () => import('./teacher-schools.page').then((m) => m.TeacherSchoolsPage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: 'eleves',
    loadComponent: () => import('./teacher-students.page').then((m) => m.TeacherStudentsPage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: 'matieres',
    loadComponent: () => import('./teacher-subjects.page').then((m) => m.TeacherSubjectsPage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: 'questions',
    loadComponent: () => import('./teacher-questions.page').then((m) => m.TeacherQuestionsPage),
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
  {
    path: '',
    pathMatch: 'full',
    component: TeacherSpacePage,
    canActivate: [spaceGuard(SpaceRoles.teacher)],
  },
];
