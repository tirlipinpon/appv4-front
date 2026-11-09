import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SpaceHeader } from '../../core/layout/space-header';

/**
 * Adresse de l'espace parent (SCRUM-128).
 * Le tableau de bord titré reste SCRUM-131. Ici la page peut rester vide.
 */
@Component({
  selector: 'app-parent-space-page',
  imports: [SpaceHeader],
  templateUrl: './parent-space.page.html',
  styleUrl: './parent-space.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentSpacePage {}
