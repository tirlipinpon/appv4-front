import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { ChildAttemptResultResponse, ChildPlayQuestionResponse } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildPlayService } from './data-access/child-play.service';
import { randomTrueFalseOrder, shuffleCopy } from './shuffle';

/**
 * Jouer une question — UI charte ; verdict = API uniquement.
 * Ordre des propositions / boutons Vrai-Faux mélangé à chaque affichage (anti-réflexe).
 */
@Component({
  selector: 'app-play-question-page',
  imports: [RouterLink],
  templateUrl: './play-question.page.html',
  styleUrl: './play-question.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayQuestionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ChildPlayService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly subjectId = signal(0);
  protected readonly questionId = signal(0);
  protected readonly question = signal<ChildPlayQuestionResponse | null>(null);
  protected readonly displayChoices = signal<NonNullable<ChildPlayQuestionResponse['choices']>>([]);
  protected readonly displayStatements = signal<NonNullable<ChildPlayQuestionResponse['statements']>>([]);
  /** Ordre des boutons Vrai/Faux par statementId. */
  protected readonly tfButtonOrder = signal<Readonly<Record<number, readonly boolean[]>>>({});
  protected readonly selectedChoices = signal<ReadonlySet<number>>(new Set());
  protected readonly statementValues = signal<Readonly<Record<number, boolean>>>({});
  protected readonly result = signal<ChildAttemptResultResponse | null>(null);

  protected readonly isQcm = computed(() => this.question()?.formCode === 'qcm');
  protected readonly isTrueFalse = computed(() => this.question()?.formCode === 'vrai_faux');
  protected readonly canSubmit = computed(() => {
    const q = this.question();
    if (!q || this.saving() || this.result()) {
      return false;
    }
    if (q.formCode === 'qcm') {
      return this.selectedChoices().size > 0;
    }
    if (q.formCode === 'vrai_faux') {
      const statements = this.displayStatements();
      const values = this.statementValues();
      return statements.length > 0 && statements.every((s) => s.statementId != null && values[s.statementId!] !== undefined);
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
        this.applyPresentationOrder(body);
        this.loading.set(false);
        if (body.formCode !== 'qcm' && body.formCode !== 'vrai_faux') {
          this.error.set('Cette forme de question n’est pas encore jouable.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger la question.'));
      },
    });
  }

  protected toggleChoice(choiceId: number): void {
    if (this.result() || this.saving()) {
      return;
    }
    this.selectedChoices.update((current) => {
      const next = new Set(current);
      if (next.has(choiceId)) {
        next.delete(choiceId);
      } else {
        next.add(choiceId);
      }
      return next;
    });
  }

  protected setStatement(statementId: number, value: boolean): void {
    if (this.result() || this.saving()) {
      return;
    }
    this.statementValues.update((current) => ({ ...current, [statementId]: value }));
  }

  protected statementValue(statementId: number): boolean | undefined {
    return this.statementValues()[statementId];
  }

  protected tfOrderFor(statementId: number): readonly boolean[] {
    return this.tfButtonOrder()[statementId] ?? [true, false];
  }

  protected choiceSelected(choiceId: number): boolean {
    return this.selectedChoices().has(choiceId);
  }

  protected submit(): void {
    const q = this.question();
    if (!q || !this.canSubmit()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body =
      q.formCode === 'qcm'
        ? { selectedChoiceIds: [...this.selectedChoices()] }
        : {
            statements: this.displayStatements()
              .filter((s) => s.statementId != null)
              .map((s) => ({
                statementId: s.statementId!,
                value: this.statementValues()[s.statementId!] === true,
              })),
          };
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
    this.selectedChoices.set(new Set());
    this.statementValues.set({});
    this.error.set(null);
    const q = this.question();
    if (q) {
      this.applyPresentationOrder(q);
    }
  }

  private applyPresentationOrder(body: ChildPlayQuestionResponse): void {
    this.displayChoices.set(shuffleCopy(body.choices ?? []));
    const statements = shuffleCopy(body.statements ?? []);
    this.displayStatements.set(statements);
    const orders: Record<number, readonly boolean[]> = {};
    for (const statement of statements) {
      if (statement.statementId != null) {
        orders[statement.statementId] = randomTrueFalseOrder();
      }
    }
    this.tfButtonOrder.set(orders);
  }
}
