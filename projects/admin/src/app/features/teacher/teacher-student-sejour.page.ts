import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import type { ParentSejourItem, TeacherStudentsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherSejourService } from './data-access/teacher-sejour.service';
import { TeacherStudentsService } from './data-access/teacher-students.service';

/**
 * Séjour d'un élève ouvert depuis la liste (ADMIN-79).
 * Le nom vient des élèves de la classe. Les libellés restent ceux de la lecture.
 */
@Component({
  selector: 'app-teacher-student-sejour-page',
  imports: [SpaceHeader],
  templateUrl: './teacher-student-sejour.page.html',
  styleUrl: './teacher-student-sejour.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherStudentSejourPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentsApi = inject(TeacherStudentsService);
  private readonly sejoursApi = inject(TeacherSejourService);

  readonly name = signal<string | null>(null);
  readonly sejours = signal<ParentSejourItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const childId = Number(this.route.snapshot.paramMap.get('childId'));
    if (!Number.isInteger(childId)) {
      this.loading.set(false);
      return;
    }
    this.studentsApi.load().subscribe({
      next: (body) => this.name.set(studentName(body, childId)),
      error: () => this.loading.set(false),
    });
    this.sejoursApi.list(childId).subscribe({
      next: (body) => {
        this.sejours.set(body.sejours ?? []);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.sejours.set([]);
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Temps indisponible.'));
      },
    });
  }
}

function studentName(body: TeacherStudentsResponse, childId: number): string | null {
  for (const school of body.schools ?? []) {
    for (const grade of school.grades ?? []) {
      for (const student of grade.students ?? []) {
        if (student.id === childId && student.firstName && student.lastName) {
          return `${student.firstName} ${student.lastName}`;
        }
      }
    }
  }
  return null;
}
