import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, signal } from '@angular/core';
import { Observable, Subscription, map, of } from 'rxjs';

import type { ChildQuestionPlayViewComponent, MemoryMatch } from './child-question-play-view.component';
import { autoSubmitQuestion, isPlayableQuestionForm, playForms, toPlayModel } from './play-form-rules';
import type { PlayAnswer, PlayQuestion } from './play-form-rules';

export interface PlayVerdict {
  passed: boolean;
  scorePercent: number;
  attemptRank?: number;
  attemptsRemaining?: number;
  pointsAwarded?: number;
  replayAvailable?: boolean;
  /** Étoile renvoyée par le serveur : none, black ou yellow. */
  mark?: string;
  /** Nombre d'étoiles jaunes renvoyé par le serveur. */
  yellowCount?: number;
}

export interface QuestionPlayTransport {
  open(): Observable<PlayQuestion>;
  grade(answer: PlayAnswer, question: PlayQuestion): Observable<PlayVerdict>;
  letterLocks(attempt: string): Observable<{ locks: boolean[] }>;
  memoryPair(match: MemoryMatch): Observable<{ matched: boolean }>;
}

/** État de jeu et réponses en vol, partagé entre Learning et l'aperçu professeur. */
export class QuestionPlaySession {
  readonly question = signal<PlayQuestion | null>(null);
  readonly model = computed(() => {
    const question = this.question();
    return question ? toPlayModel(question) : null;
  });
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<PlayVerdict | null>(null);
  readonly needsReplay = signal(false);
  /** Le serveur a refusé : cette page n'a plus d'essai. Rejouer ne doit pas revenir. */
  readonly attemptsExhausted = signal(false);
  /** Page ouverte. Le même identifiant survit à Rejouer, y compris Simon. */
  readonly playId = signal<string | null>(null);
  /** Essais encore ouverts, tels que le serveur les a donnés. */
  readonly attemptsRemaining = signal<number | null>(null);

  private readonly pending = signal<PlayAnswer | null>(null);
  private readonly selection = signal(0);
  private transport?: QuestionPlayTransport;
  private mainRequest?: Subscription;
  private letterRequest?: Subscription;

  readonly autoSubmit = computed(() => autoSubmitQuestion(this.model()));
  readonly canRetry = computed(() => this.pending() !== null && !this.saving());
  readonly disabled = computed(() =>
    this.loading() || this.saving() || this.pending() !== null || this.needsReplay()
      || this.attemptsExhausted() || this.result() !== null,
  );
  readonly canSubmit = computed(() => {
    this.selection();
    const view = this.view();
    const form = this.question()?.formCode;
    return !!view && isPlayableQuestionForm(form) && !this.disabled() && playForms[form].ready(view);
  });

  readonly verifyMemoryPair = (match: MemoryMatch): Observable<boolean> =>
    this.transport?.memoryPair(match).pipe(map(({ matched }) => matched)) ?? of(false);

  constructor(
    destroy: DestroyRef,
    private readonly view: () => ChildQuestionPlayViewComponent | undefined,
    private readonly errorText: (error: HttpErrorResponse, fallback: string) => string,
  ) {
    destroy.onDestroy(() => this.cancelRequests());
  }

  open(transport: QuestionPlayTransport): void {
    this.close();
    this.playId.set(crypto.randomUUID());
    this.transport = transport;
    this.loadQuestion();
  }

  close(): void {
    this.cancelRequests();
    this.transport = undefined;
    this.loading.set(false);
    this.saving.set(false);
    this.question.set(null);
    this.playId.set(null);
    this.attemptsRemaining.set(null);
    this.resetAnswer();
  }

  onSelectionChange(): void {
    this.selection.update((value) => value + 1);
    const view = this.view();
    if (view && this.question()?.formCode === 'reponse_libre' && !this.disabled()) {
      this.checkLetters(view);
    }
    if (this.autoSubmit() && this.canSubmit()) {
      this.submit();
    }
  }

