/**
 * THROWAWAY PROTOTYPE on the existing Classement route.
 * Three variants of the child ranking, switchable with ?variant=.
 * The placeholder remains outside dev builds.
 */
import { isDevMode, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import {
  ProtoScenario,
  buildRanking,
  rankingStateLine,
} from './prototype/ranking-prototype.data';
import { PrototypeChoice, PrototypeSwitcher } from './prototype/prototype-switcher';
import { VariantPiste } from './prototype/variant-piste';
import { VariantPodium } from './prototype/variant-podium';
import { VariantPortraits } from './prototype/variant-portraits';

const CHOICES: readonly PrototypeChoice[] = [
  { key: 'podium', name: 'Podium' },
  { key: 'piste', name: 'Piste' },
  { key: 'portraits', name: 'Portraits' },
];

const SCENARIOS: readonly PrototypeChoice[] = [
  { key: 'normal', name: 'Normal' },
  { key: 'ecole', name: 'Sans école' },
  { key: 'cache', name: 'Caché' },
  { key: 'seul', name: 'Seul' },
];

@Component({
  selector: 'app-ranking-page',
  imports: [VariantPodium, VariantPiste, VariantPortraits, PrototypeSwitcher],
  template: `
    @if (dev) {
      @switch (variant()) {
        @case ('piste') {
          <app-variant-piste [view]="view()" (pick)="scope.set($event)" />
        }
        @case ('portraits') {
          <app-variant-portraits [view]="view()" (pick)="scope.set($event)" />
        }
        @default {
          <app-variant-podium [view]="view()" (pick)="scope.set($event)" />
        }
      }
      <app-prototype-switcher
        [choices]="choices"
        [current]="variant()"
        [state]="stateLine()"
        [scenarios]="scenarios"
        [scenario]="scenario()"
        (step)="move($event)"
        (scenarioChange)="setScenario($event)"
      />
    } @else {
      <section class="learn-panel" data-testid="ranking-panel">
        <h1>Classement</h1>
        <p>Le classement arrive bientôt.</p>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .learn-panel { text-align: center; padding: 24px 8px; }
    h1 { margin: 0 0 8px; font-size: 1.6rem; font-weight: 800; }
    p { margin: 0; color: var(--app-text-muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly dev = isDevMode();
  protected readonly choices = CHOICES;
  protected readonly scenarios = SCENARIOS;
  protected readonly scope = signal('classe');
  protected readonly scenario = signal<ProtoScenario>('normal');
  private readonly variantParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('variant') ?? 'podium')),
    { initialValue: 'podium' },
  );

  protected readonly variant = computed(() => {
    const key = this.variantParam();
    return CHOICES.some((choice) => choice.key === key) ? key : 'podium';
  });

  protected readonly view = computed(() => buildRanking(this.scope(), this.scenario()));
  protected readonly stateLine = computed(() => rankingStateLine(this.view()));

  protected move(delta: number): void {
    const keys = CHOICES.map((choice) => choice.key);
    const index = keys.indexOf(this.variant());
    const next = keys[(index + delta + keys.length) % keys.length];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: next },
      queryParamsHandling: 'merge',
    });
  }

  protected setScenario(key: string): void {
    if (key === 'normal' || key === 'ecole' || key === 'cache' || key === 'seul') {
      this.scenario.set(key);
    }
  }
}
