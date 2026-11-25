/**
 * THROWAWAY copy of the learning switcher, so the admin prototype stays local.
 */
import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

export interface PrototypeChoice {
  key: string;
  name: string;
}

@Component({
  selector: 'app-prototype-switcher',
  template: `
    <div class="proto-bar">
      <div class="proto-row">
        <button type="button" (click)="step.emit(-1)" aria-label="Variante précédente">←</button>
        <p>{{ current() }} ({{ label() }})</p>
        <button type="button" (click)="step.emit(1)" aria-label="Variante suivante">→</button>
      </div>
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
    .proto-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .proto-row p, .proto-state { margin: 0; text-align: center; }
    .proto-row p { font-weight: 800; }
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
    .proto-state { margin-top: 6px; font-size: 0.75rem; color: #ddd; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrototypeSwitcher {
  readonly choices = input.required<readonly PrototypeChoice[]>();
  readonly current = input.required<string>();
  readonly state = input('');
  readonly step = output<number>();

  protected label(): string {
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
