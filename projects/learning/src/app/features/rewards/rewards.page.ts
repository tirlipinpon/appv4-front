import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import type { ChildBadge } from '../../core/api/api-models';
import { BadgeMedalComponent } from '../../shared/badges/badge-medal';
import { ChildBadgesService } from '../../shared/badges/child-badges.service';

@Component({
  selector: 'app-rewards-page',
  imports: [BadgeMedalComponent],
  providers: [ChildBadgesService],
  templateUrl: './rewards.page.html',
  styleUrl: './rewards.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardsPage implements OnInit {
  protected readonly badges = inject(ChildBadgesService);

  ngOnInit(): void {
    this.badges.load();
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
