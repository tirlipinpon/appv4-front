import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { SpaceHeader } from '../../core/layout/space-header';

/**
 * Adresse de l'espace parent (SCRUM-128).
 * Le tableau de bord titré reste SCRUM-131. Ici la page peut rester vide.
 */
@Component({
  selector: 'app-parent-space-page',
  imports: [RouterLink, MatButtonModule, SpaceHeader],
  templateUrl: './parent-space.page.html',
  styleUrl: './parent-space.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentSpacePage {}
