import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import type { JourneeMonthResponse, TeacherStudentsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { SpaceTrailNames } from '../../core/layout/space-trail';
import { JourneeMonthComponent } from '../../shared/journee-month/journee-month.component';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherSejourService } from './data-access/teacher-sejour.service';
import { TeacherStudentsService } from './data-access/teacher-students.service';

/**
 * Mois d'un élève ouvert depuis la classe (ADMIN-81).
 * Même calendrier que le parent. Pas de plafond, pas de courbe.
 */
@Component({
  selector: 'app-teacher-student-sejour-page',
  imports: [SpaceHeader, JourneeMonthComponent],
  templateUrl: './teacher-student-sejour.page.html',
  styleUrl: './teacher-student-sejour.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherStudentSejourPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentsApi = inject(TeacherStudentsService);
  private readonly sejoursApi = inject(TeacherSejourService);
  private readonly trailNames = inject(SpaceTrailNames);
  private readonly destroyRef = inject(DestroyRef);
  private trailGeneration = 0;

  readonly name = signal<string | null>(null);
  readonly month = signal<JourneeMonthResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  private childId: number | null = null;
  private request = 0;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.trailNames.clearStudent(this.trailGeneration));
    const childId = Number(this.route.snapshot.paramMap.get('childId'));
    if (!Number.isInteger(childId)) {
      this.loading.set(false);
      return;
    }
    this.childId = childId;
    this.studentsApi.load().subscribe({
      next: (body) => {
        const found = studentName(body, childId);
        this.name.set(found);
        this.trailGeneration = this.trailNames.publishStudent(found);
      },
      error: () => {
        this.loading.set(false);
        this.trailGeneration = this.trailNames.publishStudent(null);
      },
    });
    this.load();
  }

  previous(): void {
    const year = this.month()?.year;
    const month = this.month()?.month;
    if (year == null || month == null) {
      return;
    }
    const earlier = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    this.load(earlier.year, earlier.month);
  }

  next(): void {
    const shown = this.month();
    const year = shown?.year;
    const month = shown?.month;
    if (year == null || month == null || shown?.currentMonth === true) {
      return;
    }
    const later = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    this.load(later.year, later.month);
  }

  private load(year?: number, month?: number): void {
    if (this.childId == null) {
      return;
    }
    this.error.set(null);
    const request = ++this.request;
    this.sejoursApi.list(this.childId, year, month).subscribe({
      next: (body) => {
        if (request !== this.request) {
          return;
        }
        this.month.set(body);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (request !== this.request) {
          return;
        }
        this.month.set(null);
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
