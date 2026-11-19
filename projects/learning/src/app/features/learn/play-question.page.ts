import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChildQuestionPlayViewComponent, type ChildPlayViewQuestion } from '@appv4/ui';

import type { ChildAttemptResultResponse, ChildPlayQuestionResponse } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { playForms } from './play-form-rules';
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

  private readonly destroyRef = inject(DestroyRef);
  private letterCheck?: Subscription;
  private readonly form = computed(() => playForms.get(this.question()?.formCode ?? ''));

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
    const view = this.playView();
    return !!view && !this.saving() && !this.result() && this.form()?.ready(view) === true;
  });

  /** Formes envoyées au dernier geste, sans bouton Valider : Simon, image à clics ordonnés. */
  protected readonly autoSubmit = computed(() => {
    const model = this.playModel();
    return (
      model?.formCode === 'simon' || (model?.formCode === 'image_interactive' && model.clicksOrdered !== false)
    );
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
        if (!this.form()) {
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
    const model = this.playModel();
    const view = this.playView();
    if (model?.formCode === 'reponse_libre' && view && !this.result() && !this.saving()) {
      this.checkLetters(view);
    }
    if (this.autoSubmit() && this.canSubmit()) {
      this.submit();
    }
  }

  private checkLetters(view: ChildQuestionPlayViewComponent, result?: ChildAttemptResultResponse): void {
    this.letterCheck?.unsubscribe();
    this.error.set(null);
    this.letterCheck = this.api
      .checkLetterLocks(this.subjectId(), this.questionId(), view.letterAttemptForLocks())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ locks }) => {
          view.applyLetterLocks(locks ?? []);
          if (result) {
            view.markLetterWrongs(result.passed !== true);
          }
          this.selectionTick.update((n) => n + 1);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(apiErrorMessage(err, 'Impossible de vérifier les lettres.'));
        },
      });
  }

  protected submit(): void {
    const form = this.form();
    const view = this.playView();
    if (!form || !view || !this.canSubmit()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.letterCheck?.unsubscribe();
    this.api
      .submitAttempt(this.subjectId(), this.questionId(), form.answer(view))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.saving.set(false);
          if (this.question()?.formCode === 'reponse_libre') {
            this.checkLetters(view, result);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible d’enregistrer la réponse.'));
        },
      });
  }

  protected replay(): void {
    this.letterCheck?.unsubscribe();
    this.result.set(null);
    this.error.set(null);
    if (this.playModel()?.formCode === 'simon') {
      this.reloadSimon();
      return;
    }
    this.playView()?.reshuffle();
    this.selectionTick.update((n) => n + 1);
  }

  /**
   * Une nouvelle partie Simon : le serveur tire et garde une autre suite.
   * Rejouer seulement l'écran renverrait l'ancienne, déjà notée et effacée.
   */
  private reloadSimon(): void {
    this.loading.set(true);
    this.api.getQuestion(this.subjectId(), this.questionId()).subscribe({
      next: (body) => {
        this.question.set(body);
        this.playModel.set(toPlayModel(body));
        this.loading.set(false);
        this.selectionTick.update((n) => n + 1);
        setTimeout(() => this.playView()?.reshuffle());
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger la question.'));
      },
    });
  }
}

function toPlayModel(body: ChildPlayQuestionResponse): ChildPlayViewQuestion {
  const formCode = body.formCode ?? '';
  return {
    formCode,
    formLabel: body.formLabel || undefined,
    formIconCode: body.iconCode,
    formColor: body.color,
    prompt:
      formCode === 'memory'
        ? body.prompt || 'Memory'
        : formCode === 'order'
          ? body.prompt || 'Ordre'
          : body.prompt,
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
    items: (body.items ?? [])
      .filter((i) => i.label != null)
      .map((i) => ({ itemId: i.itemId, label: i.label!, axisLabel: i.axisLabel })),
    timelineEnabled: body.timelineEnabled,
    columns: (body.columns ?? [])
      .filter((c) => c.label != null)
      .map((c) => ({ columnId: c.columnId, label: c.label! })),
    cards: (body.cards ?? [])
      .filter((c) => c.label != null)
      .map((c) => ({ cardId: c.cardId, label: c.label! })),
    links: (body.links ?? [])
      .filter((link) => link.leftLabel != null && link.rightLabel != null)
      .map((link) => ({
        linkId: link.linkId,
        leftLabel: link.leftLabel!,
        rightLabel: link.rightLabel!,
      })),
    sentence: body.sentence,
    words: (body.words ?? [])
      .filter((word) => word.label != null)
      .map((word) => ({ wordId: word.wordId, label: word.label! })),
    imageWebp: body.imageWebp,
    clicksOrdered: body.clicksOrdered,
    clickZones: (body.clickZones ?? []).flatMap((zone) => {
      if (zone.zoneId == null || !zone.shape || !zone.points?.length) {
        return [];
      }
      const points = zone.points.flatMap((point) =>
        point.x == null || point.y == null ? [] : [{ x: point.x, y: point.y }],
      );
      return points.length ? [{ zoneId: zone.zoneId, shape: zone.shape, points }] : [];
    }),
    clickSteps: (body.clickSteps ?? []).flatMap((step) =>
      step.zoneId == null || !step.prompt ? [] : [{ zoneId: step.zoneId, prompt: step.prompt }],
    ),
    letterCount: body.letterCount,
    letterMask: body.letterMask,
    boardMode: body.boardMode,
    boardImageWebp: body.boardImageWebp,
    snapDistance: body.snapDistance,
    puzzlePieces: (body.puzzlePieces ?? []).flatMap((piece) => {
      if (!piece.shape || !piece.points?.length) {
        return [];
      }
      const points = piece.points.flatMap((point) =>
        point.x == null || point.y == null ? [] : [{ x: point.x, y: point.y }],
      );
      if (!points.length) {
        return [];
      }
      return [
        {
          pieceId: piece.pieceId,
          label: piece.label ?? '',
          shape: piece.shape,
          points,
          slotX: piece.slotX,
          slotY: piece.slotY,
          slotWidth: piece.slotWidth,
        },
      ];
    }),
    elementType: body.elementType,
    elements: (body.elements ?? []).map((element) => ({ label: element.label ?? '', color: element.color })),
    sequence: body.sequence,
  };
}
