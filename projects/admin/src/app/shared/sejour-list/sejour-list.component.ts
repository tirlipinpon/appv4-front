import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { JourneeItem } from '../../core/api/api-models';

/**
 * Journées lues par l'API, pour le professeur tant que son calendrier n'est pas là.
 * N'ajoute aucun libellé : date, durée, énoncé et matière viennent de la lecture.
 */
@Component({
  selector: 'app-sejour-list',
  templateUrl: './sejour-list.component.html',
  styleUrl: './sejour-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SejourListComponent {
  readonly sejours = input<JourneeItem[]>([]);
  /** Préfixe des data-testid déjà attendus par la page professeur (`teacher-sejour`). */
  readonly testId = input.required<string>();
}
