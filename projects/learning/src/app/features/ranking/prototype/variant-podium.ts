/**
 * THROWAWAY. Variant A: a podium for the first three, then a short list.
 */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProtoView } from './ranking-prototype.data';

@Component({
  selector: 'app-variant-podium',
  template: `
    <section class="pod">
      <p class="kicker">Classement</p>
      <h1>{{ view().groupLabel || 'Classement' }}</h1>
      <div class="chips">
        @for (scope of view().scopes; track scope.code) {
          <button type="button" [class.on]="scope.code === view().scope" (click)="pick.emit(scope.code)">
            {{ scope.label }}
          </button>
        }
      </div>
      @if (view().phrase; as phrase) {
        <p class="phrase">{{ phrase }}</p>
      }
      @if (steps().length > 0) {
        <div class="steps">
          @for (card of steps(); track card.firstName) {
            <article [class.tall]="card === leader()" [class.mine]="card.mine">
              <span class="face">{{ card.face }}</span>
              <strong>{{ card.place }}</strong>
              <p>{{ card.firstName }}</p>
              <p class="xp">{{ card.xp }} XP</p>
            </article>
          }
        </div>
      }
      @if (rest().length > 0) {
        <ol>
          @for (card of rest(); track card.firstName) {
            <li [class.mine]="card.mine">
              <span class="place">{{ card.place }}</span>
              <span class="row-face">{{ card.face }}</span>
              <div class="track">
                <span class="fill" [style.width.%]="width(card.xp)"></span>
                <span class="name">{{ card.firstName }}</span>
              </div>
              <b>{{ card.xp }}</b>
            </li>
          }
        </ol>
      }
    </section>
  `,
  styles: `
    .pod { padding-bottom: 8rem; color: var(--app-text, #f5f5ff); }
    .kicker { margin: 0; text-align: center; opacity: 0.7; }
    h1 { margin: 0 0 12px; text-align: center; font-size: 1.6rem; }
    .chips { display: flex; gap: 8px; overflow: auto; margin-bottom: 16px; }
    .chips button, .phrase {
      border: 0;
      border-radius: 999px;
      padding: 8px 12px;
      background: #2a2348;
      color: inherit;
      font: inherit;
      font-weight: 800;
    }
    .chips button.on { background: #7c5cff; }
    .phrase { text-align: center; }
    .steps {
      display: grid;
      grid-template-columns: 1fr 1.15fr 1fr;
      align-items: end;
      gap: 8px;
      margin: 18px 0;
    }
    .steps article {
      text-align: center;
      padding: 10px 6px;
      border-radius: 18px 18px 8px 8px;
      background: #241c40;
    }
    .steps article.tall { padding-top: 22px; background: #6d5efc; }
    .steps article.mine { outline: 3px solid #ffe08a; }
    .face { font-size: 2rem; }
    .xp, p { margin: 0; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li {
      display: grid;
      grid-template-columns: 2rem 2rem 1fr auto;
      gap: 8px;
      align-items: center;
    }
    .row-face { font-size: 1.4rem; }
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
    li.mine .fill { background: #ffe08a; }
    .name {
      position: relative;
      display: block;
      padding: 6px 10px;
      font-weight: 800;
    }
    li.mine { outline: 3px solid #ffe08a; border-radius: 12px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantPodium {
  readonly view = input.required<ProtoView>();
  readonly pick = output<string>();

  protected readonly steps = computed(() => {
    const top = this.view().cards.filter((card) => !card.pinned).slice(0, 3);
    if (top.length < 3) {
      return top;
    }
    return [top[1], top[0], top[2]];
  });

  protected readonly leader = computed(() => this.view().cards.find((card) => !card.pinned) ?? null);

  private readonly maxXp = computed(() => Math.max(1, ...this.view().cards.map((card) => card.xp)));

  protected width(xp: number): number {
    return Math.max(12, Math.round((xp / this.maxXp()) * 100));
  }

  protected readonly rest = computed(() => {
    const skipped = new Set(this.view().cards.filter((card) => !card.pinned).slice(0, 3).map((card) => card.firstName));
    return this.view().cards.filter((card) => !skipped.has(card.firstName) || card.pinned);
  });
}
