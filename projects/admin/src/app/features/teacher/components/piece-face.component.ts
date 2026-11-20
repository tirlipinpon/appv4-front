import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { preparePhoto } from '../../../shared/prepare-photo/prepare-photo';

/**
 * Une face de pièce : texte ou image, jamais les deux.
 * Le parent garde le brouillon ; ce composant prépare le fichier WebP.
 */
@Component({
  selector: 'app-piece-face',
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './piece-face.component.html',
  styleUrl: './piece-face.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieceFaceComponent {
  readonly legend = input.required<string>();
  readonly text = input('');
  readonly imageDataUrl = input<string | undefined>(undefined);
  readonly hasImage = input(false);
  readonly disabled = input(false);

  readonly textChange = output<string>();
  readonly face = output<'text' | 'image'>();
  readonly imagePending = output<void>();
  readonly imageReady = output<string>();
  readonly imageFailed = output<string>();

  imageMode(): boolean {
    return this.hasImage() || this.imageDataUrl() != null;
  }

  onText(event: Event): void {
    const target = event.target;
    this.textChange.emit(target instanceof HTMLInputElement ? target.value : '');
  }

  onFile(event: Event): void {
    const input = event.target;
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      return;
    }
    this.imagePending.emit();
    preparePhoto(file, 256)
      .then((photo) => this.imageReady.emit(photo.dataUrl))
      .catch((error: unknown) => {
        if (input instanceof HTMLInputElement) {
          input.value = '';
        }
        this.imageFailed.emit(error instanceof Error ? error.message : 'Image refusée.');
      });
  }
}
