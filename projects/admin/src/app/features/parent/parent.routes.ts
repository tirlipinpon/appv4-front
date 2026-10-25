import { Routes } from '@angular/router';

import { spaceGuard } from '../../core/auth/space.guard';
import { SpaceRoles } from '../../core/auth/space-roles';
import { ParentChildrenPage } from './parent-children.page';
import { ParentSpacePage } from './parent-space.page';

/** Espace parent : le jeton doit dire parent (SCRUM-128). Les enfants sont SCRUM-156. */
export const PARENT_ROUTES: Routes = [
  { path: 'enfants', component: ParentChildrenPage, canActivate: [spaceGuard(SpaceRoles.parent)] },
  {
    path: 'matieres',
    loadComponent: () => import('./parent-subjects.page').then((m) => m.ParentSubjectsPage),
    canActivate: [spaceGuard(SpaceRoles.parent)],
  },
  {
    path: '',
    pathMatch: 'full',
    component: ParentSpacePage,
    canActivate: [spaceGuard(SpaceRoles.parent)],
  },
];
