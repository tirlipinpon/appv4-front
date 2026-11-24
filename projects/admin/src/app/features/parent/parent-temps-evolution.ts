/**
 * Courbe d'évolution par espace.
 * Choix retenu : variante C du prototype `prototype/temps-evolution`
 * (une courbe par espace, période libre, axes gradués).
 * Les jours sans activité valent 0. Les secondes viennent des journées déjà lues.
 */
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import type { JourneeMonthResponse } from '../../core/api/api-models';

const SPACES = [
  { code: 'accueil', label: 'Accueil', color: '#2f6fed' },
  { code: 'matieres', label: 'Matières', color: '#0f8a8a' },
  { code: 'board', label: 'Board', color: '#2f9e44' },
  { code: 'question', label: 'Questions', color: '#7b4fd4' },
  { code: 'recompenses', label: 'Récompenses', color: '#d4a017' },
  { code: 'classement', label: 'Classement', color: '#d4537e' },
  { code: 'profil', label: 'Profil', color: '#5c6b7a' },
] as const;

interface DayPoint { day: number; iso: string; seconds: Record<string, number> };

@Component({
  selector: 'app-parent-temps-evolution',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="evolution" data-testid="parent-temps-evolution">
      <h2>Évolution</h2>
      <div class="controls">
        <label>
          Raccourci
          <select data-testid="parent-temps-period" [value]="period()" (change)="setPeriod($event)">
            <option value="7">7 jours</option>
            <option value="30">Ce mois</option>
          </select>
        </label>
        <label>
          Du
          <input data-testid="parent-temps-from" type="date" [value]="from()" (change)="setFrom($event)" />
        </label>
        <label>
          Au
          <input data-testid="parent-temps-to" type="date" [value]="to()" (change)="setTo($event)" />
        </label>
      </div>
      <div class="grid">
        @for (card of cards(); track card.code) {
          <article>
            <header>
              <strong>{{ card.label }}</strong>
              <span [attr.data-sign]="card.sign">{{ card.delta }}</span>
            </header>
            <svg viewBox="0 0 360 150" role="img" [attr.aria-label]="'Courbe ' + card.label">
              <line x1="44" y1="12" x2="44" y2="112" stroke="#8b97a8" />
              <line x1="44" y1="112" x2="344" y2="112" stroke="#8b97a8" />
              @for (tick of card.yTicks; track tick.label) {
                <line [attr.x1]="40" [attr.x2]="44" [attr.y1]="tick.y" [attr.y2]="tick.y" stroke="#8b97a8" />
                <text [attr.x]="36" [attr.y]="tick.y + 3" text-anchor="end">{{ tick.label }}</text>
              }
              @for (tick of card.xTicks; track tick.x) {
                <line [attr.x1]="tick.x" [attr.x2]="tick.x" y1="112" y2="116" stroke="#8b97a8" />
                <text [attr.x]="tick.x" y="130" text-anchor="middle">{{ tick.label }}</text>
              }
              <path [attr.d]="card.path" [attr.stroke]="card.color" fill="none" stroke-width="2" />
            </svg>
          </article>
        }
      </div>
    </section>
  `,
  styles: `
    .evolution { margin-top: 1.5rem; }
    h2 { margin: 0 0 0.75rem; font-size: 1.15rem; }
    .controls { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-bottom: 0.75rem; color: var(--app-text-muted); }
    select, input { margin-left: 0.4rem; border: 1px solid var(--app-outline); border-radius: 999px; padding: 0.25rem 0.7rem; font: inherit; color: var(--app-text); background: var(--app-surface-card); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 0.6rem; }
    article { border: 1px solid var(--app-outline); border-radius: 0.8rem; padding: 0.6rem 0.8rem; background: var(--app-surface-card); }
    header { display: flex; justify-content: space-between; gap: 0.5rem; }
    [data-sign='plus'] { color: #2f9e44; }
    [data-sign='moins'] { color: #9b1c1c; }
    svg { width: 100%; height: auto; }
    text { font-size: 9px; fill: #5c6b7a; }
  `,
})
export class ParentTempsEvolution {
  readonly month = input<JourneeMonthResponse | null>(null);
  readonly period = signal(30);
  readonly from = signal('');
  readonly to = signal('');

  private readonly days = computed(() => daysOf(this.month()));
  private readonly endDay = computed(
    () => (this.month()?.journees ?? []).find((journee) => journee.today === true)?.day ?? null,
  );
  private readonly window = computed(() => {
    const from = this.from();
    const to = this.to();
    if (from !== '' && to !== '') {
      const start = from <= to ? from : to;
      const end = from <= to ? to : from;
      return this.days().filter((day) => day.iso >= start && day.iso <= end);
    }
    return sliceTo(this.days(), this.endDay(), this.period());
  });

  setPeriod(event: Event): void {
    this.from.set('');
    this.to.set('');
    this.period.set(Number((event.target as HTMLSelectElement).value));
  }

  setFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  setTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  cards(): CurveCard[] {
    const days = this.window();
    return SPACES.map((space) => {
      const max = Math.max(60, ...days.map((day) => day.seconds[space.code] ?? 0));
      const plot = plotBox(days.length);
      const path = days
        .map((day, index) => {
          const x = plot.x(index);
          const y = plot.y((day.seconds[space.code] ?? 0) / max);
          return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
      const mid = Math.floor(days.length / 2);
      const before = days.slice(0, mid).reduce((sum, day) => sum + (day.seconds[space.code] ?? 0), 0);
      const after = days.slice(mid).reduce((sum, day) => sum + (day.seconds[space.code] ?? 0), 0);
      const gap = after - before;
      return {
        code: space.code,
        label: space.label,
        color: space.color,
        path,
        delta: `${gap >= 0 ? '+' : '−'}${minuteLabel(Math.abs(gap))}`,
        sign: gap > 0 ? 'plus' : gap < 0 ? 'moins' : 'nul',
        yTicks: [0, 0.5, 1].map((step) => ({ y: plot.y(step), label: axisLabel(max * step) })),
        xTicks: plot.xTicks(days),
      };
    });
  }
}

interface CurveCard {
  code: string;
  label: string;
  color: string;
  path: string;
  delta: string;
  sign: string;
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
};

function daysOf(month: JourneeMonthResponse | null): DayPoint[] {
  if (month?.year == null || month.month == null) {
    return [];
  }
  const count = new Date(month.year, month.month, 0).getDate();
  const byDay = new Map<number, Record<string, number>>();
  for (const journee of month.journees ?? []) {
    if (journee.day == null) {
      continue;
    }
    const seconds: Record<string, number> = {};
    for (const line of journee.lines ?? []) {
      const code = line.space === 'questions' ? 'question' : line.space;
      if (code == null || code === '') {
        continue;
      }
      seconds[code] = (seconds[code] ?? 0) + (line.durationSeconds ?? 0);
    }
    byDay.set(journee.day, seconds);
  }
  const days: DayPoint[] = [];
  for (let day = 1; day <= count; day += 1) {
    const iso = `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({ day, iso, seconds: byDay.get(day) ?? {} });
  }
  return days;
}

function sliceTo(days: DayPoint[], endDay: number | null, length: number): DayPoint[] {
  if (days.length === 0) {
    return [];
  }
  const end = endDay ?? days[days.length - 1].day;
  const start = Math.max(1, end - length + 1);
  return days.filter((day) => day.day >= start && day.day <= end);
}

function minuteLabel(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

function axisLabel(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} s`;
  }
  return `${Math.round(seconds / 60)} min`;
}

function plotBox(count: number): {
  x: (index: number) => number;
  y: (ratio: number) => number;
  xTicks: (days: DayPoint[]) => { x: number; label: string }[];
} {
  const left = 44;
  const right = 344;
  const top = 12;
  const bottom = 112;
  const span = Math.max(1, count - 1);
  return {
    x: (index) => left + (index * (right - left)) / span,
    y: (ratio) => bottom - ratio * (bottom - top),
    xTicks: (days) => {
      if (days.length === 0) {
        return [];
      }
      const indexes =
        days.length <= 6 ? days.map((_, index) => index) : [0, Math.floor((days.length - 1) / 2), days.length - 1];
      return indexes.map((index) => ({
        x: left + (index * (right - left)) / span,
        label: `${days[index].iso.slice(8, 10)}/${days[index].iso.slice(5, 7)}`,
      }));
    },
  };
}
