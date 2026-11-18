import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { knownSubjectIcon, subjectCardTint } from '../../shared/subject-icons/subject-icons';
import { ChildSubjectsService } from './data-access/child-subjects.service';

/**
 * Grille des matières de l'enfant (LEARN-29).
 * Affiche uniquement ce que GET /api/ext/subjects renvoie.
 */
@Component({
  selector: 'app-learn-page',
  templateUrl: './learn.page.html',
  styleUrl: './learn.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnPage implements OnInit {
  private readonly api = inject(ChildSubjectsService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly subjects = this.api.subjects;
  protected readonly totalLabel = computed(() => {
    const count = this.subjects().length;
    return `${count} total`;
  });

  ngOnInit(): void {
    this.api.load().subscribe({
      next: () => {
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger les matières.'));
      },
    });
  }

  protected cardTint(iconCode: string | null | undefined): string {
    return subjectCardTint(iconCode);
  }

  protected iconEmoji(iconCode: string | null | undefined): string | null {
    return knownSubjectIcon(iconCode)?.emoji ?? null;
  }

  protected questionLabel(count: number | undefined): string {
    const n = count ?? 0;
    return n === 1 ? '1 question' : `${n} questions`;
  }
}
