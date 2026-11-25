/**
 * THROWAWAY PROTOTYPE switcher. Not part of the product.
 */
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
} from '@angular/core';

export interface PrototypeChoice {
  key: string;
  name: string;
}

@Component({
  selector: 'app-prototype-switcher',
  template: `
    <div class="proto-bar" data-testid="prototype-switcher">
      <div class="proto-row">
        <button type="button" (click)="step.emit(-1)" aria-label="Variante précédente">←</button>
        <p>{{ current() }} ({{ name() }})</p>
        <button type="button" (click)="step.emit(1)" aria-label="Variante suivante">→</button>
      </div>
      @if (scenarios().length > 0) {
        <div class="proto-row proto-scenarios">
          @for (item of scenarios(); track item.key) {
            <button
              type="button"
              [class.on]="item.key === scenario()"
              (click)="scenarioChange.emit(item.key)"
            >
              {{ item.name }}
            </button>
          }
        </div>
      }
      <p class="proto-state">{{ state() }}</p>
    </div>
  `,
  styles: `
    .proto-bar {
      position: fixed;
      z-index: 80;
      left: 50%;
      bottom: 12px;
      transform: translateX(-50%);
      width: min(36rem, calc(100% - 16px));
      padding: 8px 10px;
      border-radius: 18px;
      background: #111;
      color: #fff;
      box-shadow: 0 10px 30px #0008;
    }
    .proto-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .proto-row p {
      margin: 0;
      font-weight: 800;
      text-align: center;
    }
    button {
      border: 0;
      border-radius: 999px;
      background: #fff;
      color: #111;
      font: inherit;
      font-weight: 800;
      padding: 6px 10px;
      cursor: pointer;
    }
    .proto-scenarios {
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .proto-scenarios button.on {
      background: #c1b4ff;
    }
    .proto-state {
      margin: 6px 0 0;
      font-size: 0.75rem;
      text-align: center;
      color: #ddd;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrototypeSwitcher {
  readonly choices = input.required<readonly PrototypeChoice[]>();
  readonly current = input.required<string>();
  readonly state = input('');
  readonly scenarios = input<readonly PrototypeChoice[]>([]);
  readonly scenario = input('');
  readonly step = output<number>();
  readonly scenarioChange = output<string>();

  protected name(): string {
    return this.choices().find((choice) => choice.key === this.current())?.name ?? '';
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
    }
    if (event.key === 'ArrowLeft') {
      this.step.emit(-1);
    }
    if (event.key === 'ArrowRight') {
      this.step.emit(1);
    }
  }
}
