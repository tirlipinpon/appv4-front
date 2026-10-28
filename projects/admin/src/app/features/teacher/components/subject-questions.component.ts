import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type { components } from '../../../core/api/schema';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { TeacherQuestionsService } from '../data-access/teacher-questions.service';

interface FormChoice {
  code: string;
  label: string;
}

interface ChoiceDraft {
  label: string;
  correct: boolean;
}

interface SavedChoice {
  label: string;
  correct: boolean;
}

interface PairDraft {
  questionSide: string;
  answerSide: string;
}

interface ItemDraft {
  label: string;
}

interface StatementDraft {
  label: string;
  truthful: boolean | null;
}

interface SavedQuestion {
  id: number;
  prompt: string;
  formCode: string;
  formLabel: string;
  choices: SavedChoice[];
  pairs: PairDraft[];
  items: ItemDraft[];
  statements: StatementDraft[];
}

/** Formes dont le formulaire est écrit. Le libellé vient de l'API. */
const QCM = 'qcm';
const MEMORY = 'memory';
const ORDER = 'order';
const TRUE_FALSE = 'vrai_faux';

/**
 * Préparer un choix multiple, un Memory, un Ordre ou un Vrai ou faux
 * (SCRUM-174, SCRUM-175, SCRUM-176, SCRUM-177).
 * La liste des formes est celle de l'API. L'élève ne joue pas ici.
 */
@Component({
  selector: 'app-subject-questions',
  imports: [MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  templateUrl: './subject-questions.component.html',
  styleUrl: './subject-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectQuestionsComponent implements OnInit {
  private readonly api = inject(TeacherQuestionsService);

  @Input({ required: true }) subjectId!: number;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly forms = signal<FormChoice[]>([]);
  readonly selectedCode = signal<string | null>(null);
  readonly questions = signal<SavedQuestion[]>([]);
  readonly prompt = signal('');
  readonly choices = signal<ChoiceDraft[]>(emptyChoices());
  readonly pairs = signal<PairDraft[]>(emptyPairs());
  readonly items = signal<ItemDraft[]>(emptyItems());
  readonly statements = signal<StatementDraft[]>(emptyStatements());
  /** Question en cours de correction. Vide = on prépare une nouvelle question. */
  readonly editingId = signal<number | null>(null);

  ngOnInit(): void {
    this.api.forms().subscribe({
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

  setChoiceLabel(index: number, value: string): void {
    this.choices.update((rows) => rows.map((row, i) => (i === index ? { ...row, label: value } : row)));
  }

  setChoiceCorrect(index: number, correct: boolean): void {
    this.choices.update((rows) => rows.map((row, i) => (i === index ? { ...row, correct } : row)));
  }

  addChoice(): void {
    this.choices.update((rows) => [...rows, { label: '', correct: false }]);
  }

  setPairSide(index: number, side: 'questionSide' | 'answerSide', value: string): void {
    this.pairs.update((rows) => rows.map((row, i) => (i === index ? { ...row, [side]: value } : row)));
  }

  addPair(): void {
    this.pairs.update((rows) => [...rows, { questionSide: '', answerSide: '' }]);
  }

  setItemLabel(index: number, value: string): void {
    this.items.update((rows) => rows.map((row, i) => (i === index ? { label: value } : row)));
  }

  addItem(): void {
    this.items.update((rows) => [...rows, { label: '' }]);
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
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.prompt.set('');
    this.choices.set(emptyChoices());
    this.pairs.set(emptyPairs());
    this.items.set(emptyItems());
    this.statements.set(emptyStatements());
    this.error.set(null);
  }

  save(): void {
    const code = this.selectedCode();
    const editingId = this.editingId();
    if ((code !== QCM && code !== MEMORY && code !== ORDER && code !== TRUE_FALSE) || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body =
      code === MEMORY
        ? {
            formCode: code,
            prompt: this.prompt(),
            pairs: this.pairs().map((pair) => ({
              questionSide: pair.questionSide,
              answerSide: pair.answerSide,
            })),
          }
        : code === ORDER
          ? {
              formCode: code,
              prompt: this.prompt(),
              items: this.items().map((item) => ({ label: item.label })),
            }
          : code === TRUE_FALSE
            ? {
                formCode: code,
                prompt: this.prompt(),
                statements: this.statements().map((row) => ({
                  label: row.label,
                  ...(row.truthful == null ? {} : { truthful: row.truthful }),
                })),
              }
            : {
                formCode: code,
                prompt: this.prompt(),
                choices: this.choices().map((choice) => ({ label: choice.label, correct: choice.correct })),
              };
    const request =
      editingId == null
        ? this.api.create(this.subjectId, body)
        : this.api.update(this.subjectId, editingId, body);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        const row = toSaved(saved);
        this.questions.update((rows) =>
          editingId == null ? [...rows, row] : rows.map((item) => (item.id === row.id ? row : item)),
        );
        this.cancelEdit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Enregistrement impossible.'));
      },
    });
  }

  private loadQuestions(): void {
    this.api.list(this.subjectId).subscribe({
      next: (body) => {
        this.questions.set((body.questions ?? []).map((question) => toSaved(question)));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Questions indisponibles.'));
      },
    });
  }
}

function emptyStatements(): StatementDraft[] {
  return [
    { label: '', truthful: null },
    { label: '', truthful: null },
  ];
}

function emptyItems(): ItemDraft[] {
  return [{ label: '' }, { label: '' }];
}

function emptyPairs(): PairDraft[] {
  return [
    { questionSide: '', answerSide: '' },
    { questionSide: '', answerSide: '' },
  ];
}

function emptyChoices(): ChoiceDraft[] {
  return [
    { label: '', correct: false },
    { label: '', correct: false },
  ];
}

function toSaved(question: components['schemas']['TeacherSubjectQuestionItem']): SavedQuestion {
  const choices = (question.choices ?? []).flatMap((choice) => {
    if (!choice.label) {
      return [];
    }
    return [{ label: choice.label, correct: !!choice.correct }];
  });
  const pairs = (question.pairs ?? []).flatMap((pair) => {
    if (!pair.questionSide || !pair.answerSide) {
      return [];
    }
    return [{ questionSide: pair.questionSide, answerSide: pair.answerSide }];
  });
  const items = (question.items ?? []).flatMap((item) => {
    if (!item.label) {
      return [];
    }
    return [{ label: item.label }];
  });
  const statements = (question.statements ?? []).flatMap((row) => {
    if (!row.label || row.truthful == null) {
      return [];
    }
    return [{ label: row.label, truthful: row.truthful }];
  });
  return {
    id: question.id ?? 0,
    prompt: question.prompt ?? '',
    formCode: question.formCode ?? '',
    formLabel: question.formLabel ?? '',
    choices,
    pairs,
    items,
    statements,
  };
}
