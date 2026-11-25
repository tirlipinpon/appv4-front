import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import type { ParentChildResponse, ParentProgressResponse, ProgressDayResponse } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { ParentChildrenService } from './data-access/parent-children.service';
import { ParentProgressService } from './data-access/parent-progress.service';

type MissionDay = NonNullable<ParentProgressResponse['dailyMissionDays']>[number];

interface WeekGroup<T> {
  key: string;
  label: string;
  days: T[];
}

interface ChartPoint {
  label: string;
  x: number;
  y: number;
  on: boolean;
}

interface ChartTick {
  label: string;
  x?: number;
  y?: number;
}

/**
 * Page Suivi du parent (ADMIN-83).
 * La courbe, la semaine, la mission et les blocs viennent de la lecture. La page ne calcule pas l'XP.
 */
@Component({
  selector: 'app-parent-suivis-page',
  imports: [SpaceHeader],
  templateUrl: './parent-suivis.page.html',
  styleUrl: './parent-suivis.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentSuivisPage implements OnInit {
  private readonly childrenApi = inject(ParentChildrenService);
  private readonly progressApi = inject(ParentProgressService);

  readonly children = signal<ParentChildResponse[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly progress = signal<ParentProgressResponse | null>(null);
  readonly weekIndex = signal(0);
  readonly missionWeekIndex = signal(0);
  readonly missionPicked = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  private request = 0;

  readonly selected = computed(
    () => this.children().find((child) => child.id === this.selectedId()) ?? null,
  );
  readonly weeks = computed(() => weeksOf(this.progress()?.days ?? []));
  readonly missionWeeks = computed(() => weeksOf(this.progress()?.dailyMissionDays ?? []));
  readonly missionWeek = computed(() => this.missionWeeks()[this.missionWeekIndex()] ?? null);
  readonly missionDay = computed(() => {
    const week = this.missionWeek();
    if (week == null) {
      return null;
    }
    return week.days.find((day) => day.date === this.missionPicked()) ?? week.days[week.days.length - 1] ?? null;
  });
  readonly week = computed(() => this.weeks()[this.weekIndex()] ?? null);
  readonly chart = computed(() => draw(this.progress()?.days ?? [], this.week()?.key ?? null));

  ngOnInit(): void {
    this.childrenApi.load().subscribe({
      next: (body) => {
        const children = body.children ?? [];
        this.children.set(children);
        const first = children[0];
        if (first?.id != null) {
          this.select(first.id);
          return;
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Suivi indisponible.'));
      },
    });
  }

  pick(child: ParentChildResponse): void {
    if (child.id == null) {
      return;
    }
    this.select(child.id);
  }

  select(childId: number): void {
    this.selectedId.set(childId);
    this.load(childId);
  }

  step(delta: number): void {
    const last = this.weeks().length - 1;
    this.weekIndex.set(Math.min(last, Math.max(0, this.weekIndex() + delta)));
  }

  shiftMission(delta: number): void {
    const last = this.missionWeeks().length - 1;
    const next = Math.min(last, Math.max(0, this.missionWeekIndex() + delta));
    this.missionWeekIndex.set(next);
    const days = this.missionWeeks()[next]?.days ?? [];
    const withMission = [...days].reverse().find((day) => day.status != null);
    this.missionPicked.set((withMission ?? days[days.length - 1])?.date ?? null);
  }

  pickMission(day: MissionDay): void {
    this.missionPicked.set(day.date ?? null);
  }

  private openMission(days: MissionDay[]): void {
    const opened = openMissionWeek(days, parisToday());
    this.missionWeekIndex.set(opened.index);
    this.missionPicked.set(opened.picked);
  }

  missionCount(day: MissionDay): string {
    if (day.progress == null || day.target == null) {
      return '—';
    }
    return `${day.progress}/${day.target}`;
  }

  missionNamed(day: MissionDay): boolean {
    return day.statusLabel != null;
  }

  missionTime(value: string | null | undefined): string {
    if (value == null) {
      return '';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(new Date(value));
  }

  missionDate(value: string | null | undefined): string {
    if (value == null) {
      return '';
    }
    return shortDate(value);
  }

  count(value: number | null | undefined): string {
    return value == null ? '—' : String(value);
  }

  failed(day: ProgressDayResponse): boolean {
    return day.failed != null && day.failed > 0;
  }

  hasNumber(value: number | null | undefined): boolean {
    return value != null;
  }

  gained(value: number | null | undefined): string {
    const amount = value ?? 0;
    return amount > 0 ? `+${amount}` : String(amount);
  }

  decimal(value: number | null | undefined): string {
    if (value == null) {
      return '';
    }
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  private load(childId: number): void {
    this.error.set(null);
    this.loading.set(true);
    const request = ++this.request;
    this.progressApi.read(childId).subscribe({
      next: (body) => {
        if (request !== this.request) {
          return;
        }
        this.progress.set(body);
        this.weekIndex.set(Math.max(0, weeksOf(body.days ?? []).length - 1));
        this.openMission(body.dailyMissionDays ?? []);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (request !== this.request) {
          return;
        }
        this.progress.set(null);
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Suivi indisponible.'));
      },
    });
  }
}

function weeksOf<T extends { date?: string }>(days: T[]): WeekGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const day of days) {
    if (day.date == null) {
      continue;
    }
    const key = mondayOf(day.date);
    const list = groups.get(key) ?? [];
    list.push(day);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    label: weekLabel(key),
    days: group,
  }));
}

function openMissionWeek(days: MissionDay[], today: string): { index: number; picked: string | null } {
  const weeks = weeksOf(days);
  const found = weeks.findIndex((week) => week.days.some((day) => day.date === today));
  const index = found >= 0 ? found : Math.max(0, weeks.length - 1);
  const week = weeks[index];
  const todayDay = week?.days.find((day) => day.date === today);
  return { index, picked: todayDay?.date ?? week?.days[week.days.length - 1]?.date ?? null };
}

function parisToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

function mondayOf(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function weekLabel(monday: string): string {
  const sunday = shift(monday, 6);
  return `${shortDate(monday)} – ${shortDate(sunday)}`;
}

function shift(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

function dayLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
  const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date);
  const clean = weekday.replace('.', '');
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)} ${day}`;
}

function draw(days: ProgressDayResponse[], weekKey: string | null): {
  width: number;
  height: number;
  padL: number;
  base: number;
  top: number;
  path: string;
  yTicks: ChartTick[];
  xTicks: ChartTick[];
  points: ChartPoint[];
} | null {
  const dated = days.filter((day): day is ProgressDayResponse & { date: string } => day.date != null);
  if (dated.length === 0) {
    return null;
  }
  const width = 640;
  const height = 210;
  const padL = 44;
  const base = 168;
  const top = 22;
  const peak = Math.max(...dated.map((day) => day.xpTotal ?? 0), 1);
  const step = peak <= 50 ? 10 : 20;
  const max = Math.ceil(peak / step) * step;
  const xAt = (index: number) => padL + (index * (width - padL - 16)) / Math.max(dated.length - 1, 1);
  const yAt = (value: number) => top + (1 - value / max) * (base - top);
  const yTicks: ChartTick[] = [];
  for (let value = 0; value <= max; value += step) {
    yTicks.push({ label: String(value), y: yAt(value) });
  }
  const xTicks = dated
    .map((day, index) => ({ day, index }))
    .filter(({ index }) => index % 7 === 0 || index === dated.length - 1)
    .map(({ day, index }) => ({ label: dayLabel(day.date), x: xAt(index) }));
  return {
    width,
    height,
    padL,
    base,
    top,
    path: dated
      .map((day, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index).toFixed(1)} ${yAt(day.xpTotal ?? 0).toFixed(1)}`)
      .join(' '),
    yTicks,
    xTicks,
    points: dated.map((day, index) => ({
      label: day.date,
      x: xAt(index),
      y: yAt(day.xpTotal ?? 0),
      on: weekKey != null && mondayOf(day.date) === weekKey,
    })),
  };
}
