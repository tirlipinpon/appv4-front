import { Routes } from '@angular/router';

import { spaceGuard } from '../../core/auth/space.guard';
import { SpaceRoles } from '../../core/auth/space-roles';
import { ParentSpacePage } from './parent-space.page';

/** Espace parent : le jeton doit dire parent (SCRUM-128). */
export const PARENT_ROUTES: Routes = [
  { path: '', component: ParentSpacePage, canActivate: [spaceGuard(SpaceRoles.parent)] },
];
