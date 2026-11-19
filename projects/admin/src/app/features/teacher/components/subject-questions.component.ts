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

import { ChildQuestionPlayViewComponent, type ChildPlayViewQuestion } from '@appv4/ui';

import type { TeacherSubjectFollowersResponse } from '../../../core/api/api-models';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { TeacherQuestionsService } from '../data-access/teacher-questions.service';
import { ClickZoneEditorComponent } from './click-zone-editor.component';
import { LetterBoxesComponent } from './letter-boxes.component';
import { ClickZone } from './click-zone';
import { buildSaveBody, parseSavedQuestion, requireSavedQuestion } from './question-form.adapters';
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
  SavedQuestion,
  StatementDraft,
  defaultMagnet,
  emptyCards,
  emptyChoices,
  emptyColumns,
  emptyDecoys,
  emptyItems,
  emptyLinks,
  emptyPairs,
  emptyStatements,
  holeCount,
  isKnownFormCode,
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
    ClickZoneEditorComponent,
    LetterBoxesComponent,
    ChildQuestionPlayViewComponent,
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
  readonly timelineEnabled = signal(false);
  readonly clickZones = signal<ClickZone[]>([]);
  readonly puzzleMagnet = signal(defaultMagnet());
  readonly answers = signal<GapWordDraft[]>([]);
  readonly decoys = signal<GapWordDraft[]>(emptyDecoys());
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
  readonly followers = signal<TeacherSubjectFollowersResponse | null>(null);
  readonly letterMessages = signal<Readonly<Record<number, string>>>({});
  readonly letterBusyId = signal<number | null>(null);
  /** Aperçu rendu enfant (popup). */
  readonly preview = signal<ChildPlayViewQuestion | null>(null);
  readonly previewSource = signal<SavedQuestion | null>(null);
  readonly previewResult = signal<{ passed: boolean; scorePercent: number } | null>(null);
  readonly previewSelectionTick = signal(0);
  private readonly previewView = viewChild(ChildQuestionPlayViewComponent);
  private followSeq = 0;

  readonly canPreviewSubmit = computed(() => {
    this.previewSelectionTick();
    const view = this.previewView();
    const model = this.preview();
    if (!view || !model || this.previewResult()) {
      return false;
    }
    if (model.formCode === 'qcm') {
      return view.selectedChoiceIds().length > 0;
    }
    if (model.formCode === 'vrai_faux') {
      return view.allStatementsAnswered();
    }
    if (model.formCode === 'memory') {
      return view.allPairsMatched();
    }
    if (model.formCode === 'order') {
      return view.hasOrderItems();
    }
    if (model.formCode === 'classement') {
      return view.allCardsPlaced();
    }
    if (model.formCode === 'liens') {
      return view.allLinksMatched();
    }
    return false;
  });

  openChildPreview(question: SavedQuestion): void {
    this.previewSource.set(question);
    this.previewResult.set(null);
    this.previewSelectionTick.set(0);
    this.preview.set({
      formCode: question.formCode,
      formLabel:
        question.formCode === 'memory'
          ? 'FORME · memory'
          : question.formCode === 'order'
            ? 'FORME · order'
            : question.formLabel,
      prompt:
        question.formCode === 'memory'
          ? question.prompt || 'Memory'
          : question.formCode === 'order'
            ? question.prompt || 'Ordre'
            : question.prompt || undefined,
      choices: question.choices.map((choice, index) => ({
        choiceId: index + 1,
        label: choice.label,
      })),
      statements: question.statements.map((row, index) => ({
        statementId: index + 1,
        label: row.label,
      })),
      pairs: question.pairs.map((pair, index) => ({
        pairId: index + 1,
        questionSide: pair.questionSide,
        answerSide: pair.answerSide,
      })),
      items: question.items.map((item, index) => ({
        itemId: index + 1,
        label: item.label,
        axisLabel: item.axisLabel,
      })),
      timelineEnabled: question.timelineEnabled,
      columns: question.columns.map((column, index) => ({
        columnId: index + 1,
        label: column.label,
      })),
      cards: question.cards.map((card, index) => ({
        cardId: index + 1,
        label: card.label,
      })),
      links: question.links.map((link, index) => ({
        linkId: index + 1,
        leftLabel: link.leftLabel,
        rightLabel: link.rightLabel,
      })),
    });
  }

  closeChildPreview(): void {
    this.preview.set(null);
    this.previewSource.set(null);
    this.previewResult.set(null);
  }

  onPreviewSelectionChange(): void {
    this.previewSelectionTick.update((n) => n + 1);
  }

  validateChildPreview(): void {
    const view = this.previewView();
    const source = this.previewSource();
    if (!view || !source || !this.canPreviewSubmit()) {
      return;
    }
    this.previewResult.set(gradePreview(source, view));
  }

  replayChildPreview(): void {
    this.previewResult.set(null);
    this.previewView()?.reshuffle();
    this.previewSelectionTick.update((n) => n + 1);
  }

  ngOnInit(): void {
    this.api.copiedToSubject$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((subjectId) => {
      if (subjectId === this.subjectId) {
        this.loadQuestions();
      }
    });
    this.loadQuestions();
    this.loadForms();
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
            return [{ code: form.code, label: form.label || form.code }];
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

  selectForm(code: string): void {
    if (this.editingId() != null && code !== this.selectedCode()) {
      this.cancelEdit();
    }
    this.selectedCode.set(code);
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
    this.boardMode.set(mode);
    if (mode !== PUZZLE_BOARD_MODE.FOND) {
      this.boardImage.set('');
    }
    if (mode !== PUZZLE_BOARD_MODE.BLANC) {
      this.clickZones.update((zones) => zones.map((zone) => ({ ...zone, slot: null })));
    }
    this.error.set(null);
  }

  setBoardImage(dataUrl: string): void {
    this.boardImage.set(dataUrl);
    this.boardMode.set(PUZZLE_BOARD_MODE.FOND);
    this.error.set(null);
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
    this.choices.update((rows) => rows.map((row, i) => (i === index ? { ...row, label: value } : row)));
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
    this.pairs.update((rows) => rows.map((row, i) => (i === index ? { ...row, [side]: value } : row)));
  }

  addPair(): void {
    this.pairs.update((rows) => [...rows, { questionSide: '', answerSide: '' }]);
  }

  removePair(index: number): void {
    this.pairs.update((rows) => rows.filter((_, i) => i !== index));
  }

  setItemLabel(index: number, value: string): void {
    this.items.update((rows) => rows.map((row, i) => (i === index ? { ...row, label: value } : row)));
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
    this.statements.update((rows) => rows.map((row, i) => (i === index ? { ...row, label: value } : row)));
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
    this.links.update((rows) => rows.map((row, i) => (i === index ? { ...row, [side]: value } : row)));
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
    this.cards.update((rows) => rows.map((row, i) => (i === index ? { ...row, label: value } : row)));
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

  beginEdit(question: SavedQuestion): void {
    this.editingId.set(question.id);
    this.selectedCode.set(question.formCode);
    this.prompt.set(question.prompt);
    this.choices.set(
      question.choices.length
        ? question.choices.map((choice) => ({ label: choice.label, correct: choice.correct }))
        : emptyChoices(),
    );
    this.pairs.set(
      question.pairs.length
        ? question.pairs.map((pair) => ({ questionSide: pair.questionSide, answerSide: pair.answerSide }))
        : emptyPairs(),
    );
    this.items.set(
      question.items.length
        ? question.items.map((item) => ({ label: item.label, axisLabel: item.axisLabel }))
        : emptyItems(),
    );
    this.timelineEnabled.set(question.timelineEnabled);
    this.statements.set(
      question.statements.length
        ? question.statements.map((row) => ({ label: row.label, truthful: row.truthful }))
        : emptyStatements(),
    );
    this.links.set(
      question.links.length
        ? question.links.map((row) => ({ leftLabel: row.leftLabel, rightLabel: row.rightLabel }))
        : emptyLinks(),
    );
    this.columns.set(
      question.columns.length
        ? question.columns.map((row) => ({ label: row.label }))
        : emptyColumns(),
    );
    this.cards.set(
      question.cards.length
        ? question.cards.map((row) => ({ label: row.label, columnIndex: row.columnIndex }))
        : emptyCards(),
    );
    this.sentence.set(question.sentence);
    this.expectedAnswer.set(question.expectedAnswer);
    this.clickImage.set(question.imageDataUrl);
    this.boardMode.set(question.boardMode);
    this.boardImage.set(question.boardImageDataUrl);
    this.requireAllCorrect.set(question.requireAllCorrect);
    this.clickZones.set(question.zones.map((zone) => ({ ...zone, points: zone.points.map((point) => ({ ...point })) })));
    this.puzzleMagnet.set(question.snapDistance);
    this.answers.set(question.answers.map((row) => ({ label: row.label })));
    this.decoys.set(question.decoys.length ? question.decoys.map((row) => ({ label: row.label })) : emptyDecoys());
    this.error.set(null);
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
    this.timelineEnabled.set(false);
    this.clickZones.set([]);
    this.puzzleMagnet.set(defaultMagnet());
    this.answers.set([]);
    this.decoys.set(emptyDecoys());
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
      clickZones: this.clickZones(),
      puzzleMagnet: this.puzzleMagnet(),
      timelineEnabled: this.timelineEnabled(),
    });
    if (!body) {
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

/** Verdict local d'aperçu (données teacher déjà connues) — pas d'appel API. */
function gradePreview(
  source: SavedQuestion,
  view: ChildQuestionPlayViewComponent,
): { passed: boolean; scorePercent: number } {
  if (source.formCode === 'vrai_faux') {
    const answers = new Map(view.statementAnswers().map((row) => [row.statementId, row.value]));
    let ok = 0;
    source.statements.forEach((row, index) => {
      if (answers.get(index + 1) === row.truthful) {
        ok++;
      }
    });
    const total = source.statements.length || 1;
    const scorePercent = Math.round((100 * ok) / total);
    return { passed: ok === source.statements.length, scorePercent };
  }
  if (source.formCode === 'qcm') {
    const selected = new Set(view.selectedChoiceIds());
    const expected = new Set(
      source.choices.flatMap((choice, index) => (choice.correct ? [index + 1] : [])),
    );
    const same =
      selected.size === expected.size && [...selected].every((id) => expected.has(id));
    return { passed: same, scorePercent: same ? 100 : 0 };
  }
  if (source.formCode === 'memory') {
    const matched = view.matchedPairIds().length;
    const total = source.pairs.length || 1;
    const scorePercent = Math.round((100 * matched) / total);
    return { passed: matched === source.pairs.length, scorePercent };
  }
  if (source.formCode === 'order') {
    const ordered = view.orderedItemIds();
    let ok = 0;
    source.items.forEach((_, index) => {
      if (ordered[index] === index + 1) {
        ok++;
      }
    });
    const total = source.items.length || 1;
    const scorePercent = Math.round((100 * ok) / total);
    return { passed: ok === source.items.length, scorePercent };
  }
  if (source.formCode === 'classement') {
    const byCard = new Map(view.placements().map((row) => [row.cardId, row.columnId]));
    let ok = 0;
    source.cards.forEach((card, index) => {
      if (byCard.get(index + 1) === card.columnIndex + 1) {
        ok++;
      }
    });
    const total = source.cards.length || 1;
    const scorePercent = Math.round((100 * ok) / total);
    return { passed: ok === source.cards.length, scorePercent };
  }
  if (source.formCode === 'liens') {
    const matches = view.linkMatches();
    let ok = 0;
    for (const match of matches) {
      if (match.leftId === match.rightId) {
        ok++;
      }
    }
    const total = source.links.length || 1;
    const scorePercent = Math.round((100 * ok) / total);
    return { passed: ok === source.links.length && matches.length === source.links.length, scorePercent };
  }
  return { passed: false, scorePercent: 0 };
}