  submit(): void {
    const view = this.view();
    const form = this.question()?.formCode;
    if (!view || !isPlayableQuestionForm(form) || !this.canSubmit()) {
      return;
    }
    const answer: PlayAnswer = { ...playForms[form].answer(view), submissionId: crypto.randomUUID() };
    this.pending.set(answer);
    this.send(answer);
  }

  retry(): void {
    const answer = this.pending();
    if (answer && this.canRetry()) {
      this.send(answer);
    }
  }

  replay(): void {
    const transport = this.transport;
    if (!transport) {
      return;
    }
    if (!this.question() || this.question()?.formCode === 'simon') {
      this.refreshQuestion();
      return;
    }
    this.cancelRequests();
    this.resetAnswer();
    this.view()?.reshuffle();
    this.selection.update((value) => value + 1);
  }

  private send(answer: PlayAnswer): void {
    const question = this.question();
    if (!question || !this.transport) {
      return;
    }
    this.letterRequest?.unsubscribe();
    this.saving.set(true);
    this.error.set(null);
    this.mainRequest = this.transport.grade(answer, question).subscribe({
      next: (result) => {
        this.pending.set(null);
        this.saving.set(false);
        this.result.set(result);
        if (typeof result.attemptsRemaining === 'number') {
          this.attemptsRemaining.set(result.attemptsRemaining);
        }
        const view = this.view();
        if (question.formCode === 'reponse_libre' && view) {
          this.checkLetters(view, result);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.errorText(error, 'Impossible d’enregistrer la réponse.'));
        if (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500) {
          return;
        }
        this.pending.set(null);
        const budgetSpent = error.status === 409 && pageBudgetSpent(error);
        this.attemptsExhausted.set(budgetSpent);
        this.needsReplay.set(!budgetSpent && (error.status === 409 || this.autoSubmit()));
      },
    });
  }

  private checkLetters(view: ChildQuestionPlayViewComponent, result?: PlayVerdict): void {
    this.letterRequest?.unsubscribe();
    this.letterRequest = this.transport?.letterLocks(view.letterAttemptForLocks()).subscribe({
      next: ({ locks }) => {
        view.applyLetterLocks(locks);
        if (result) {
          view.markLetterWrongs(!result.passed);
        }
        this.selection.update((value) => value + 1);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errorText(error, 'Impossible de vérifier les lettres.'));
      },
    });
  }

  private loadQuestion(): void {
    const transport = this.transport;
    if (!transport) {
      return;
    }
    this.loading.set(true);
    this.mainRequest = transport.open().subscribe({
      next: (body) => {
        this.question.set(body);
        this.attemptsRemaining.set(typeof body.attemptsRemaining === 'number' ? body.attemptsRemaining : null);
        this.loading.set(false);
        if (!isPlayableQuestionForm(body.formCode)) {
          this.error.set('Cette forme de question n’est pas encore jouable.');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.errorText(error, 'Impossible de charger la question.'));
        this.needsReplay.set(true);
      },
    });
  }

  /** Nouvelle suite Simon, même page, donc le même budget d'essais. */
  private refreshQuestion(): void {
    this.cancelRequests();
    this.resetAnswer();
    this.loadQuestion();
  }

  private resetAnswer(): void {
    this.error.set(null);
    this.pending.set(null);
    this.needsReplay.set(false);
    this.attemptsExhausted.set(false);
    this.result.set(null);
  }

  private cancelRequests(): void {
    this.mainRequest?.unsubscribe();
    this.letterRequest?.unsubscribe();
  }
}

/** Message renvoyé quand le budget de la page est épuisé. */
function pageBudgetSpent(error: HttpErrorResponse): boolean {
  const body = error.error;
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return false;
  }
  return (body as { message: unknown }).message === "Cette partie n'a plus d'essai.";
}
