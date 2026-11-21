import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { knownSubjectIcon, subjectCardTint, subjectIconSrc } from '../../shared/subject-icons/subject-icons';
import { ChildSubjectBoardService } from './data-access/child-subject-board.service';
import type { PlayQueueState } from './play-queue';

/**
 * Page matière Learn. La leçon affichée est celle renvoyée par le board.
 * Les thèmes déjà présents dans la réponse restent hors de cet écran.
 */
@Component({
  selector: 'app-subject-board-page',
  imports: [RouterLink],
  templateUrl: './subject-board.page.html',
  styleUrl: './subject-board.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectBoardPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ChildSubjectBoardService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly board = this.api.board;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('subjectId'));
    if (!Number.isFinite(id) || id <= 0) {
      void this.router.navigateByUrl('/learn');
      return;
    }
    this.api.load(id).subscribe({
      next: () => {
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.error.set(apiErrorMessage(err, 'Matière introuvable.'));
          return;
        }
        this.error.set(apiErrorMessage(err, 'Impossible de charger la matière.'));
      },
    });
  }

  protected cardTint(subject: { iconCode?: string | null; accentColor?: string | null }): string {
    const accent = subject.accentColor;
    if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
      return accent;
    }
    return subjectCardTint(subject.iconCode);
  }

  protected iconSrc(iconCode: string | null | undefined): string | null {
    return subjectIconSrc(iconCode);
  }

  protected iconEmoji(iconCode: string | null | undefined): string | null {
    return knownSubjectIcon(iconCode)?.emoji ?? null;
  }

  protected lessonQueue(lesson: { questions?: { questionId?: number }[] | null }): PlayQueueState {
    return {
      source: 'lesson',
      queue: (lesson.questions ?? [])
        .map((question) => question.questionId)
        .filter((id): id is number => id != null),
    };
  }
}
