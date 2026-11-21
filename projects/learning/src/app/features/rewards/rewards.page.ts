import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import type { ChildBadge } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildBadgesService } from './data-access/child-badges.service';

@Component({
  selector: 'app-rewards-page',
  template: `
    <section class="learn-panel" data-testid="rewards-panel">
      <h1>Récompenses</h1>
      @if (loading()) {
        <p data-testid="rewards-loading">Chargement…</p>
      } @else if (error()) {
        <p class="rewards-error" data-testid="rewards-error">{{ error() }}</p>
      } @else if (badges(); as collection) {
        @if (collection.notice?.label) {
          <p data-testid="rewards-notice">{{ collection.notice.label }}</p>
        }
        <ul class="rewards-list" data-testid="rewards-list">
          @for (badge of collection.badges ?? []; track badge.code) {
            <li class="rewards-card" [attr.data-testid]="'reward-' + badge.code">
              <p class="rewards-name">{{ badge.name }}</p>
              <p class="rewards-level">Niveau {{ badge.level }}</p>
              @if (hasGauge(badge)) {
                <p class="rewards-gauge" [attr.data-testid]="'reward-gauge-' + badge.code">
                  {{ badge.retainedValue }} / {{ badge.nextThreshold }}
                </p>
              }
              @if (badge.unlockedOn) {
                <p class="rewards-date" [attr.data-testid]="'reward-date-' + badge.code">{{ badge.unlockedOn }}</p>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .learn-panel { padding: 24px 8px; }
    h1 { margin: 0 0 16px; font-size: 1.6rem; font-weight: 800; text-align: center; }
    .rewards-error { color: #ff8a9a; text-align: center; }
    .rewards-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .rewards-card {
      padding: 14px 16px;
      border-radius: 16px;
      background: color-mix(in srgb, var(--app-text, #fff) 8%, transparent);
    }
    .rewards-name { margin: 0; font-weight: 800; }
    .rewards-level, .rewards-gauge, .rewards-date { margin: 4px 0 0; }
  `,
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
    return badge.nextThreshold != null && badge.retainedValue != null;
  }
}
