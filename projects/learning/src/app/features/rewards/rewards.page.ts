import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-rewards-page',
  template: `
    <section class="learn-panel" data-testid="rewards-panel">
      <h1>Récompenses</h1>
      <p>Tes badges arriveront ici.</p>
    </section>
  `,
  styles: `
    :host { display: block; }
    .learn-panel { text-align: center; padding: 24px 8px; }
    h1 { margin: 0 0 8px; font-size: 1.6rem; font-weight: 800; }
    p { margin: 0; color: var(--app-text-muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardsPage {}
