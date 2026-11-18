import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  /** Vrai quand l'écran est déjà sombre : on propose alors le mode clair. */
  readonly dark = input(false);
  readonly testId = input('');
  readonly toggled = output<void>();

  protected onClick(): void {
    this.toggled.emit();
  }
}
