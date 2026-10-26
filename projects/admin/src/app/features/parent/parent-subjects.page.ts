import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import type { ChildSubjectOffer, ChildSubjectsResponse, ParentSubjectsResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { ChildSubjectsService } from './data-access/child-subjects.service';

/**
 * Chaque enfant avec ses matières (SCRUM-162).
 * Celles de son école et de son année sont déjà dans la liste.
 */
@Component({
  selector: 'app-parent-subjects-page',
  imports: [MatButtonModule, MatCardModule, SpaceHeader],
  templateUrl: './parent-subjects.page.html',
  styleUrl: './child-subjects.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentSubjectsPage implements OnInit {
  private readonly api = inject(ChildSubjectsService);

  readonly children = signal<ChildSubjectsResponse[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly pending = signal<{ childId: number; subjectId: number } | null>(null);

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (body) => this.show(body),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Matières indisponibles.'));
      },
    });
  }

  hasClass(child: ChildSubjectsResponse): boolean {
    return child.schoolId != null && !!child.grade?.trim();
  }

  catalogEmpty(child: ChildSubjectsResponse): boolean {
    return (child.chosen ?? []).length === 0 && (child.proposed ?? []).length === 0;
  }

  chosen(child: ChildSubjectsResponse, scolaire: boolean): ChildSubjectOffer[] {
    return this.lines(child.chosen, scolaire);
  }

  proposed(child: ChildSubjectsResponse, scolaire: boolean): ChildSubjectOffer[] {
    return this.lines(child.proposed, scolaire);
  }

  add(childId: number | undefined, subjectId: number | undefined): void {
    if (this.saving() || childId == null || subjectId == null) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.add(childId, subjectId).subscribe({
      next: (body) => this.show(body),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Ajout impossible.'));
      },
    });
  }

  askRemove(childId: number | undefined, subjectId: number | undefined): void {
    if (childId == null || subjectId == null) {
      return;
    }
    this.pending.set({ childId, subjectId });
  }

  cancelRemove(): void {
    this.pending.set(null);
  }

  pendingFor(childId: number | undefined, subjectId: number | undefined): boolean {
    const current = this.pending();
    return current != null && current.childId === childId && current.subjectId === subjectId;
  }

  confirmText(child: ChildSubjectsResponse, offer: ChildSubjectOffer): string {
    return `Retirer ${offer.name} de ${offer.teacherName} de la liste de ${child.firstName} ?`;
  }

  confirmRemove(childId: number | undefined, subjectId: number | undefined): void {
    if (this.saving() || childId == null || subjectId == null) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.remove(childId, subjectId).subscribe({
      next: (body) => this.show(body),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Retrait impossible.'));
      },
    });
  }

  private show(body: ParentSubjectsResponse): void {
    this.children.set(body.children ?? []);
    this.pending.set(null);
    this.loading.set(false);
    this.saving.set(false);
  }

  private lines(offers: ChildSubjectOffer[] | undefined, scolaire: boolean): ChildSubjectOffer[] {
    return (offers ?? []).filter((offer) => offer.scolaire === scolaire);
  }
}
