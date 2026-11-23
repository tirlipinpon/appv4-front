import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
})
export class ButtonComponent {
  readonly disabled = input(false);
  readonly testId = input('');
  readonly kind = input<'submit' | 'button'>('submit');
}
