import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import type { ParentChildResponse, ParentSejourItem } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { SejourListComponent } from '../../shared/sejour-list/sejour-list.component';
import { ParentChildrenService } from './data-access/parent-children.service';
import { ParentSejourService } from './data-access/parent-sejour.service';

/**
 * Page Temps du parent (ADMIN-78).
 * Le premier enfant de Mes enfants est ouvert. Les libellés viennent de la lecture.
 */
@Component({
  selector: 'app-parent-temps-page',
  imports: [SpaceHeader, SejourListComponent],
  templateUrl: './parent-temps.page.html',
  styleUrl: './parent-temps.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentTempsPage implements OnInit {
  private readonly childrenApi = inject(ParentChildrenService);
  private readonly sejoursApi = inject(ParentSejourService);

  readonly children = signal<ParentChildResponse[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly sejours = signal<ParentSejourItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  private request = 0;

  readonly selected = computed(
    () => this.children().find((child) => child.id === this.selectedId()) ?? null,
  );

  ngOnInit(): void {
    this.childrenApi.load().subscribe({
      next: (body) => {
        const list = body.children ?? [];
        this.children.set(list);
        const first = list.find((child) => child.id != null);
        if (first?.id == null) {
          this.loading.set(false);
          return;
        }
        this.select(first.id);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Temps indisponible.'));
      },
    });
  }

  select(childId: number | undefined): void {
    if (childId == null) {
      return;
    }
    this.selectedId.set(childId);
    this.error.set(null);
    this.sejours.set([]);
    const request = ++this.request;
    this.sejoursApi.list(childId).subscribe({
      next: (body) => {
        if (request !== this.request) {
          return;
        }
        this.sejours.set(body.sejours ?? []);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (request !== this.request) {
          return;
        }
        this.sejours.set([]);
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Temps indisponible.'));
      },
    });
  }
}
