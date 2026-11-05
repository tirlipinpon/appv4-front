import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type { TeacherSubjectFollowersResponse } from '../../../core/api/api-models';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { TeacherQuestionsService } from '../data-access/teacher-questions.service';
import { ClickZoneEditorComponent } from './click-zone-editor.component';
import { ClickZone } from './click-zone';
import { buildSaveBody, parseSavedQuestion, requireSavedQuestion } from './question-form.adapters';
import {
  ChoiceDraft,
  GapWordDraft,
  ItemDraft,
  LinkDraft,
  PairDraft,
  SavedQuestion,
  StatementDraft,
  defaultMagnet,
  emptyChoices,
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
  readonly sentence = signal('');
  readonly expectedAnswer = signal('');
  readonly clickImage = signal('');
  readonly requireAllCorrect = signal(true);
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
  readonly followers = signal<TeacherSubjectFollowersResponse | null>(null);
  private followSeq = 0;

  ngOnInit(): void {
    this.api.copiedToSubject$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((subjectId) => {
      if (subjectId === this.subjectId) {
        this.loadQuestions();
      }
    });
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
          if (forms.length === 1) {
            this.selectedCode.set(forms[0].code);
          }
          this.loadQuestions();
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(httpErrorMessage(err, 'Formes indisponibles.'));
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
    this.items.update((rows) => rows.map((row, i) => (i === index ? { label: value } : row)));
  }

  addItem(): void {
    this.items.update((rows) => [...rows, { label: '' }]);
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
    this.items.set(question.items.length ? question.items.map((item) => ({ label: item.label })) : emptyItems());
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
    this.sentence.set(question.sentence);
    this.expectedAnswer.set(question.expectedAnswer);
    this.clickImage.set(question.imageDataUrl);
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
    this.sentence.set('');
    this.expectedAnswer.set('');
    this.clickImage.set('');
    this.requireAllCorrect.set(true);
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
    const body = buildSaveBody(code, {
      prompt: this.prompt(),
      choices: this.choices(),
      pairs: this.pairs(),
      items: this.items(),
      statements: this.statements(),
      links: this.links(),
      sentence: this.sentence(),
      answers: this.answers(),
      decoys: this.decoys(),
      expectedAnswer: this.expectedAnswer(),
      clickImage: this.clickImage(),
      requireAllCorrect: this.requireAllCorrect(),
      clickZones: this.clickZones(),
      puzzleMagnet: this.puzzleMagnet(),
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
