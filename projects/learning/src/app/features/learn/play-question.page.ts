import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { throwError } from 'rxjs';

import { ChildQuestionPlayViewComponent, QuestionPlaySession } from '@appv4/ui';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildPlayService } from './data-access/child-play.service';

@Component({
  selector: 'app-play-question-page',
  imports: [RouterLink, ChildQuestionPlayViewComponent],
  templateUrl: './play-question.page.html',
  styleUrl: './play-question.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayQuestionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ChildPlayService);
  private readonly view = viewChild(ChildQuestionPlayViewComponent);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly subjectId = signal(0);
  protected readonly play = new QuestionPlaySession(this.destroyRef, this.view, apiErrorMessage);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const subjectId = Number(params.get('subjectId'));
      const questionId = Number(params.get('questionId'));
      if (!Number.isSafeInteger(subjectId) || subjectId <= 0 || !Number.isSafeInteger(questionId) || questionId <= 0) {
        this.play.close();
        void this.router.navigateByUrl('/learn');
        return;
      }
      this.subjectId.set(subjectId);
      this.play.open({
        open: () => this.api.openQuestion(subjectId, questionId),
        grade: (answer, question) => {
          if (answer.formCode !== 'simon') {
            return this.api.submitAttempt(subjectId, questionId, answer);
          }
          if (!question.challengeId) {
            return throwError(() => new HttpErrorResponse({
              status: 409,
              error: { message: 'Cette partie Simon n’a pas pu démarrer. Rejoue pour obtenir une nouvelle suite.' },
            }));
          }
          return this.api.submitAttempt(subjectId, questionId, { ...answer, challengeId: question.challengeId });
        },
        letterLocks: (attempt) => this.api.checkLetterLocks(subjectId, questionId, attempt),
        memoryPair: (match) => this.api.checkMemoryPair(subjectId, questionId, match),
      });
    });
  }
}
