import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import type {
  JourneeItem,
  JourneeLineItem,
  JourneeMonthResponse,
  ParentChildResponse,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { ParentChildrenService } from './data-access/parent-children.service';
import { ParentSejourService } from './data-access/parent-sejour.service';
import { ParentTempsEvolution } from './parent-temps-evolution';

/**
 * Page Temps du parent (ADMIN-80).
 * Le mois et les journées viennent de la lecture. Le sélecteur garde un espace entier.
 */
@Component({
  selector: 'app-parent-temps-page',
  imports: [SpaceHeader, ParentTempsEvolution],
  templateUrl: './parent-temps.page.html',
  styleUrl: './parent-temps.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentTempsPage implements OnInit {
  private readonly childrenApi = inject(ParentChildrenService);
  private readonly sejoursApi = inject(ParentSejourService);

  readonly children = signal<ParentChildResponse[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly month = signal<JourneeMonthResponse | null>(null);
  readonly opened = signal<JourneeItem | null>(null);
  /** Espace affiché. Vide : toute la journée. `question` regroupe les questions jouées et l'écran Questions. */
  readonly filter = signal<string | null>(null);
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
    this.load(childId, earlier.year, earlier.month, false);
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
    this.load(childId, later.year, later.month, true);
  }

  open(journee: JourneeItem): void {
    if (this.opened() !== journee) {
      this.filter.set(null);
    }
    this.opened.set(journee);
  }

  choose(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.filter.set(raw === '' ? null : raw);
  }

  choices(journee: JourneeItem): { space: string; label: string }[] {
    const lines = journee.lines ?? [];
    const seen = new Set<string>();
    const choices: { space: string; label: string }[] = [];
    for (const line of lines) {
      const space = this.groupOf(line.space);
      if (space == null || seen.has(space)) {
        continue;
      }
      seen.add(space);
      choices.push({ space, label: this.groupLabel(space, lines) });
    }
    return choices;
  }

  visibleLines(journee: JourneeItem): JourneeLineItem[] {
    const lines = journee.lines ?? [];
    const picked = this.filter();
    if (picked == null) {
      return lines;
    }
    return lines.filter((line) => this.groupOf(line.space) === picked);
  }

  shownDuration(journee: JourneeItem): string | undefined {
    return this.filter() == null ? journee.durationLabel : undefined;
  }

  isMuted(lineSpace: string | undefined): boolean {
    const picked = this.filter();
    if (picked == null) {
      return false;
    }
    return this.groupOf(lineSpace) !== picked;
  }

  private groupOf(space: string | undefined): string | null {
    if (space == null || space === '') {
      return null;
    }
    if (space === 'question' || space === 'questions') {
      return 'question';
    }
    return space;
  }

  private groupLabel(space: string, lines: JourneeLineItem[]): string {
    if (space === 'question') {
      return lines.find((line) => line.space === 'questions' && line.label)?.label ?? 'Questions';
    }
    return lines.find((line) => line.space === space && line.label)?.label ?? space;
  }

  cells(): { day: number | null; journee: JourneeItem | null }[] {
    const shown = this.month();
    if (shown?.year == null || shown.month == null) {
      return [];
    }
    const first = new Date(shown.year, shown.month - 1, 1);
    const pad = (first.getDay() + 6) % 7;
    const count = new Date(shown.year, shown.month, 0).getDate();
    const byDay = new Map<number, JourneeItem>();
    for (const journee of shown.journees ?? []) {
      if (journee.day != null) {
        byDay.set(journee.day, journee);
      }
    }
    const cells: { day: number | null; journee: JourneeItem | null }[] = [];
    for (let index = 0; index < pad; index += 1) {
      cells.push({ day: null, journee: null });
    }
    for (let day = 1; day <= count; day += 1) {
      cells.push({ day, journee: byDay.get(day) ?? null });
    }
    return cells;
  }

  private load(childId: number, year?: number, month?: number, openToday = true): void {
    this.error.set(null);
    this.opened.set(null);
    this.filter.set(null);
    const request = ++this.request;
    this.sejoursApi.list(childId, year, month).subscribe({
      next: (body) => {
        if (request !== this.request) {
          return;
        }
        this.month.set(body);
        const today = (body.journees ?? []).find((journee) => journee.today === true) ?? null;
        this.opened.set(openToday && body.currentMonth === true ? today : null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (request !== this.request) {
          return;
        }
        this.month.set(null);
        this.opened.set(null);
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Temps indisponible.'));
      },
    });
  }
}
