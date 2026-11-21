import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import type { ChildBadge } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { BadgeMedalComponent } from '../../shared/badges/badge-medal';
import { ChildBadgesService } from './data-access/child-badges.service';

@Component({
  selector: 'app-rewards-page',
  imports: [BadgeMedalComponent],
  templateUrl: './rewards.page.html',
  styleUrl: './rewards.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardsPage implements OnInit {
  private readonly badgesApi = inject(ChildBadgesService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly badges = this.badgesApi.badges;

  ngOnInit(): void {
    this.badgesApi.load().subscribe({
      next: () => {
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger les badges.'));
      },
    });
  }

  protected hasGauge(badge: ChildBadge): boolean {
    return badge.nextThreshold != null && badge.progressValue != null;
  }

  protected gaugeWidth(badge: ChildBadge): number {
    const next = badge.nextThreshold ?? 0;
    const value = badge.progressValue ?? 0;
    if (next <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((value / next) * 100));
  }
}
