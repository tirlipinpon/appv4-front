import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChildQuestionPlayViewComponent, type ChildPlayViewQuestion } from '@appv4/ui';

import type { ChildAttemptResultResponse, ChildPlayQuestionResponse } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildPlayService } from './data-access/child-play.service';

/**
 * Jouer une question — rendu partagé @appv4/ui ; verdict = API uniquement.
 */
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
  private readonly playView = viewChild(ChildQuestionPlayViewComponent);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly subjectId = signal(0);
  protected readonly questionId = signal(0);
  protected readonly question = signal<ChildPlayQuestionResponse | null>(null);
  protected readonly playModel = signal<ChildPlayViewQuestion | null>(null);
  protected readonly result = signal<ChildAttemptResultResponse | null>(null);
  protected readonly selectionTick = signal(0);

  protected readonly canSubmit = computed(() => {
    this.selectionTick();
    const q = this.question();
    const view = this.playView();
    if (!q || !view || this.saving() || this.result()) {
      return false;
    }
    if (q.formCode === 'qcm') {
      return view.selectedChoiceIds().length > 0;
    }
    if (q.formCode === 'vrai_faux') {
      return view.allStatementsAnswered();
    }
    if (q.formCode === 'memory') {
      return view.allPairsMatched();
    }
    if (q.formCode === 'classement') {
      return view.allCardsPlaced();
    }
    return false;
  });

  ngOnInit(): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    const questionId = Number(this.route.snapshot.paramMap.get('questionId'));
    if (!Number.isFinite(subjectId) || subjectId <= 0 || !Number.isFinite(questionId) || questionId <= 0) {
      void this.router.navigateByUrl('/learn');
      return;
    }
    this.subjectId.set(subjectId);
    this.questionId.set(questionId);
    this.api.getQuestion(subjectId, questionId).subscribe({
      next: (body) => {
        this.question.set(body);
        this.playModel.set(toPlayModel(body));
        this.loading.set(false);
        if (
          body.formCode !== 'qcm' &&
          body.formCode !== 'vrai_faux' &&
          body.formCode !== 'memory' &&
          body.formCode !== 'classement'
        ) {
          this.error.set('Cette forme de question n’est pas encore jouable.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger la question.'));
      },
    });
  }

  protected onSelectionChange(): void {
    this.selectionTick.update((n) => n + 1);
  }

  protected submit(): void {
    const q = this.question();
    const view = this.playView();
    if (!q || !view || !this.canSubmit()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body =
      q.formCode === 'qcm'
        ? { selectedChoiceIds: view.selectedChoiceIds() }
        : q.formCode === 'memory'
          ? { matchedPairIds: view.matchedPairIds() }
          : q.formCode === 'classement'
            ? { placements: view.placements() }
            : { statements: view.statementAnswers() };
    this.api.submitAttempt(this.subjectId(), this.questionId(), body).subscribe({
      next: (result) => {
        this.result.set(result);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible d’enregistrer la réponse.'));
      },
    });
  }

  protected replay(): void {
    this.result.set(null);
    this.error.set(null);
    this.playView()?.reshuffle();
    this.selectionTick.update((n) => n + 1);
  }
}

function toPlayModel(body: ChildPlayQuestionResponse): ChildPlayViewQuestion {
  return {
    formCode: body.formCode ?? '',
    formLabel: body.formCode === 'memory' ? 'FORME · memory' : undefined,
    prompt: body.formCode === 'memory' ? body.prompt || 'Memory' : body.prompt,
    choices: (body.choices ?? [])
      .filter((c) => c.label != null)
      .map((c) => ({ choiceId: c.choiceId, label: c.label! })),
    statements: (body.statements ?? [])
      .filter((s) => s.label != null)
      .map((s) => ({ statementId: s.statementId, label: s.label! })),
    pairs: (body.pairs ?? [])
      .filter((p) => p.questionSide != null && p.answerSide != null)
      .map((p) => ({
        pairId: p.pairId,
        questionSide: p.questionSide!,
        answerSide: p.answerSide!,
      })),
    columns: (body.columns ?? [])
      .filter((c) => c.label != null)
      .map((c) => ({ columnId: c.columnId, label: c.label! })),
    cards: (body.cards ?? [])
      .filter((c) => c.label != null)
      .map((c) => ({ cardId: c.cardId, label: c.label! })),
  };
}
