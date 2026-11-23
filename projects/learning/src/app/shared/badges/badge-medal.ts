import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Médaille d'un badge déjà nommé par l'API.
 * Le dessin dépend du code renvoyé. Un code inconnu reste une médaille neutre.
 */
@Component({
  selector: 'app-badge-medal',
  template: `
    <span class="medal" [class.medal--won]="won()" [class.medal--sm]="size() === 'sm'" [attr.data-kind]="code()">
      <span class="medal-ribbon" aria-hidden="true"></span>
      <span class="medal-disc">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          @switch (code()) {
            @case ('premiere_etoile_jaune') {
              <polygon points="32,8 38,24 56,24 42,34 47,52 32,42 17,52 22,34 8,24 26,24" />
            }
            @case ('matiere_au_jaune') {
              <path d="M14 18h36v30H14z" />
              <path d="M14 18l18 8 18-8" />
              <polygon points="32,30 36,38 44,39 38,45 40,53 32,49 24,53 26,45 20,39 28,38" />
            }
            @case ('etoiles_jaunes') {
              <polygon points="20,14 23,22 32,22 25,27 27,36 20,31 13,36 15,27 8,22 17,22" />
              <polygon points="44,14 47,22 56,22 49,27 51,36 44,31 37,36 39,27 32,22 41,22" />
              <polygon points="32,32 36,42 47,42 38,48 41,59 32,53 23,59 26,48 17,42 28,42" />
            }
            @case ('rattrapage') {
              <path d="M18 44c8-16 20-22 28-24" />
              <polygon points="44,12 54,18 42,22" />
              <polygon points="24,40 28,50 36,51 30,56 32,64 24,60 16,64 18,56 12,51 20,50" />
            }
            @case ('bonnes_reponses_affilee') {
              <polygon points="34,6 18,34 30,34 26,58 48,28 36,28" />
            }
            @case ('bonnes_reponses_du_jour') {
              <circle cx="32" cy="32" r="12" />
              <path d="M32 8v8M32 48v8M8 32h8M48 32h8M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6" />
            }
            @case ('jours_affilee') {
              <path d="M32 10c8 10 16 16 16 26a16 16 0 1 1-32 0c0-10 8-16 16-26z" />
            }
            @case ('jours_joues') {
              <rect x="14" y="16" width="36" height="34" rx="6" />
              <path d="M14 26h36M24 12v10M40 12v10" />
              <circle cx="26" cy="36" r="3" />
              <circle cx="38" cy="36" r="3" />
              <circle cx="32" cy="44" r="3" />
            }
            @case ('missions_terminees') {
              <path d="M18 12h28v34l-14-8-14 8z" />
              <path d="M24 28l6 6 12-14" />
            }
            @default {
              <circle cx="32" cy="32" r="14" />
            }
          }
        </svg>
        @if (won()) {
          <span class="medal-level">{{ level() }}</span>
        }
      </span>
    </span>
  `,
  styleUrl: './badge-medal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeMedalComponent {
  readonly code = input('');
  readonly level = input(0);
  readonly size = input<'sm' | 'md'>('md');

  protected won(): boolean {
    return this.level() > 0;
  }
}
