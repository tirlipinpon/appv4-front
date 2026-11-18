import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type { AvatarChoice } from '../../core/api/api-models';
import { subjectIconGlyph } from './subject-icons';

/**
 * Grille d'icônes matières filtrable par nom (codes = contrat API).
 */
@Component({
  selector: 'app-subject-icon-picker',
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './subject-icon-picker.component.html',
  styleUrl: './subject-icon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectIconPickerComponent {
  readonly choices = input.required<readonly AvatarChoice[]>();
  readonly value = input<string>('');
  readonly disabled = input(false);
  readonly testId = input('subject-icon-picker');
  readonly label = input('Icône');

  readonly valueChange = output<string>();

  readonly query = signal('');
  readonly glyph = subjectIconGlyph;

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.choices();
    if (!q) {
      return list;
    }
    return list.filter((choice) => {
      const code = (choice.code ?? '').toLowerCase();
      const label = (choice.label ?? '').toLowerCase();
      return code.includes(q) || label.includes(q);
    });
  });

  onQuery(raw: string): void {
    this.query.set(raw);
  }

  pick(code: string): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit(code);
  }

  clear(): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit('');
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
