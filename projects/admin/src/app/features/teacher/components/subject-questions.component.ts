import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  ChildQuestionPlayViewComponent,
  QuestionFormMarkComponent,
  QuestionPlaySession,
} from '@appv4/ui';

import type { TeacherSubjectFollowersResponse } from '../../../core/api/api-models';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { preparePhoto } from '../../../shared/prepare-photo/prepare-photo';
import { TeacherQuestionsService } from '../data-access/teacher-questions.service';
import { ClickZoneEditorComponent } from './click-zone-editor.component';
import { PieceFaceComponent } from './piece-face.component';
import { LetterBoxesComponent } from './letter-boxes.component';
import { ClickZone } from './click-zone';
import { buildSaveBody, parseSavedQuestion, requireSavedQuestion } from './question-form.adapters';
import {
  GamificationDraft,
  GamificationLevel,
  attemptLimit,
  copyDraft,
  draftFromItem,
  levelsFromCatalog,
  withAttempts,
  withCustomize,
  withDifficulty,
  withDisabled,
  withPoint,
} from './question-gamification';
import {
  CardDraft,
  ChoiceDraft,
  ColumnDraft,
  FORM,
  GapWordDraft,
  ItemDraft,
  LinkDraft,
  PairDraft,
  PuzzleBoardMode,
  PUZZLE_BOARD_MODE,
  SIMON_ELEMENT_TYPE,
  SIMON_ELEMENT_TYPES,
  SavedQuestion,
  SimonElementDraft,
  SimonElementType,
  StatementDraft,
  defaultMagnet,
  emptyCards,
  emptyChoices,
  emptyColumns,
  emptyDecoys,
  emptyItems,
  emptyLinks,
  emptyPairs,
  emptySimonElements,
  emptyStatements,
  holeCount,
  isKnownFormCode,
  isSimonColor,
  simonDraftError,
  withoutHole,
} from './question-form.model';

/** Matière proposée comme destination d'une copie. */
export interface QuestionDestination {
  id: number;
  label: string;
}

interface FormChoice {
  code: string;
  label: string;
  iconCode: string | null;
  color: string | null;
}

/**
 * Préparer un choix multiple, un Memory, un Ordre ou un Vrai ou faux
 * (SCRUM-174, SCRUM-175, SCRUM-176, SCRUM-177).
 * La liste des formes est celle de l'API. L'élève ne joue pas ici.
 * La réponse libre (SCRUM-198) demande l'énoncé et la réponse attendue.
 * La saisie lettre par lettre (SCRUM-182) demande le même couple, puis une case
 * par lettre. Valider envoie le mot composé : le verdict vient de l'API.
 * Le puzzle (SCRUM-183) reprend l'éditeur de l'image à cliquer : les pièces
 * sont découpées dans l'image, sans vert ni rouge. On peut les reposer
 * sur leur découpe ; le magnétisme dit à quelle distance elles se collent.
 * Le Simon (ADMIN-25) demande un genre, au moins deux éléments, puis la suite
 * à refaire, construite en touchant les éléments dans l'ordre.
 * Il peut copier une ou plusieurs questions vers une de ses matières.
 * Il peut aussi en supprimer une ou plusieurs, après avoir vu combien
 * d'enfants suivent le cours et leurs noms.
 */
