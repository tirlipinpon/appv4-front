import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { EMPTY, catchError, from, map, mergeMap } from 'rxjs';

import type { TeacherStudentsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { PhotoObjectUrlBag } from '../../shared/photos/photo-object-url-bag';
import { TeacherStudentsService } from './data-access/teacher-students.service';
import { studentAvatar } from '../../shared/avatars/account-avatars';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly photoBag = new PhotoObjectUrlBag();

  readonly schools = signal<SchoolBlock[]>([]);
  readonly noClassMessage = signal('');
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly photos = signal<Readonly<Record<number, string>>>({});
  readonly emoji = studentAvatar;

  /** Nombre de classes déjà renvoyées pour cette école. */
  classCountLabel(count: number): string {
    return count === 1 ? '1 classe' : `${count} classes`;
  }

  ngOnInit(): void {
    this.api
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => this.apply(body),
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(httpErrorMessage(err, 'Élèves indisponibles.'));
        },
      });
  }

  ngOnDestroy(): void {
    this.photoBag.destroy();
    this.photos.set({});
  }

  private apply(body: TeacherStudentsResponse): void {
    this.photoBag.invalidate();
    this.photos.set({});
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
    const ticket = this.photoBag.ticket();
    const ids = [...new Set(schools.flatMap((school) =>
      school.grades.flatMap((grade) => grade.students.filter((student) => student.hasPhoto).map((student) => student.id)),
    ))];
    from(ids).pipe(
      mergeMap((id) => this.api.photo(id).pipe(
        map((blob) => ({ id, blob })),
        catchError(() => EMPTY),
      ), 4),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ id, blob }) => {
      if (this.photoBag.putIfCurrent(ticket, id, blob)) {
        this.photos.set(this.photoBag.snapshot());
      }
    });
  }
}
