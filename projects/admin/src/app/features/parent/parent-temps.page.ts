import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import type {
  ParentChildResponse,
  ParentJourneeMonthResponse,
  PlafondRequest,
  PlafondResponse,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { JourneeMonthComponent } from '../../shared/journee-month/journee-month.component';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { ParentChildrenService } from './data-access/parent-children.service';
import { ParentSejourService } from './data-access/parent-sejour.service';
import { ParentTempsEvolution } from './parent-temps-evolution';

/**
 * Page Temps du parent (ADMIN-80, ADMIN-57).
 * Le mois, les journées et le plafond viennent de la lecture. La phrase n'est pas écrite ici.
 */
@Component({
  selector: 'app-parent-temps-page',
  imports: [SpaceHeader, JourneeMonthComponent, ParentTempsEvolution],
  templateUrl: './parent-temps.page.html',
  styleUrl: './parent-temps.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentTempsPage implements OnInit {
  private readonly childrenApi = inject(ParentChildrenService);
  private readonly sejoursApi = inject(ParentSejourService);

  readonly children = signal<ParentChildResponse[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly month = signal<ParentJourneeMonthResponse | null>(null);
  readonly draft = signal('');
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
    this.load(childId);
  }

  previous(): void {
    const childId = this.selectedId();
    const year = this.month()?.year;
    const month = this.month()?.month;
    if (childId == null || year == null || month == null) {
      return;
    }
    const earlier = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    this.load(childId, earlier.year, earlier.month);
  }

  next(): void {
    const shown = this.month();
    const childId = this.selectedId();
    const year = shown?.year;
    const month = shown?.month;
    if (childId == null || year == null || month == null || shown?.currentMonth === true) {
      return;
    }
    const later = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    this.load(childId, later.year, later.month);
  }

  private load(childId: number, year?: number, month?: number): void {
    this.error.set(null);
    const request = ++this.request;
    this.sejoursApi.list(childId, year, month).subscribe({
      next: (body) => {
        if (request !== this.request) {
          return;
        }
        this.month.set(body);
        this.draft.set(minutesText(body.plafond?.limitMinutes));
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

  onDraft(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.draft.set(target.value);
    }
  }

  save(): void {
    this.post(this.draftBody());
  }

  clear(): void {
    this.draft.set('');
    this.post({});
  }

  private draftBody(): PlafondRequest {
    const raw = this.draft().trim();
    if (raw === '') {
      return {};
    }
    return { limitMinutes: Number(raw) };
  }

  private post(body: PlafondRequest): void {
    const childId = this.selectedId();
    if (childId == null || this.month()?.plafond?.editable !== true) {
      return;
    }
    if (body.limitMinutes != null && Number.isNaN(body.limitMinutes)) {
      return;
    }
    this.error.set(null);
    this.sejoursApi.save(childId, body).subscribe({
      next: (plafond) => this.apply(childId, plafond),
      error: (err: HttpErrorResponse) => this.error.set(httpErrorMessage(err, 'Temps indisponible.')),
    });
  }

  private apply(childId: number, plafond: PlafondResponse): void {
    if (this.selectedId() !== childId) {
      return;
    }
    const shown = this.month();
    if (shown == null) {
      return;
    }
    this.month.set({ ...shown, plafond });
    this.draft.set(minutesText(plafond.limitMinutes));
  }
}

function minutesText(minutes: number | null | undefined): string {
  return minutes == null ? '' : String(minutes);
}
