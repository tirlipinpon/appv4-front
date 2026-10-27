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

interface SavedQuestion {
  id: number;
  prompt: string;
  formCode: string;
  formLabel: string;
  choices: SavedChoice[];
}

/** Seule forme dont le formulaire est écrit. Le libellé vient de l'API. */
const QCM = 'qcm';

/**
 * Préparer un choix multiple dans une matière (SCRUM-174).
 * La liste des formes est celle de l'API. Le formulaire s'ouvre pour le code qcm.
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

  beginEdit(question: SavedQuestion): void {
    this.editingId.set(question.id);
    this.selectedCode.set(question.formCode);
    this.prompt.set(question.prompt);
    this.choices.set(question.choices.map((choice) => ({ label: choice.label, correct: choice.correct })));
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.prompt.set('');
    this.choices.set(emptyChoices());
    this.error.set(null);
  }

  save(): void {
    const code = this.selectedCode();
    const editingId = this.editingId();
    if (code !== QCM || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body = {
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
  return {
    id: question.id ?? 0,
    prompt: question.prompt ?? '',
    formCode: question.formCode ?? '',
    formLabel: question.formLabel ?? '',
    choices,
  };
}
