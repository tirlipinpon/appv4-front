import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';

import type {
  JourneeItem,
  JourneeLineItem,
  JourneeMonthResponse,
  ParentJourneeMonthResponse,
} from '../../core/api/api-models';

/**
 * Mois d'un enfant : grille, barre et détail.
 * Les libellés et les secondes viennent de la lecture. Le préfixe des tests est celui de la page.
 */
@Component({
  selector: 'app-journee-month',
  templateUrl: './journee-month.component.html',
  styleUrl: './journee-month.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneeMonthComponent {
  readonly month = input<JourneeMonthResponse | ParentJourneeMonthResponse | null>(null);
  /** Phrase du jour en cours, déjà écrite par la lecture. Vide : rien sur la case. */
  readonly todayPhrase = input('');
  readonly testId = input.required<string>();
  readonly previous = output<void>();
  readonly next = output<void>();

  readonly opened = signal<JourneeItem | null>(null);
  readonly filter = signal<string | null>(null);
  /** '' garde l'ordre de la lecture. asc / desc trie les lignes visibles par durée. */
  readonly timeOrder = signal<'' | 'asc' | 'desc'>('');

  constructor() {
    effect(() => {
      const shown = this.month();
      const today = (shown?.journees ?? []).find((journee) => journee.today === true) ?? null;
      this.filter.set(null);
      this.timeOrder.set('');
      this.opened.set(shown?.currentMonth === true ? today : null);
    });
  }

  open(journee: JourneeItem): void {
    if (this.opened() !== journee) {
      this.filter.set(null);
      this.timeOrder.set('');
    }
    this.opened.set(journee);
  }

  choose(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.filter.set(raw === '' ? null : raw);
  }

  chooseOrder(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.timeOrder.set(raw === 'asc' || raw === 'desc' ? raw : '');
  }

  choices(journee: JourneeItem): { space: string; label: string }[] {
    const lines = journee.lines ?? [];
    const seen = new Set<string>();
    const choices: { space: string; label: string }[] = [];
    for (const line of lines) {
      const space = groupOf(line.space);
      if (space == null || seen.has(space)) {
        continue;
      }
      seen.add(space);
      choices.push({ space, label: groupLabel(space, lines) });
    }
    return choices;
  }

  visibleLines(journee: JourneeItem): JourneeLineItem[] {
    const lines = journee.lines ?? [];
    const picked = this.filter();
    const shown = picked == null ? lines : lines.filter((line) => groupOf(line.space) === picked);
    const order = this.timeOrder();
    if (order === '') {
      return shown;
    }
    return [...shown].sort((left, right) => {
      const delta = secondsOf(left) - secondsOf(right);
      return order === 'asc' ? delta : -delta;
    });
  }

  shownDuration(journee: JourneeItem): string | undefined {
    return this.filter() == null ? journee.durationLabel : undefined;
  }

  isMuted(lineSpace: string | undefined): boolean {
    const picked = this.filter();
    if (picked == null) {
      return false;
    }
    return groupOf(lineSpace) !== picked;
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
}

function secondsOf(line: JourneeLineItem): number {
  return line.durationSeconds ?? 0;
}

function groupOf(space: string | undefined): string | null {
  if (space == null || space === '') {
    return null;
  }
  if (space === 'question' || space === 'questions') {
    return 'question';
  }
  return space;
}

function groupLabel(space: string, lines: JourneeLineItem[]): string {
  if (space === 'question') {
    return lines.find((line) => line.space === 'questions' && line.label)?.label ?? 'Questions';
  }
  return lines.find((line) => line.space === space && line.label)?.label ?? space;
}
