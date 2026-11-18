import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { ChildSubjectBoardResponse, ChildSubjectContinueLesson } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { knownSubjectIcon, subjectCardTint, subjectIconSrc } from '../../shared/subject-icons/subject-icons';
import { ChildSubjectBoardService } from './data-access/child-subject-board.service';

/**
 * Board d'une matière (LEARN-42).
 * Affiche uniquement ce que GET /api/ext/subjects/{id} renvoie.
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
  protected readonly subjectId = signal(0);

  protected readonly progressPercent = computed(() => {
    const b = this.board();
    const total = b?.lessonsTotal ?? 0;
    const done = b?.lessonsCompleted ?? 0;
    if (total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((done / total) * 100));
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('subjectId'));
    if (!Number.isFinite(id) || id <= 0) {
      void this.router.navigateByUrl('/learn');
      return;
    }
    this.subjectId.set(id);
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
        this.error.set(apiErrorMessage(err, 'Impossible de charger le board.'));
      },
    });
  }

  protected cardTint(iconCode: string | null | undefined): string {
    return subjectCardTint(iconCode);
  }

  protected iconSrc(iconCode: string | null | undefined): string | null {
    return subjectIconSrc(iconCode);
  }

  protected iconEmoji(iconCode: string | null | undefined): string | null {
    return knownSubjectIcon(iconCode)?.emoji ?? null;
  }

  protected continueCommands(lesson: ChildSubjectContinueLesson, board: ChildSubjectBoardResponse): (string | number)[] | null {
    if (board.subjectId == null || lesson.playQuestionId == null) {
      return null;
    }
    return ['/learn', board.subjectId, 'play', lesson.playQuestionId];
  }

  protected lessonsLabel(board: ChildSubjectBoardResponse): string {
    const done = board.lessonsCompleted ?? 0;
    const total = board.lessonsTotal ?? 0;
    return `${done} / ${total} leçons`;
  }

  protected topicLessonsLabel(completed: number | undefined, total: number | undefined): string {
    return `${completed ?? 0} / ${total ?? 0} leçons`;
  }
}
