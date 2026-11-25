/**
 * THROWAWAY. Variant C: scope tiles, one huge self card, others as a portrait reel.
 */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProtoCard, ProtoView } from './ranking-prototype.data';

@Component({
  selector: 'app-variant-portraits',
  template: `
    <section class="reel">
      <div class="tiles">
        @for (scope of view().scopes; track scope.code) {
          <button type="button" [class.on]="scope.code === view().scope" (click)="pick.emit(scope.code)">
            {{ scope.label }}
          </button>
        }
      </div>
      <p class="group">{{ view().groupLabel }}</p>
      @if (mine(); as card) {
        <article class="hero">
          <span>{{ card.face }}</span>
          <p>Place {{ card.place }}</p>
          <h1>{{ card.firstName }}</h1>
          <p>{{ card.xp }} XP</p>
        </article>
      }
      @if (view().phrase; as phrase) {
        <p class="bubble">{{ phrase }}</p>
      }
      @if (others().length > 0) {
        <div class="strip">
          @for (card of others(); track card.firstName) {
            <article>
              <span>{{ card.face }}</span>
              <strong>{{ card.place }}</strong>
              <p>{{ card.firstName }}</p>
              <p>{{ card.xp }}</p>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .reel { padding-bottom: 8rem; color: var(--app-text, #f5f5ff); }
    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .tiles button {
      min-height: 4.2rem;
      border: 0;
      border-radius: 16px;
      background: #241c40;
      color: inherit;
      font: inherit;
      font-weight: 800;
    }
    .tiles button.on { background: #7c5cff; }
    .group { text-align: center; font-weight: 800; }
    .hero, .bubble {
      text-align: center;
      border-radius: 28px;
      background: #6d5efc;
      padding: 16px;
    }
    .hero span { font-size: 4rem; }
    .hero h1, .hero p, .bubble { margin: 0; }
    .bubble { margin-top: 10px; background: #2a2348; font-weight: 800; }
    .strip {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      margin-top: 14px;
      scroll-snap-type: x mandatory;
    }
    .strip article {
      flex: 0 0 8rem;
      scroll-snap-align: start;
      text-align: center;
      padding: 12px 8px;
      border-radius: 20px;
      background: #1c1830;
    }
    .strip span { font-size: 2.4rem; }
    .strip p { margin: 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantPortraits {
  readonly view = input.required<ProtoView>();
  readonly pick = output<string>();

  protected readonly mine = computed(() => this.view().cards.find((card) => card.mine) ?? null);

  protected readonly others = computed(() =>
    this.view().cards.filter((card: ProtoCard) => !card.mine),
  );
}
