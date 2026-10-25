import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type { TeacherSubjectsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherSubjectsService } from './data-access/teacher-subjects.service';

interface SubjectRow {
  id: number;
  name: string;
}

interface GradeBlock {
  grade: string;
  subjects: SubjectRow[];
}

interface SchoolBlock {
  schoolId: number;
  schoolName: string;
  grades: GradeBlock[];
}

const NAME_REQUIRED = 'Le nom est obligatoire.';
const NAME_TOO_LONG = 'Le nom dépasse 100 caractères.';
const NAME_MAX = 100;

/**
 * Matières du professeur, une liste par classe déjà cochée sur son profil.
 * Les exercices, le clone et les formes de questions ne sont pas sur cette page.
 */
@Component({
  selector: 'app-teacher-subjects-page',
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, SpaceHeader],
  templateUrl: './teacher-subjects.page.html',
  styleUrl: './subjects.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectsPage implements OnInit {
  private readonly api = inject(TeacherSubjectsService);

  readonly schools = signal<SchoolBlock[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly drafts = signal<Readonly<Record<string, string>>>({});
  readonly gradeErrors = signal<Readonly<Record<string, string>>>({});
  readonly subjectErrors = signal<Readonly<Record<number, string>>>({});
  readonly renamingId = signal<number | null>(null);
  readonly renameDraft = signal('');
  readonly pendingRemoveId = signal<number | null>(null);

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (body) => this.apply(body),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Matières indisponibles.'));
      },
    });
  }

  draft(schoolId: number, grade: string): string {
    return this.drafts()[this.gradeKey(schoolId, grade)] ?? '';
  }

  gradeError(schoolId: number, grade: string): string | null {
    return this.gradeErrors()[this.gradeKey(schoolId, grade)] ?? null;
  }

  subjectError(subjectId: number): string | null {
    return this.subjectErrors()[subjectId] ?? null;
  }

  confirmText(school: SchoolBlock, grade: GradeBlock, subject: SubjectRow): string {
    const place = school.schoolName ? `${grade.grade} de ${school.schoolName}` : grade.grade;
    return `Retirer ${subject.name} du ${place} ?`;
  }

  inputValue(event: Event): string {
    const target = event.target;
    return target instanceof HTMLInputElement ? target.value : '';
  }

  onDraft(schoolId: number, grade: string, value: string): void {
    const key = this.gradeKey(schoolId, grade);
    this.drafts.update((current) => ({ ...current, [key]: value }));
    this.clearGradeError(schoolId, grade);
  }

  add(schoolId: number, grade: string): void {
    if (this.saving()) {
      return;
    }
    const raw = this.draft(schoolId, grade);
    const problem = nameProblem(raw);
    if (problem) {
      this.setGradeError(schoolId, grade, problem);
      return;
    }
    this.clearGradeError(schoolId, grade);
    this.error.set(null);
    this.saving.set(true);
    this.api.create({ schoolId, grade, name: raw.trim() }).subscribe({
      next: () => {
        this.onDraft(schoolId, grade, '');
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.setGradeError(schoolId, grade, httpErrorMessage(err, 'Ajout impossible.'));
      },
    });
  }

  startRename(subject: SubjectRow): void {
    this.pendingRemoveId.set(null);
    this.renamingId.set(subject.id);
    this.renameDraft.set(subject.name);
    this.clearSubjectError(subject.id);
  }

  onRenameDraft(value: string): void {
    this.renameDraft.set(value);
    const current = this.renamingId();
    if (current != null) {
      this.clearSubjectError(current);
    }
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.renameDraft.set('');
  }

  saveRename(subjectId: number): void {
    if (this.saving()) {
      return;
    }
    const problem = nameProblem(this.renameDraft());
    if (problem) {
      this.setSubjectError(subjectId, problem);
      return;
    }
    this.clearSubjectError(subjectId);
    this.error.set(null);
    this.saving.set(true);
    this.api.rename(subjectId, { name: this.renameDraft().trim() }).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.setSubjectError(subjectId, httpErrorMessage(err, 'Renommage impossible.'));
      },
    });
  }

  askRemove(subject: SubjectRow): void {
    this.renamingId.set(null);
    this.pendingRemoveId.set(subject.id);
    this.clearSubjectError(subject.id);
  }

  cancelRemove(): void {
    this.pendingRemoveId.set(null);
  }

  confirmRemove(subjectId: number): void {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.remove(subjectId).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.setSubjectError(subjectId, httpErrorMessage(err, 'Retrait impossible.'));
      },
    });
  }

  private reload(): void {
    this.api.load().subscribe({
      next: (body) => {
        this.apply(body);
        this.saving.set(false);
        this.renamingId.set(null);
        this.renameDraft.set('');
        this.pendingRemoveId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Matières indisponibles.'));
      },
    });
  }

  private apply(body: TeacherSubjectsResponse): void {
    const schools: SchoolBlock[] = [];
    for (const school of body.schools ?? []) {
      if (school.schoolId == null) {
        continue;
      }
      const grades: GradeBlock[] = [];
      for (const grade of school.grades ?? []) {
        if (!grade.grade) {
          continue;
        }
        const subjects: SubjectRow[] = [];
        for (const subject of grade.subjects ?? []) {
          if (subject.id == null || !subject.name) {
            continue;
          }
          subjects.push({ id: subject.id, name: subject.name });
        }
        grades.push({ grade: grade.grade, subjects });
      }
      schools.push({
        schoolId: school.schoolId,
        schoolName: school.schoolName ?? '',
        grades,
      });
    }
    this.schools.set(schools);
    this.loading.set(false);
    this.ready.set(true);
  }

  private gradeKey(schoolId: number, grade: string): string {
    return `${schoolId}|${grade}`;
  }

  private setGradeError(schoolId: number, grade: string, message: string): void {
    const key = this.gradeKey(schoolId, grade);
    this.gradeErrors.update((current) => ({ ...current, [key]: message }));
  }

  private clearGradeError(schoolId: number, grade: string): void {
    const key = this.gradeKey(schoolId, grade);
    this.gradeErrors.update((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  private setSubjectError(subjectId: number, message: string): void {
    this.subjectErrors.update((current) => ({ ...current, [subjectId]: message }));
  }

  private clearSubjectError(subjectId: number): void {
    this.subjectErrors.update((current) => {
      if (!(subjectId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[subjectId];
      return next;
    });
  }
}

function nameProblem(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return NAME_REQUIRED;
  }
  if (trimmed.length > NAME_MAX) {
    return NAME_TOO_LONG;
  }
  return null;
}
