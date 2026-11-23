import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SpaceHeader } from '../../core/layout/space-header';

/**
 * Adresse de l'espace professeur (SCRUM-128).
 * Le tableau de bord titré reste SCRUM-131. Ici la page peut rester vide.
 */
@Component({
  selector: 'app-teacher-space-page',
  imports: [SpaceHeader],
  templateUrl: './teacher-space.page.html',
  styleUrl: './teacher-space.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSpacePage {}
