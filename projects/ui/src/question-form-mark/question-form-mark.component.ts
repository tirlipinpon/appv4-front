import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Pastille d'une forme de question : dessin + libellé + teinte venus de l'API.
 * Un code de dessin inconnu n'affiche que le libellé.
 */
@Component({
  selector: 'app-question-form-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-form-mark.component.html',
  styleUrl: './question-form-mark.component.scss',
})
export class QuestionFormMarkComponent {
  readonly iconCode = input<string | null | undefined>(null);
  readonly color = input<string | null | undefined>(null);
  readonly label = input('');

  protected readonly tint = computed(() => {
    const color = this.color();
    return color && HEX.test(color) ? color : null;
  });

  protected readonly glyph = computed(() => {
    const code = this.iconCode();
    return code && GLYPHS.has(code) ? code : null;
  });
}

const GLYPHS = new Set([
  'checklist',
  'cards',
  'sort',
  'true-false',
  'link',
  'gap',
  'columns',
  'simon',
  'image-click',
  'letters',
  'puzzle',
  'text',
]);
