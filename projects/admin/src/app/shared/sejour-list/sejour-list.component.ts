import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ParentSejourItem } from '../../core/api/api-models';

/**
 * Liste des séjours lus par l'API, parent et professeur.
 * N'ajoute aucun libellé : date, heure, durée, énoncé et matière viennent de la lecture.
 */
@Component({
  selector: 'app-sejour-list',
  templateUrl: './sejour-list.component.html',
  styleUrl: './sejour-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SejourListComponent {
  readonly sejours = input<ParentSejourItem[]>([]);
  /** Préfixe des data-testid déjà attendus par les pages (`parent-temps`, `teacher-sejour`). */
  readonly testId = input.required<string>();
}
