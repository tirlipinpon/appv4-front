import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';

@Component({
  selector: 'app-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-field.component.html',
})
export class TextFieldComponent {
  readonly label = input.required<string>();
  readonly value = model('');
  readonly type = input<'text' | 'password'>('text');
  readonly icon = input<'name' | 'lock'>('name');
  readonly testId = input('');
  readonly autocomplete = input('off');
  readonly maxlength = input<number | null>(null);
  readonly inputMode = input('');
  readonly reveal = input(false);

  protected readonly shown = signal(false);

  protected fieldType(): 'text' | 'password' {
    if (this.type() === 'password' && this.shown()) {
      return 'text';
    }
    return this.type();
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected toggleShown(): void {
    this.shown.update((value) => !value);
  }
}
