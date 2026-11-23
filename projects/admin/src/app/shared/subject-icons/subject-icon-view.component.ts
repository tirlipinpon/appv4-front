import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { subjectIconGlyph, subjectIconSrc } from './subject-icons';

/** Affiche une icône matière (SVG Iconify ou emoji legacy). */
@Component({
  selector: 'app-subject-icon-view',
  template: `
    @if (src(); as url) {
      <img class="icon" [src]="url" alt="" aria-hidden="true" loading="lazy" />
    } @else if (glyph(); as emoji) {
      <span class="glyph" aria-hidden="true">{{ emoji }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      vertical-align: middle;
    }
    .icon {
      width: 1.25em;
      height: 1.25em;
      object-fit: contain;
    }
    .glyph {
      font-size: 1.15em;
      line-height: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectIconViewComponent {
  readonly code = input<string | null | undefined>(null);

  readonly src = computed(() => subjectIconSrc(this.code()));
  readonly glyph = computed(() => subjectIconGlyph(this.code()));
}
