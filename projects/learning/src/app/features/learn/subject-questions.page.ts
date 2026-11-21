import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { isPlayableQuestionForm, QuestionFormMarkComponent } from '@appv4/ui';

import type { ChildLearningQuestionItem } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildPlayService } from './data-access/child-play.service';
import type { PlayQueueState } from './play-queue';
import { shuffleCopy } from './shuffle';

/**
 * Liste des questions d'une matière — ordre mélangé à chaque ouverture (anti-réflexe).
 */
@Component({
  selector: 'app-subject-questions-page',
  imports: [RouterLink, QuestionFormMarkComponent],
  templateUrl: './subject-questions.page.html',
  styleUrl: './subject-questions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectQuestionsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ChildPlayService);
  private readonly destroyRef = inject(DestroyRef);
  private pending?: Subscription;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly subjectName = signal('');
  protected readonly subjectId = signal(0);
  protected readonly questions = signal<ChildLearningQuestionItem[]>([]);
  protected readonly nextCursor = signal<number | null>(0);
  protected readonly canPlay = isPlayableQuestionForm;

  protected questionsQueue(): PlayQueueState {
    return {
      source: 'questions',
      queue: this.questions()
        .map((question) => question.questionId)
        .filter((id): id is number => id != null),
    };
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.pending?.unsubscribe();
      const id = Number(params.get('subjectId'));
      if (!Number.isSafeInteger(id) || id <= 0) {
        void this.router.navigateByUrl('/learn');
        return;
      }
      this.subjectId.set(id);
      this.subjectName.set('');
      this.questions.set([]);
      this.nextCursor.set(0);
      this.loadMore();
    });
  }

  protected loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor === null) {
      return;
    }
    this.pending?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pending = this.api.listQuestions(this.subjectId(), cursor).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (body) => {
        this.subjectName.set(body.subjectName);
        this.questions.update((current) => [...current, ...shuffleCopy(body.questions)]);
        this.nextCursor.set(body.nextCursor ?? null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger les questions.'));
      },
    });
  }

}
