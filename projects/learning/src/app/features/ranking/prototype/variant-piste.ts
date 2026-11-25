/**
 * THROWAWAY. Variant B: scopes down the side, each child is a race lane.
 */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProtoView } from './ranking-prototype.data';

@Component({
  selector: 'app-variant-piste',
  template: `
    <section class="race">
      <nav>
        @for (scope of view().scopes; track scope.code) {
          <button type="button" [class.on]="scope.code === view().scope" (click)="pick.emit(scope.code)">
            {{ scope.label }}
          </button>
        }
      </nav>
      <div>
        <h1>{{ view().groupLabel || 'Classement' }}</h1>
        @if (view().phrase; as phrase) {
          <p class="phrase">{{ phrase }}</p>
        }
        <div class="lanes">
          @for (card of view().cards; track card.firstName) {
            <article [class.mine]="card.mine">
              <span class="face">{{ card.face }}</span>
              <div class="track">
                <span class="fill" [style.width.%]="width(card.xp)"></span>
                <span class="name">{{ card.firstName }}</span>
              </div>
              <b>{{ card.place }}</b>
              <small>{{ card.xp }}</small>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .race {
      display: grid;
      grid-template-columns: 7.5rem 1fr;
      gap: 12px;
      padding-bottom: 8rem;
      color: var(--app-text, #f5f5ff);
    }
    nav { display: grid; gap: 6px; align-content: start; }
    nav button {
      border: 0;
      border-radius: 12px;
      padding: 10px 6px;
      background: #241c40;
      color: inherit;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 800;
    }
    nav button.on { background: #7c5cff; }
    h1 { margin: 0 0 8px; font-size: 1.3rem; }
    .phrase { margin: 0 0 8px; font-weight: 800; }
    .lanes { display: grid; gap: 8px; }
    article {
      display: grid;
      grid-template-columns: 2rem 1fr auto auto;
      gap: 6px;
      align-items: center;
    }
    article.mine .fill { background: #ffe08a; }
    .face { font-size: 1.4rem; }
    .track {
      position: relative;
      height: 2rem;
      border-radius: 999px;
      background: #1c1830;
      overflow: hidden;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: #6d5efc;
    }
    .name {
      position: relative;
      display: block;
      padding: 6px 10px;
      font-weight: 800;
    }
    b { font-size: 1.2rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantPiste {
  readonly view = input.required<ProtoView>();
  readonly pick = output<string>();

  private readonly maxXp = computed(() =>
    Math.max(1, ...this.view().cards.map((card) => card.xp)),
  );

  protected width(xp: number): number {
    return Math.max(12, Math.round((xp / this.maxXp()) * 100));
  }
}
