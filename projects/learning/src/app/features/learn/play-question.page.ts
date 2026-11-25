import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, throwError } from 'rxjs';

import { ChildQuestionPlayViewComponent, QuestionPlaySession } from '@appv4/ui';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { knownSubjectIcon, subjectCardTint, subjectIconSrc } from '../../shared/subject-icons/subject-icons';
import { ChildPlayService } from './data-access/child-play.service';
import { ChildSubjectBoardService } from './data-access/child-subject-board.service';
import { ChildSubjectsService } from './data-access/child-subjects.service';
import { ChildTrailNames } from '../shell/child-trail';
import { nextQuestionId, readPlayQueue, type PlayQueueState } from './play-queue';

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
  private readonly subjectsApi = inject(ChildSubjectsService);
  private readonly boardApi = inject(ChildSubjectBoardService);
  private readonly view = viewChild(ChildQuestionPlayViewComponent);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trailNames = inject(ChildTrailNames);
  private trailGeneration = 0;
  private subjectLoad?: Subscription;

  protected readonly subjectId = signal(0);
  /** Matière renvoyée par la liste. Vide tant que l'API ne l'a pas donnée. */
  protected readonly subject = signal<{
    name: string;
    iconCode?: string | null;
    accentColor?: string | null;
  } | null>(null);
  private readonly questionId = signal(0);
  protected readonly queue = signal<PlayQueueState>({ source: 'questions', queue: [] });
  private readonly stillToValidate = signal<number[]>([]);
  protected readonly play = new QuestionPlaySession(this.destroyRef, this.view, apiErrorMessage);

  constructor() {
    effect((onCleanup) => {
      const verdict = this.play.result();
      const queue = this.queue();
      const current = this.questionId();
      const subjectId = this.subjectId();
      const atEnd = nextQuestionId(queue.queue, current) === null;
      if (verdict == null || queue.source !== 'lesson' || !atEnd || subjectId <= 0) {
        this.stillToValidate.set([]);
        return;
      }
      const subscription = this.boardApi.load(subjectId).subscribe({
        next: (board) => {
          const ids = (board.lesson?.questions ?? [])
            .map((question) => question.questionId)
            .filter((id): id is number => id != null);
          this.stillToValidate.set(ids);
        },
        error: () => this.stillToValidate.set([]),
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.subjectLoad?.unsubscribe();
      this.trailNames.clearSubject(this.trailGeneration);
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.subjectLoad?.unsubscribe();
      this.subject.set(null);
      this.trailGeneration = this.trailNames.publishSubject(null);
      this.queue.set(readPlayQueue(history.state));
      const subjectId = Number(params.get('subjectId'));
      const questionId = Number(params.get('questionId'));
      if (!Number.isSafeInteger(subjectId) || subjectId <= 0 || !Number.isSafeInteger(questionId) || questionId <= 0) {
        this.play.close();
        void this.router.navigateByUrl('/learn');
        return;
      }
      this.subjectId.set(subjectId);
      this.questionId.set(questionId);
      this.loadSubjectName(subjectId, this.trailGeneration);
      this.play.open({
        open: () => this.api.openQuestion(subjectId, questionId, this.play.playId()),
        grade: (answer, question) => {
          const playId = this.play.playId();
          if (answer.formCode !== 'simon') {
            return this.api.submitAttempt(subjectId, questionId, answer, playId);
          }
          if (!question.challengeId) {
            return throwError(() => new HttpErrorResponse({
              status: 409,
              error: { message: 'Cette partie Simon n’a pas pu démarrer. Rejoue pour obtenir une nouvelle suite.' },
            }));
          }
          return this.api.submitAttempt(subjectId, questionId, { ...answer, challengeId: question.challengeId }, playId);
        },
        letterLocks: (attempt) => this.api.checkLetterLocks(subjectId, questionId, attempt),
        memoryPair: (match) => this.api.checkMemoryPair(subjectId, questionId, match),
      });
    });
  }

  /** Le fil et le titre lisent ce nom. Ils ne le fabriquent pas. */
  private loadSubjectName(subjectId: number, generation: number): void {
    this.subjectLoad = this.subjectsApi.load().subscribe({
      next: (body) => {
        if (this.trailGeneration !== generation) {
          return;
        }
        const found = (body.subjects ?? []).find((item) => item.subjectId === subjectId);
        const name = found?.name?.trim() ?? '';
        if (name === '') {
          return;
        }
        this.subject.set({
          name,
          iconCode: found?.iconCode,
          accentColor: found?.accentColor,
        });
        this.trailGeneration = this.trailNames.publishSubject(name);
      },
      error: () => undefined,
    });
  }

  /** Teinte API de la matière, seulement si c'est un code #rrggbb. */
  protected cardTint(item: { iconCode?: string | null; accentColor?: string | null }): string {
    const accent = item.accentColor;
    if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
      return accent;
    }
    return subjectCardTint(item.iconCode);
  }

  protected iconSrc(iconCode: string | null | undefined): string | null {
    return subjectIconSrc(iconCode);
  }

  protected iconEmoji(iconCode: string | null | undefined): string | null {
    return knownSubjectIcon(iconCode)?.emoji ?? null;
  }

  protected nextId(): number | null {
    const queue = this.queue();
    const current = this.questionId();
    const following = nextQuestionId(queue.queue, current);
    if (following !== null || queue.source !== 'lesson') {
      return following;
    }
    return nextQuestionId(queue.queue, current, this.stillToValidate());
  }

  protected sameQueue(): PlayQueueState {
    return this.queue();
  }

  protected lessonFinishedLabel(verdict: {
    passed?: boolean;
    lessonFinishedLabel?: string | null;
  }): string | null {
    if (this.queue().source !== 'lesson' || this.nextId() !== null) {
      return null;
    }
    const label = verdict.lessonFinishedLabel;
    return label == null || label === '' ? null : label;
  }
}
