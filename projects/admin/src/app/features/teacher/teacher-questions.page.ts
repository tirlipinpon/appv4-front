import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import type { TeacherSubjectsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { SubjectQuestionsComponent } from './components/subject-questions.component';
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

/**
 * Questions des matières du professeur (SCRUM-174).
 * La page matières ne prépare plus les énoncés : ils se lisent et s'ajoutent ici.
 */
@Component({
  selector: 'app-teacher-questions-page',
  imports: [MatCardModule, SpaceHeader, SubjectQuestionsComponent],
  templateUrl: './teacher-questions.page.html',
  styleUrl: './teacher-questions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherQuestionsPage implements OnInit {
  private readonly subjectsApi = inject(TeacherSubjectsService);

  readonly schools = signal<SchoolBlock[]>([]);
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);

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
    this.ready.set(true);
    this.loading.set(false);
  }
}
