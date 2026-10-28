import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import type { TeacherSubjectsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { QuestionDestination, SubjectQuestionsComponent } from './components/subject-questions.component';
import { TeacherSubjectsService } from './data-access/teacher-subjects.service';

interface SubjectRow {
  id: number;
  name: string;
  place: string;
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

/**
 * Questions des matières que le professeur suit (SCRUM-174).
 * Une matière déjà dans la classe, suivie par un collègue, n'est pas proposée ici.
 * Une seule matière est ouverte : les autres restent des choix, pas des éditeurs empilés.
 */
@Component({
  selector: 'app-teacher-questions-page',
  imports: [SpaceHeader, SubjectQuestionsComponent],
  templateUrl: './teacher-questions.page.html',
  styleUrl: './teacher-questions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherQuestionsPage implements OnInit {
  private readonly subjectsApi = inject(TeacherSubjectsService);

  readonly schools = signal<SchoolBlock[]>([]);
  readonly openId = signal<number | null>(null);
  readonly subjectChoices = computed(() =>
    this.schools().flatMap((school) => school.grades.flatMap((grade) => grade.subjects)),
  );
  readonly openSubject = computed(() => this.subjectChoices().find((subject) => subject.id === this.openId()) ?? null);
  /** Un tableau d'un seul élément, pour recréer l'écran quand la matière change. */
  readonly openList = computed(() => {
    const subject = this.openSubject();
    return subject ? [subject] : [];
  });
  readonly destinations = computed(() => destinationsOf(this.schools()));
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);

  open(id: number): void {
    this.openId.set(id);
  }

  ngOnInit(): void {
    this.subjectsApi.load().subscribe({
      next: (body) => this.apply(body),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
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
        const place = [school.schoolName ?? '', grade.grade].filter((part) => part).join(' — ');
        for (const subject of grade.subjects ?? []) {
          if (subject.id == null || !subject.name || subject.followedByMe === false) {
            continue;
          }
          subjects.push({ id: subject.id, name: subject.name, place });
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
    const choices = schools.flatMap((school) => school.grades.flatMap((grade) => grade.subjects));
    const current = this.openId();
    if (!choices.some((subject) => subject.id === current)) {
      this.openId.set(choices[0]?.id ?? null);
    }
    this.ready.set(true);
    this.loading.set(false);
  }
}

function destinationsOf(schools: SchoolBlock[]): QuestionDestination[] {
  const choices: QuestionDestination[] = [];
  for (const school of schools) {
    for (const grade of school.grades) {
      for (const subject of grade.subjects) {
        choices.push({ id: subject.id, label: subject.place ? `${subject.place} — ${subject.name}` : subject.name });
      }
    }
  }
  return choices;
}
