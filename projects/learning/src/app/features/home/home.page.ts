import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildProgressService } from './data-access/child-progress.service';

const WEEK_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/**
 * Accueil : XP, streak, palier et grille de la semaine (LEARN-31).
 * Affiche uniquement ce que GET /api/ext/progress renvoie.
 */
@Component({
  selector: 'app-home-page',
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly api = inject(ChildProgressService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly progress = this.api.progress;
  protected readonly weekLabels = WEEK_LABELS;

  protected readonly weekCells = computed(() => {
    const days = this.progress()?.weekDays ?? [];
    return WEEK_LABELS.map((label, index) => ({
      label,
      played: days[index] === true,
    }));
  });

  ngOnInit(): void {
    this.api.load().subscribe({
      next: () => {
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger la progression.'));
      },
    });
  }
}
