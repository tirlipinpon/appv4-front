import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { ChildTodayMission, ChildTodayTask } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildHomeBadgesService } from './data-access/child-home-badges.service';
import { ChildProgressService } from './data-access/child-progress.service';
import { ChildTodayService } from './data-access/child-today.service';

const WEEK_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/**
 * Accueil : progression (LEARN-31), mission (LEARN-32) et reprise (LEARN-33).
 * Affiche uniquement ce que les API progress et today renvoient.
 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly progressApi = inject(ChildProgressService);
  private readonly todayApi = inject(ChildTodayService);
  private readonly badgesApi = inject(ChildHomeBadgesService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly progress = this.progressApi.progress;
  protected readonly weekLabels = WEEK_LABELS;

  protected readonly todayLoading = signal(true);
  protected readonly todayError = signal<string | null>(null);
  protected readonly today = this.todayApi.today;
  protected readonly badgesLoading = signal(true);
  protected readonly badgesError = signal<string | null>(null);
  protected readonly badges = this.badgesApi.badges;

  protected readonly weekCells = computed(() => {
    const days = this.progress()?.weekDays ?? [];
    return WEEK_LABELS.map((label, index) => ({
      label,
      played: days[index] === true,
    }));
  });

  /**
   * Carte « Continuer » : prochaine tâche jouable de GET /today (LEARN-33).
   * Absente si la mission est vide ou terminée.
   */
  protected readonly continueModule = computed(() => {
    const mission = this.today()?.mission;
    if (mission == null || mission.playable !== true) {
      return null;
    }
    const task = (mission.tasks ?? []).find((row) => row.playable === true) ?? null;
    const commands = this.missionPlayCommands(mission);
    if (commands === null) {
      return null;
    }
    return {
      title: task?.label ?? mission.objective ?? 'Continuer',
      statusLabel: mission.statusLabel ?? null,
      progress: mission.progress ?? 0,
      target: mission.target ?? 0,
      commands,
    };
  });

  ngOnInit(): void {
    this.progressApi.load().subscribe({
      next: () => {
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger la progression.'));
      },
    });
    this.todayApi.load().subscribe({
      next: () => {
        this.todayLoading.set(false);
        this.todayError.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.todayLoading.set(false);
        this.todayError.set(apiErrorMessage(err, 'Impossible de charger la mission.'));
      },
    });
    this.badgesApi.load().subscribe({
      next: () => {
        this.badgesLoading.set(false);
        this.badgesError.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.badgesLoading.set(false);
        this.badgesError.set(apiErrorMessage(err, 'Impossible de charger les badges.'));
      },
    });
  }

  protected barWidth(mission: ChildTodayMission): number {
    const target = mission.target ?? 0;
    const progress = mission.progress ?? 0;
    if (target <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((progress / target) * 100));
  }

  protected remainingLabel(mission: ChildTodayMission): string | null {
    const seconds = mission.secondsRemaining;
    if (seconds == null || seconds < 0) {
      return null;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }
    return `${minutes} min`;
  }

  protected playCommands(task: ChildTodayTask): (string | number)[] | null {
    if (task.playable !== true || task.subjectId == null || task.questionId == null) {
      return null;
    }
    return ['/learn', task.subjectId, 'play', task.questionId];
  }

  protected missionPlayCommands(mission: ChildTodayMission): (string | number)[] | null {
    if (mission.playable !== true || mission.playSubjectId == null || mission.playQuestionId == null) {
      return null;
    }
    return ['/learn', mission.playSubjectId, 'play', mission.playQuestionId];
  }
}
