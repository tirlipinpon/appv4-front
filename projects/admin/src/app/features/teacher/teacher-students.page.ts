import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import type { TeacherStudentsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherStudentsService } from './data-access/teacher-students.service';
import { studentAvatar } from './student-avatars';

interface StudentRow {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  avatarCode: string | null;
  hasPhoto: boolean;
}

interface GradeBlock {
  grade: string;
  countLabel: string;
  emptyMessage: string;
  students: StudentRow[];
}

interface SchoolBlock {
  schoolId: number;
  schoolName: string;
  curriculumLabel: string;
  grades: GradeBlock[];
}

/**
 * Élèves inscrits dans les classes du professeur (SCRUM-160).
 * Lecture seule : pas de formulaire, pas de PIN, pas de compte parent.
 */
@Component({
  selector: 'app-teacher-students-page',
  imports: [MatCardModule, SpaceHeader],
  templateUrl: './teacher-students.page.html',
  styleUrl: './teacher-students.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherStudentsPage implements OnInit, OnDestroy {
  private readonly api = inject(TeacherStudentsService);

  readonly schools = signal<SchoolBlock[]>([]);
  readonly noClassMessage = signal('');
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly photos = signal<Readonly<Record<number, string>>>({});
  readonly emoji = studentAvatar;

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (body) => this.apply(body),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Élèves indisponibles.'));
      },
    });
  }

  ngOnDestroy(): void {
    this.releasePhotos();
  }

  private apply(body: TeacherStudentsResponse): void {
    this.releasePhotos();
    this.noClassMessage.set(body.noClassMessage ?? '');
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
        const students: StudentRow[] = [];
        for (const student of grade.students ?? []) {
          if (student.id == null || student.age == null || !student.firstName || !student.lastName) {
            continue;
          }
          students.push({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            age: student.age,
            avatarCode: student.avatarCode ?? null,
            hasPhoto: student.hasPhoto === true,
          });
        }
        grades.push({
          grade: grade.grade,
          countLabel: grade.countLabel ?? '',
          emptyMessage: grade.emptyMessage ?? '',
          students,
        });
      }
      schools.push({
        schoolId: school.schoolId,
        schoolName: school.schoolName ?? '',
        curriculumLabel: school.curriculumLabel ?? '',
        grades,
      });
    }
    this.schools.set(schools);
    this.loading.set(false);
    this.ready.set(true);
    this.loadPhotos(schools);
  }

  private loadPhotos(schools: SchoolBlock[]): void {
    for (const school of schools) {
      for (const grade of school.grades) {
        for (const student of grade.students) {
          if (!student.hasPhoto) {
            continue;
          }
          const id = student.id;
          this.api.photo(id).subscribe({
            next: (blob) => {
              const url = URL.createObjectURL(blob);
              this.photos.update((current) => ({ ...current, [id]: url }));
            },
          });
        }
      }
    }
  }

  private releasePhotos(): void {
    for (const url of Object.values(this.photos())) {
      URL.revokeObjectURL(url);
    }
    this.photos.set({});
  }
}