@Component({
  selector: 'app-subject-questions',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ClickZoneEditorComponent,
    PieceFaceComponent,
    LetterBoxesComponent,
    ChildQuestionPlayViewComponent,
    QuestionFormMarkComponent,
  ],
  templateUrl: './subject-questions.component.html',
  styleUrl: './subject-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectQuestionsComponent implements OnInit {
  private readonly api = inject(TeacherQuestionsService);
  private readonly destroyRef = inject(DestroyRef);
  private loadSeq = 0;

  @Input({ required: true }) subjectId!: number;

  readonly destinationChoices = signal<QuestionDestination[]>([]);

  @Input()
  set destinations(value: QuestionDestination[] | null) {
    this.destinationChoices.set(value ?? []);
  }

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly imagesLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly forms = signal<FormChoice[]>([]);
  readonly selectedCode = signal<string | null>(null);
  readonly questions = signal<SavedQuestion[]>([]);
  readonly nextCursor = signal<number | null>(null);
  readonly pageCursors = signal<number[]>([0]);
  readonly prompt = signal('');
  readonly choices = signal<ChoiceDraft[]>(emptyChoices());
  readonly pairs = signal<PairDraft[]>(emptyPairs());
  readonly items = signal<ItemDraft[]>(emptyItems());
  readonly statements = signal<StatementDraft[]>(emptyStatements());
  readonly links = signal<LinkDraft[]>(emptyLinks());
  readonly columns = signal<ColumnDraft[]>(emptyColumns());
  readonly cards = signal<CardDraft[]>(emptyCards());
  readonly sentence = signal('');
  readonly expectedAnswer = signal('');
  readonly clickImage = signal('');
  readonly boardMode = signal<PuzzleBoardMode>(PUZZLE_BOARD_MODE.TROUS);
  readonly boardImage = signal('');
  readonly requireAllCorrect = signal(true);
  readonly clicksOrdered = signal(true);
  readonly timelineEnabled = signal(false);
  readonly clickZones = signal<ClickZone[]>([]);
  readonly puzzleMagnet = signal(defaultMagnet());
  readonly answers = signal<GapWordDraft[]>([]);
  readonly decoys = signal<GapWordDraft[]>(emptyDecoys());
  readonly simonTypes = SIMON_ELEMENT_TYPES;
  readonly simonType = signal<SimonElementType | null>(null);
  readonly simonElements = signal<SimonElementDraft[]>(emptySimonElements());
  readonly simonSequence = signal<number[]>([]);
  /**
   * Faux tant qu'aucun Enregistrer n'a été tenté. Ensuite le message suit la saisie ;
   * il reste dans l'éditeur, alors que `error` masque tout le panneau.
   */
  private readonly simonChecked = signal(false);
  readonly simonError = computed(() =>
    this.simonChecked() ? simonDraftError(this.simonElements()) : null,
  );
  /** Question en cours de correction. Vide = on prépare une nouvelle question. */
  readonly editingId = signal<number | null>(null);
  readonly selectedIds = signal<number[]>([]);
  readonly targetId = signal<number | null>(null);
  readonly notice = signal<string | null>(null);
  /** Questions en attente de confirmation. Vide = pas d'avertissement affiché. */
  readonly pendingIds = signal<number[]>([]);
  readonly followersLoading = signal(false);
  readonly formsLoading = signal(true);
  readonly formsError = signal<string | null>(null);
  /** Barème API. Vide tant que le catalogue n'est pas arrivé. */
  readonly gamificationLevels = signal<GamificationLevel[]>([]);
  /** Réglage du panneau. Null : on n'affiche pas un barème de secours. */
  readonly gamification = signal<GamificationDraft | null>(null);
  readonly gamificationError = signal<string | null>(null);
  private catalogDefaults: GamificationDraft | null = null;
  readonly followers = signal<TeacherSubjectFollowersResponse | null>(null);
  readonly letterMessages = signal<Readonly<Record<number, string>>>({});
  readonly letterBusyId = signal<number | null>(null);
  readonly previewOpen = signal(false);
  private readonly previewView = viewChild(ChildQuestionPlayViewComponent);
  readonly previewPlay = new QuestionPlaySession(this.destroyRef, this.previewView, httpErrorMessage);
  private followSeq = 0;

  openChildPreview(question: SavedQuestion): void {
    const subjectId = this.subjectId;
    const questionId = question.id;
    this.previewOpen.set(true);
    this.previewPlay.open({
      open: () => this.api.getPreview(subjectId, questionId),
      grade: (answer, played) => this.api.gradePreview(
        subjectId, questionId, answer, played.formCode === 'simon' ? played.content.sequence : undefined,
      ),
      letterLocks: (attempt) => this.api.previewLetterLocks(subjectId, questionId, attempt),
      memoryPair: (match) => this.api.previewMemoryPair(subjectId, questionId, match),
    });
  }

  closeChildPreview(): void {
    this.previewOpen.set(false);
    this.previewPlay.close();
  }

  ngOnInit(): void {
    this.api.copiedToSubject$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((subjectId) => {
      if (subjectId === this.subjectId) {
        this.loadQuestions();
      }
    });
    this.loadQuestions();
    this.loadForms();
    this.loadGamification();
  }

  loadGamification(): void {
    this.gamificationError.set(null);
    this.api
      .gamification()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => {
          const levels = levelsFromCatalog(body.difficulties);
          const defaults = draftFromItem(body.defaults);
          if (levels.length === 0 || defaults == null) {
            this.gamificationError.set('Le barème renvoyé par le serveur est incomplet.');
            return;
          }
          this.gamificationLevels.set(levels);
          this.catalogDefaults = copyDraft(defaults);
          if (this.editingId() == null && this.gamification() == null) {
            this.gamification.set(copyDraft(defaults));
          }
        },
        error: (err: HttpErrorResponse) => {
          this.gamificationError.set(httpErrorMessage(err, 'Barème indisponible.'));
        },
      });
  }

  loadForms(): void {
    this.formsLoading.set(true);
    this.formsError.set(null);
    this.api
      .forms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => {
          const forms = (body.forms ?? []).flatMap((form) => {
            if (!form.code) {
              return [];
            }
            return [{
              code: form.code,
              label: form.label || form.code,
              iconCode: form.iconCode ?? null,
              color: form.color ?? null,
            }];
          });
          this.forms.set(forms);
          this.formsLoading.set(false);
          if (forms.length === 1) {
            this.selectedCode.set(forms[0].code);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.formsLoading.set(false);
          this.formsError.set(httpErrorMessage(err, 'Formes indisponibles.'));
        },
      });
  }

  protected formOf(code: string): FormChoice | undefined {
    return this.forms().find((form) => form.code === code);
  }

  /** Teinte API, seulement si c'est un code #rrggbb. */
  protected formTint(color: string | null | undefined): string | null {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
  }

  selectForm(code: string): void {
    if (this.editingId() != null && code !== this.selectedCode()) {
      this.cancelEdit();
    }
    this.selectedCode.set(code);
    this.simonChecked.set(false);
    this.error.set(null);
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  setPrompt(value: string): void {
    this.prompt.set(value);
  }

  setExpectedAnswer(value: string): void {
    this.expectedAnswer.set(value);
  }

  letterCount(answer: string): number {
    return Array.from(answer).length;
  }

  /** Zones justes, dans l'ordre des clics : « 1. soleil, 2. lune ». */
  clickSequenceLabel(zones: ClickZone[]): string {
    return zones
      .filter((zone) => zone.correct && zone.clickOrder != null)
      .sort((a, b) => (a.clickOrder ?? 0) - (b.clickOrder ?? 0))
      .map((zone) => `${zone.clickOrder}. ${zone.label}`)
      .join(', ');
  }

  letterMessage(id: number): string {
    return this.letterMessages()[id] ?? '';
  }

  tryLetters(question: SavedQuestion, attempt: string): void {
    this.letterBusyId.set(question.id);
    this.error.set(null);
    this.api.tryLetter(this.subjectId, question.id, { attempt }).subscribe({
      next: (body) => {
        this.letterBusyId.set(null);
        this.letterMessages.update((current) => ({ ...current, [question.id]: body.message ?? '' }));
      },
      error: (err: HttpErrorResponse) => {
        this.letterBusyId.set(null);
        this.error.set(httpErrorMessage(err, 'Vérification impossible.'));
      },
    });
  }

  setBoardMode(mode: PuzzleBoardMode): void {
    const previous = this.boardMode();
    this.boardMode.set(mode);
    if (mode !== PUZZLE_BOARD_MODE.FOND) {
      this.boardImage.set('');
    }
    // Les places sont posées sur un plateau précis : un autre plateau les rend fausses.
    if (mode !== previous || mode === PUZZLE_BOARD_MODE.TROUS) {
      this.clearPuzzleSlots();
    }
    this.error.set(null);
  }

  setBoardImage(dataUrl: string): void {
    const replaced = this.boardImage() !== dataUrl;
    this.boardImage.set(dataUrl);
    this.boardMode.set(PUZZLE_BOARD_MODE.FOND);
    if (replaced) {
      this.clearPuzzleSlots();
    }
    this.error.set(null);
  }

  private clearPuzzleSlots(): void {
    this.clickZones.update((zones) => zones.map((zone) => ({ ...zone, slot: null })));
  }

  setClickImage(dataUrl: string): void {
    this.clickImage.set(dataUrl);
    this.error.set(null);
  }

  setClickImageError(message: string): void {
    this.error.set(message);
  }

  setRequireAllCorrect(value: boolean): void {
    this.requireAllCorrect.set(value);
  }

  setClicksOrdered(value: boolean): void {
    this.clicksOrdered.set(value);
  }

  setTimelineEnabled(value: boolean): void {
    this.timelineEnabled.set(value);
  }

  setPuzzleMagnet(value: number): void {
    this.puzzleMagnet.set(value);
  }

  setClickZones(zones: ClickZone[]): void {
    this.clickZones.set(zones);
  }

  setChoiceLabel(index: number, value: string): void {
    this.choices.update((rows) =>
      rows.map((row, i) => (i === index ? { label: value, correct: row.correct } : row)),
    );
  }

  setChoiceFace(index: number, face: 'text' | 'image'): void {
    this.choices.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? face === 'image'
            ? { label: '', correct: row.correct, hasImage: true }
            : { label: '', correct: row.correct }
          : row,
      ),
    );
  }

  onChoiceImagePending(index: number): void {
    this.choices.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', correct: row.correct, hasImage: true, imageDataUrl: '' } : row,
      ),
    );
  }

  onChoiceImageReady(index: number, dataUrl: string): void {
    this.choices.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', correct: row.correct, hasImage: true, imageDataUrl: dataUrl } : row,
      ),
    );
  }

  onChoiceImageFailed(index: number, message: string): void {
    this.choices.update((rows) =>
      rows.map((row, i) => (i === index ? { label: '', correct: row.correct, hasImage: true } : row)),
    );
    this.error.set(message);
  }

  setChoiceCorrect(index: number, correct: boolean): void {
    this.choices.update((rows) => rows.map((row, i) => (i === index ? { ...row, correct } : row)));
  }

  addChoice(): void {
    this.choices.update((rows) => [...rows, { label: '', correct: false }]);
  }

  removeChoice(index: number): void {
    this.choices.update((rows) => rows.filter((_, i) => i !== index));
  }

  setPairSide(index: number, side: 'questionSide' | 'answerSide', value: string): void {
    this.pairs.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }
        if (side === 'questionSide') {
          const next = { ...row, questionSide: value };
          delete next.questionImageDataUrl;
          delete next.questionHasImage;
          return next;
        }
        const next = { ...row, answerSide: value };
        delete next.answerImageDataUrl;
        delete next.answerHasImage;
        return next;
      }),
    );
  }

  setPairFace(index: number, side: 'question' | 'answer', face: 'text' | 'image'): void {
    this.pairs.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }
        if (side === 'question') {
          const next = { ...row, questionSide: '' };
          delete next.questionImageDataUrl;
          delete next.questionHasImage;
          return face === 'image' ? { ...next, questionHasImage: true } : next;
        }
        const next = { ...row, answerSide: '' };
        delete next.answerImageDataUrl;
        delete next.answerHasImage;
        return face === 'image' ? { ...next, answerHasImage: true } : next;
      }),
    );
  }

  onPairImagePending(index: number, side: 'question' | 'answer'): void {
    this.patchPairImage(index, side, '');
  }

  onPairImageReady(index: number, side: 'question' | 'answer', dataUrl: string): void {
    this.patchPairImage(index, side, dataUrl);
  }

  onPairImageFailed(index: number, side: 'question' | 'answer', message: string): void {
    this.setPairFace(index, side, 'image');
    this.error.set(message);
  }

  addPair(): void {
    this.pairs.update((rows) => [...rows, { questionSide: '', answerSide: '' }]);
  }

  removePair(index: number): void {
    this.pairs.update((rows) => rows.filter((_, i) => i !== index));
  }

  setItemLabel(index: number, value: string): void {
    this.items.update((rows) =>
      rows.map((row, i) => (i === index ? { label: value, axisLabel: row.axisLabel } : row)),
    );
  }

  setItemFace(index: number, face: 'text' | 'image'): void {
    this.items.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? face === 'image'
            ? { label: '', axisLabel: row.axisLabel, hasImage: true }
            : { label: '', axisLabel: row.axisLabel }
          : row,
      ),
    );
  }

  onItemImagePending(index: number): void {
    this.items.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', axisLabel: row.axisLabel, hasImage: true, imageDataUrl: '' } : row,
      ),
    );
  }

  onItemImageReady(index: number, dataUrl: string): void {
    this.items.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', axisLabel: row.axisLabel, hasImage: true, imageDataUrl: dataUrl } : row,
      ),
    );
  }

  onItemImageFailed(index: number, message: string): void {
    this.setItemFace(index, 'image');
    this.error.set(message);
  }

  setItemAxisLabel(index: number, value: string): void {
    this.items.update((rows) => rows.map((row, i) => (i === index ? { ...row, axisLabel: value } : row)));
  }

  moveItem(index: number, delta: -1 | 1): void {
    this.items.update((rows) => {
      const target = index + delta;
      if (target < 0 || target >= rows.length) {
        return rows;
      }
      const next = [...rows];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  }

  addItem(): void {
    this.items.update((rows) => [...rows, { label: '', axisLabel: '' }]);
  }

  removeItem(index: number): void {
    this.items.update((rows) => rows.filter((_, i) => i !== index));
  }

  setStatementLabel(index: number, value: string): void {
    this.statements.update((rows) =>
      rows.map((row, i) => (i === index ? { label: value, truthful: row.truthful } : row)),
    );
  }

  setStatementFace(index: number, face: 'text' | 'image'): void {
    this.statements.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? face === 'image'
            ? { label: '', truthful: row.truthful, hasImage: true }
            : { label: '', truthful: row.truthful }
          : row,
      ),
    );
  }

  onStatementImagePending(index: number): void {
    this.statements.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', truthful: row.truthful, hasImage: true, imageDataUrl: '' } : row,
      ),
    );
  }

  onStatementImageReady(index: number, dataUrl: string): void {
    this.statements.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', truthful: row.truthful, hasImage: true, imageDataUrl: dataUrl } : row,
      ),
    );
  }

  onStatementImageFailed(index: number, message: string): void {
    this.setStatementFace(index, 'image');
    this.error.set(message);
  }

  setStatementSide(index: number, truthful: boolean): void {
    this.statements.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, truthful: row.truthful === truthful ? null : truthful } : row)),
    );
  }

  addStatement(): void {
    this.statements.update((rows) => [...rows, { label: '', truthful: null }]);
  }

  removeStatement(index: number): void {
    this.statements.update((rows) => rows.filter((_, i) => i !== index));
  }

  setLinkSide(index: number, side: 'leftLabel' | 'rightLabel', value: string): void {
    this.links.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }
        if (side === 'leftLabel') {
          const next = { ...row, leftLabel: value };
          delete next.leftImageDataUrl;
          delete next.leftHasImage;
          return next;
        }
        const next = { ...row, rightLabel: value };
        delete next.rightImageDataUrl;
        delete next.rightHasImage;
        return next;
      }),
    );
  }

  setLinkFace(index: number, side: 'left' | 'right', face: 'text' | 'image'): void {
    this.links.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }
        if (side === 'left') {
          const next = { ...row, leftLabel: '' };
          delete next.leftImageDataUrl;
          delete next.leftHasImage;
          return face === 'image' ? { ...next, leftHasImage: true } : next;
        }
        const next = { ...row, rightLabel: '' };
        delete next.rightImageDataUrl;
        delete next.rightHasImage;
        return face === 'image' ? { ...next, rightHasImage: true } : next;
      }),
    );
  }

  onLinkImagePending(index: number, side: 'left' | 'right'): void {
    this.patchLinkImage(index, side, '');
  }

  onLinkImageReady(index: number, side: 'left' | 'right', dataUrl: string): void {
    this.patchLinkImage(index, side, dataUrl);
  }

  onLinkImageFailed(index: number, side: 'left' | 'right', message: string): void {
    this.setLinkFace(index, side, 'image');
    this.error.set(message);
  }

  addLink(): void {
    this.links.update((rows) => [...rows, { leftLabel: '', rightLabel: '' }]);
  }

  removeLink(index: number): void {
    this.links.update((rows) => rows.filter((_, i) => i !== index));
  }

  setColumnLabel(index: number, value: string): void {
    this.columns.update((rows) => rows.map((row, i) => (i === index ? { label: value } : row)));
  }

  addColumn(): void {
    this.columns.update((rows) => [...rows, { label: '' }]);
  }

  removeColumn(index: number): void {
    this.columns.update((rows) => rows.filter((_, i) => i !== index));
    this.cards.update((rows) =>
      rows
        .filter((row) => row.columnIndex !== index)
        .map((row) =>
          row.columnIndex > index ? { ...row, columnIndex: row.columnIndex - 1 } : row,
        ),
    );
  }

  setCardLabel(index: number, value: string): void {
    this.cards.update((rows) =>
      rows.map((row, i) => (i === index ? { label: value, columnIndex: row.columnIndex } : row)),
    );
  }

  setCardFace(index: number, face: 'text' | 'image'): void {
    this.cards.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? face === 'image'
            ? { label: '', columnIndex: row.columnIndex, hasImage: true }
            : { label: '', columnIndex: row.columnIndex }
          : row,
      ),
    );
  }

  onCardImagePending(index: number): void {
    this.cards.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', columnIndex: row.columnIndex, hasImage: true, imageDataUrl: '' } : row,
      ),
    );
  }

  onCardImageReady(index: number, dataUrl: string): void {
    this.cards.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', columnIndex: row.columnIndex, hasImage: true, imageDataUrl: dataUrl } : row,
      ),
    );
  }

  onCardImageFailed(index: number, message: string): void {
    this.setCardFace(index, 'image');
    this.error.set(message);
  }

  setCardColumn(index: number, columnIndex: number): void {
    this.cards.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, columnIndex } : row)),
    );
  }

  addCard(): void {
    this.cards.update((rows) => [...rows, { label: '', columnIndex: 0 }]);
  }

  removeCard(index: number): void {
    this.cards.update((rows) => rows.filter((_, i) => i !== index));
  }

  setSentence(value: string): void {
    this.sentence.set(value);
    const holes = holeCount(value);
    this.answers.update((rows) => {
      const next = rows.slice(0, holes);
      while (next.length < holes) {
        next.push({ label: '' });
      }
      return next;
    });
  }

  setAnswer(index: number, value: string): void {
    this.answers.update((rows) => rows.map((row, i) => (i === index ? { label: value } : row)));
  }

  removeAnswer(index: number): void {
    this.sentence.set(withoutHole(this.sentence(), index));
    this.answers.update((rows) => rows.filter((_, i) => i !== index));
  }

  setDecoy(index: number, value: string): void {
    this.decoys.update((rows) => rows.map((row, i) => (i === index ? { label: value } : row)));
  }

  addDecoy(): void {
    this.decoys.update((rows) => [...rows, { label: '' }]);
  }

  removeDecoy(index: number): void {
    this.decoys.update((rows) => rows.filter((_, i) => i !== index));
  }

  setSimonType(type: SimonElementType): void {
    this.simonType.set(type);
  }

  setSimonElementLabel(index: number, value: string): void {
    this.simonElements.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, label: value, ...(value.trim() ? { color: '', imageDataUrl: undefined } : {}) }
          : row,
      ),
    );
  }

  setSimonElementColor(index: number, value: string): void {
    this.simonElements.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, color: value, ...(value.trim() ? { label: '', imageDataUrl: undefined } : {}) }
          : row,
      ),
    );
  }

  setSimonElementImage(index: number, dataUrl: string): void {
    this.simonElements.update((rows) =>
      rows.map((row, i) =>
        i === index ? { label: '', color: '', imageDataUrl: dataUrl } : row,
      ),
    );
  }

  onSimonImage(index: number, event: Event): void {
    const input = event.target;
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      return;
    }
    this.setSimonElementImage(index, '');
    preparePhoto(file, 256)
      .then((photo) => this.setSimonElementImage(index, photo.dataUrl))
      .catch((error: unknown) => {
        if (input instanceof HTMLInputElement) {
          input.value = '';
        }
        this.simonElements.update((rows) =>
          rows.map((row, i) => (i === index ? { label: '', color: '', imageDataUrl: undefined } : row)),
        );
        this.error.set(error instanceof Error ? error.message : 'Image refusée.');
      });
  }

  private patchPairImage(index: number, side: 'question' | 'answer', dataUrl: string): void {
    this.pairs.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }
        return side === 'question'
          ? { ...row, questionSide: '', questionHasImage: true, questionImageDataUrl: dataUrl }
          : { ...row, answerSide: '', answerHasImage: true, answerImageDataUrl: dataUrl };
      }),
    );
  }

  private patchLinkImage(index: number, side: 'left' | 'right', dataUrl: string): void {
    this.links.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) {
          return row;
        }
        return side === 'left'
          ? { ...row, leftLabel: '', leftHasImage: true, leftImageDataUrl: dataUrl }
          : { ...row, rightLabel: '', rightHasImage: true, rightImageDataUrl: dataUrl };
      }),
    );
  }

  private loadPieceImages(questionId: number): void {
    this.imagesLoading.set(true);
    this.api.get(this.subjectId, questionId).subscribe({
      next: (item) => {
        this.imagesLoading.set(false);
        if (this.editingId() !== questionId) {
          return;
        }
        try {
          this.applyLoadedPieces(requireSavedQuestion(item));
        } catch {
          this.error.set('Les images de cette question ne se sont pas chargées.');
        }
      },
      error: () => {
        this.imagesLoading.set(false);
        this.error.set('Les images de cette question ne se sont pas chargées.');
      },
    });
  }

  private applyLoadedPieces(saved: SavedQuestion): void {
    this.choices.set(saved.choices.length ? saved.choices.map((row) => ({ ...row })) : emptyChoices());
    this.pairs.set(saved.pairs.length ? saved.pairs.map((row) => ({ ...row })) : emptyPairs());
    this.items.set(saved.items.length ? saved.items.map((row) => ({ ...row })) : emptyItems());
    this.statements.set(saved.statements.length ? saved.statements.map((row) => ({ ...row })) : emptyStatements());
    this.links.set(saved.links.length ? saved.links.map((row) => ({ ...row })) : emptyLinks());
    this.cards.set(saved.cards.length ? saved.cards.map((row) => ({ ...row })) : emptyCards());
    this.simonElements.set(
      saved.elements.length
        ? saved.elements.map((row) => ({
            label: row.label,
            color: row.color,
            imageDataUrl: row.imageDataUrl,
            hasImage: row.hasImage,
          }))
        : emptySimonElements(),
    );
  }

  private questionMissesImageBytes(question: SavedQuestion): boolean {
    return (
      question.choices.some((row) => row.hasImage && !row.imageDataUrl) ||
      question.pairs.some(
        (row) =>
          (row.questionHasImage && !row.questionImageDataUrl) ||
          (row.answerHasImage && !row.answerImageDataUrl),
      ) ||
      question.items.some((row) => row.hasImage && !row.imageDataUrl) ||
      question.statements.some((row) => row.hasImage && !row.imageDataUrl) ||
      question.links.some(
        (row) => (row.leftHasImage && !row.leftImageDataUrl) || (row.rightHasImage && !row.rightImageDataUrl),
      ) ||
      question.cards.some((row) => row.hasImage && !row.imageDataUrl) ||
      question.elements.some((row) => row.hasImage && !row.imageDataUrl)
    );
  }

  private pieceImageProblem(): string | null {
    if (this.imagesLoading()) {
      return 'Attends que les images apparaissent, puis enregistre.';
    }
    const waiting = this.activeFaces().some((face) => face.imageDataUrl === '');
    if (waiting) {
      return 'Attends que les images apparaissent, puis enregistre.';
    }
    const missing = this.activeFaces().some((face) => face.hasImage && !face.imageDataUrl);
    return missing ? 'Chaque pièce est un texte ou une image.' : null;
  }

  private activeFaces(): { hasImage?: boolean; imageDataUrl?: string }[] {
    switch (this.selectedCode()) {
      case FORM.QCM:
        return this.choices();
      case FORM.MEMORY:
        return this.pairs().flatMap((row) => [
          { hasImage: row.questionHasImage, imageDataUrl: row.questionImageDataUrl },
          { hasImage: row.answerHasImage, imageDataUrl: row.answerImageDataUrl },
        ]);
      case FORM.ORDER:
        return this.items();
      case FORM.TRUE_FALSE:
        return this.statements();
      case FORM.LINKS:
        return this.links().flatMap((row) => [
          { hasImage: row.leftHasImage, imageDataUrl: row.leftImageDataUrl },
          { hasImage: row.rightHasImage, imageDataUrl: row.rightImageDataUrl },
        ]);
      case FORM.CLASSIFICATION:
        return this.cards();
      case FORM.SIMON:
        return this.simonElements();
      default:
        return [];
    }
  }

  addSimonElement(): void {
    this.simonElements.update((rows) => [...rows, { label: '', color: '' }]);
  }

  /** Les pas désignent une position : ceux de l'élément partent, les suivants reculent d'un cran. */
  removeSimonElement(index: number): void {
    this.simonElements.update((rows) => rows.filter((_, i) => i !== index));
    this.simonSequence.update((steps) =>
      steps.filter((step) => step !== index).map((step) => (step > index ? step - 1 : step)),
    );
  }

  addSimonStep(index: number): void {
    this.simonSequence.update((steps) => [...steps, index]);
  }

  removeSimonStep(position: number): void {
    this.simonSequence.update((steps) => steps.filter((_, i) => i !== position));
  }

  /** Nom d'un élément du brouillon ; « Élément 2 » tant qu'il n'est pas saisi. */
  simonElementName(index: number): string {
    return this.simonElements()[index]?.label.trim() || `Élément ${index + 1}`;
  }

  /** Suite d'un Simon enregistré : « 1. rouge, 2. bleu ». */
  simonSequenceLabel(question: SavedQuestion): string {
    return question.sequence
      .map((step, position) => `${position + 1}. ${question.elements[step]?.label ?? ''}`)
      .join(', ');
  }

  /** Pastille du brouillon : genre couleurs et code #rrggbb complet, sinon rien. */
  simonSwatch(color: string): string | null {
    return this.simonType() === SIMON_ELEMENT_TYPE.COLORS && isSimonColor(color) ? color : null;
  }

  beginEdit(question: SavedQuestion): void {
    this.editingId.set(question.id);
    this.selectedCode.set(question.formCode);
    this.prompt.set(question.prompt);
    this.choices.set(question.choices.length ? question.choices.map((choice) => ({ ...choice })) : emptyChoices());
    this.pairs.set(question.pairs.length ? question.pairs.map((pair) => ({ ...pair })) : emptyPairs());
    this.items.set(question.items.length ? question.items.map((item) => ({ ...item })) : emptyItems());
    this.timelineEnabled.set(question.timelineEnabled);
    this.statements.set(question.statements.length ? question.statements.map((row) => ({ ...row })) : emptyStatements());
    this.links.set(question.links.length ? question.links.map((row) => ({ ...row })) : emptyLinks());
    this.columns.set(
      question.columns.length
        ? question.columns.map((row) => ({ label: row.label }))
        : emptyColumns(),
    );
    this.cards.set(question.cards.length ? question.cards.map((row) => ({ ...row })) : emptyCards());
    this.sentence.set(question.sentence);
    this.expectedAnswer.set(question.expectedAnswer);
    this.clickImage.set(question.imageDataUrl);
    this.boardMode.set(question.boardMode);
    this.boardImage.set(question.boardImageDataUrl);
    this.requireAllCorrect.set(question.requireAllCorrect);
    this.clicksOrdered.set(question.clicksOrdered);
    this.clickZones.set(question.zones.map((zone) => ({ ...zone, points: zone.points.map((point) => ({ ...point })) })));
    this.puzzleMagnet.set(question.snapDistance);
    this.answers.set(question.answers.map((row) => ({ label: row.label })));
    this.decoys.set(question.decoys.length ? question.decoys.map((row) => ({ label: row.label })) : emptyDecoys());
    this.simonType.set(question.elementType);
    this.simonElements.set(
      question.elements.length
        ? question.elements.map((row) => ({
            label: row.label,
            color: row.color,
            imageDataUrl: row.imageDataUrl,
            hasImage: row.hasImage,
          }))
        : emptySimonElements(),
    );
    if (this.questionMissesImageBytes(question)) {
      this.loadPieceImages(question.id);
    }
    this.simonSequence.set([...question.sequence]);
    this.simonChecked.set(false);
    this.gamification.set(question.gamification ? copyDraft(question.gamification) : null);
    this.error.set(null);
  }

  attemptMax(): number | null {
    const game = this.gamification();
    return game ? attemptLimit(this.gamificationLevels(), game.difficulty) : null;
  }

  difficultyIndex(): number {
    const game = this.gamification();
    if (!game) {
      return -1;
    }
    return this.gamificationLevels().findIndex((level) => level.code === game.difficulty);
  }

  pointsLabel(game: GamificationDraft): string {
    return game.points.filter((point): point is number => point != null).join(', ');
  }

  /** Recrée la case quand la difficulté change, pour afficher le nouveau barème. */
  attemptField(index: number): string {
    return `${this.gamification()?.difficulty ?? ''}:${index}`;
  }

  setAttempts(raw: string): void {
    const game = this.gamification();
    const attempts = Number(raw);
    if (!game || !Number.isInteger(attempts)) {
      return;
    }
    this.gamification.set(withAttempts(game, attempts, this.gamificationLevels()));
  }

  setDifficultyIndex(raw: string): void {
    const game = this.gamification();
    const index = Number(raw);
    const level = this.gamificationLevels()[index];
    if (!game || !level) {
      return;
    }
    this.gamification.set(withDifficulty(game, level));
  }

  setCustomize(enabled: boolean): void {
    const game = this.gamification();
    if (!game) {
      return;
    }
    this.gamification.set(withCustomize(game, enabled, this.gamificationLevels()));
  }

  setGamificationPoint(index: number, raw: string): void {
    const game = this.gamification();
    if (!game) {
      return;
    }
    this.gamification.set(withPoint(game, index, raw));
  }

  setGamificationDisabled(disabled: boolean): void {
    const game = this.gamification();
    if (!game) {
      return;
    }
    this.gamification.set(withDisabled(game, disabled));
  }

  toggleSelected(id: number, checked: boolean): void {
    this.selectedIds.update((ids) => (checked ? [...ids, id] : ids.filter((current) => current !== id)));
  }

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  /** Nombre de questions cochées, affiché dans la barre d'actions. */
  selectionLabel(): string {
    const count = this.selectedIds().length;
    return count === 1 ? '1 question sélectionnée' : `${count} questions sélectionnées`;
  }

  /** Décoche tout et referme la barre. Une suppression en attente est abandonnée. */
  clearSelection(): void {
    if (this.saving()) {
      return;
    }
    this.selectedIds.set([]);
    if (this.pendingIds().length > 0) {
      this.cancelDelete();
    }
  }

  setTarget(value: number): void {
    this.targetId.set(value);
  }

  destinationLabel(destination: QuestionDestination): string {
    return destination.id === this.subjectId ? `${destination.label} (cette matière)` : destination.label;
  }

  askDelete(ids: number[]): void {
    if (this.saving() || ids.length === 0) {
      return;
    }
    const seq = ++this.followSeq;
    this.pendingIds.set(ids);
    this.followers.set(null);
    this.followersLoading.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api
      .followers(this.subjectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => {
          if (seq !== this.followSeq) {
            return;
          }
          this.followersLoading.set(false);
          this.followers.set(body);
        },
        error: (err: HttpErrorResponse) => {
          if (seq !== this.followSeq) {
            return;
          }
          this.followersLoading.set(false);
          this.pendingIds.set([]);
          this.error.set(httpErrorMessage(err, 'Impossible de savoir qui suit ce cours.'));
        },
      });
  }

  askDeleteSelected(): void {
    const selected = new Set(this.selectedIds());
    const questionIds = this.questions()
      .filter((question) => selected.has(question.id))
      .map((question) => question.id);
    this.askDelete(questionIds);
  }

  cancelDelete(): void {
    this.followSeq += 1;
    this.pendingIds.set([]);
    this.followers.set(null);
    this.followersLoading.set(false);
  }

  confirmDelete(): void {
    const ids = this.pendingIds();
    if (ids.length === 0 || this.followers() == null || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .deleteQuestions(this.subjectId, { questionIds: ids })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => {
          const removed = new Set(body.deletedIds);
          this.questions.update((rows) => rows.filter((question) => !removed.has(question.id)));
          this.selectedIds.update((current) => current.filter((id) => !removed.has(id)));
          const editing = this.editingId();
          this.saving.set(false);
          this.cancelDelete();
          if (editing != null && removed.has(editing)) {
            this.cancelEdit();
          }
          if (removed.size > 1) {
            this.notice.set('Questions supprimées.');
          } else if (removed.size === 1) {
            this.notice.set('Question supprimée.');
          }
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(httpErrorMessage(err, 'Suppression impossible.'));
        },
      });
  }

  copySelected(): void {
    const target = this.targetId();
    if (target == null || this.saving()) {
      return;
    }
    const selected = new Set(this.selectedIds());
    const questionIds = this.questions()
      .filter((question) => selected.has(question.id))
      .map((question) => question.id);
    if (questionIds.length === 0) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.clone(this.subjectId, { targetSubjectId: target, questionIds }).subscribe({
      next: (body) => {
        this.saving.set(false);
        this.selectedIds.set([]);
        const copies = (body.questions ?? []).flatMap((question) => {
          const saved = parseSavedQuestion(question);
          return saved ? [saved] : [];
        });
        if (target === this.subjectId) {
          this.questions.update((rows) => [...rows, ...copies]);
        } else {
          this.api.noteCopied(target);
        }
        this.notice.set(copies.length > 1 ? 'Questions copiées.' : 'Question copiée.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Copie impossible.'));
      },
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.prompt.set('');
    this.choices.set(emptyChoices());
    this.pairs.set(emptyPairs());
    this.items.set(emptyItems());
    this.statements.set(emptyStatements());
    this.links.set(emptyLinks());
    this.columns.set(emptyColumns());
    this.cards.set(emptyCards());
    this.sentence.set('');
    this.expectedAnswer.set('');
    this.clickImage.set('');
    this.boardMode.set(PUZZLE_BOARD_MODE.TROUS);
    this.boardImage.set('');
    this.requireAllCorrect.set(true);
    this.clicksOrdered.set(true);
    this.timelineEnabled.set(false);
    this.clickZones.set([]);
    this.puzzleMagnet.set(defaultMagnet());
    this.answers.set([]);
    this.decoys.set(emptyDecoys());
    this.simonType.set(null);
    this.simonElements.set(emptySimonElements());
    this.simonSequence.set([]);
    this.simonChecked.set(false);
    this.gamification.set(this.catalogDefaults ? copyDraft(this.catalogDefaults) : null);
    this.error.set(null);
  }

  save(): void {
    const code = this.selectedCode();
    const editingId = this.editingId();
    if (!isKnownFormCode(code) || this.saving()) {
      return;
    }
    if (
      code === FORM.PUZZLE &&
      this.boardMode() === PUZZLE_BOARD_MODE.BLANC &&
      this.clickZones().some((zone) => zone.slot == null)
    ) {
      this.error.set(
        'Sur le cadre blanc, ouvre l’aperçu plateau et pose chaque pièce pour fixer son emplacement.',
      );
      return;
    }
    if (
      code === FORM.PUZZLE &&
      this.boardMode() === PUZZLE_BOARD_MODE.FOND &&
      this.clickZones().some((zone) => zone.slot == null)
    ) {
      this.error.set('Sur le fond, ouvre « Voir le plateau (fond) » et pose chaque pièce à sa place.');
      return;
    }
    const imageProblem = this.pieceImageProblem();
    if (imageProblem) {
      this.error.set(imageProblem);
      return;
    }
    if (code === FORM.SIMON) {
      this.simonChecked.set(true);
      if (this.simonError() !== null) {
        return;
      }
    }
    const body = buildSaveBody(code, {
      prompt: this.prompt(),
      choices: this.choices(),
      pairs: this.pairs(),
      items: this.items(),
      statements: this.statements(),
      links: this.links(),
      columns: this.columns(),
      cards: this.cards(),
      sentence: this.sentence(),
      answers: this.answers(),
      decoys: this.decoys(),
      expectedAnswer: this.expectedAnswer(),
      clickImage: this.clickImage(),
      boardMode: this.boardMode(),
      boardImage: this.boardImage(),
      requireAllCorrect: this.requireAllCorrect(),
      clicksOrdered: this.clicksOrdered(),
      clickZones: this.clickZones(),
      puzzleMagnet: this.puzzleMagnet(),
      timelineEnabled: this.timelineEnabled(),
      simonType: this.simonType(),
      simonElements: this.simonElements(),
      simonSequence: this.simonSequence(),
      gamification: this.gamification(),
    });
    if (!body) {
      this.error.set('Complète les réponses de la question.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const request =
      editingId == null
        ? this.api.create(this.subjectId, body)
        : this.api.update(this.subjectId, editingId, body);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        let row: SavedQuestion;
        try {
          row = requireSavedQuestion(saved);
        } catch {
          this.error.set('Réponse serveur invalide (question sans identifiant).');
          return;
        }
        const canAppend = this.nextCursor() === null && this.questions().length < 25;
        this.questions.update((rows) => {
          if (editingId != null) {
            return rows.map((item) => (item.id === row.id ? row : item));
          }
          return canAppend ? [...rows, row] : rows;
        });
        if (editingId == null && !canAppend) {
          this.notice.set('Question enregistrée. Consulte la dernière page pour la retrouver.');
          this.loadQuestions();
        }
        this.cancelEdit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Enregistrement impossible.'));
      },
    });
  }

  nextPage(): void {
    const cursor = this.nextCursor();
    if (cursor === null || this.saving() || this.pendingIds().length) return;
    this.pageCursors.update((pages) => [...pages, cursor]);
    this.selectedIds.set([]);
    this.cancelEdit();
    this.loadQuestions();
  }

  previousPage(): void {
    if (this.pageCursors().length <= 1 || this.saving() || this.pendingIds().length) return;
    this.pageCursors.update((pages) => pages.slice(0, -1));
    this.selectedIds.set([]);
    this.cancelEdit();
    this.loadQuestions();
  }

  private loadQuestions(): void {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    const afterId = this.pageCursors().at(-1) ?? 0;
    this.api
      .list(this.subjectId, afterId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => {
          if (seq !== this.loadSeq) {
            return;
          }
          const rows: SavedQuestion[] = [];
          let skipped = false;
          for (const question of body.questions ?? []) {
            const saved = parseSavedQuestion(question);
            if (saved) {
              rows.push(saved);
            } else {
              skipped = true;
            }
          }
          this.questions.set(rows);
          this.nextCursor.set(body.nextCursor ?? null);
          this.loading.set(false);
          this.error.set(
            skipped
              ? 'Une question renvoyée par le serveur n’avait pas d’identifiant et a été ignorée.'
              : null,
          );
        },
        error: (err: HttpErrorResponse) => {
          if (seq !== this.loadSeq) {
            return;
          }
          this.loading.set(false);
          this.questions.set([]);
          this.error.set(httpErrorMessage(err, 'Questions indisponibles.'));
        },
      });
  }
}
