import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const KIND: Record<string, string> = {
  mouth: 'mouth',
  eyes: 'eyes',
  eyebrows: 'brows',
  brows: 'brows',
  nose: 'nose',
  ears: 'ears',
  hair: 'hair',
  frontHair: 'hair',
  rearHair: 'hair',
  top: 'hair',
  tops: 'hair',
  head: 'head',
  heads: 'head',
  face: 'head',
  expression: 'mood',
  mood: 'mood',
  cheeks: 'cheeks',
  blush: 'cheeks',
  freckles: 'freckles',
  glasses: 'glasses',
  beard: 'beard',
  facialHair: 'beard',
  mustache: 'mustache',
  sideburns: 'sideburns',
  earrings: 'earrings',
  hat: 'hat',
  accessories: 'spark',
  hairAccessories: 'spark',
  details: 'spark',
  mask: 'mask',
  clothes: 'shirt',
  outfit: 'shirt',
  clothesGraphic: 'shirt',
  body: 'body',
  shoulders: 'shoulders',
  chest: 'chest',
  gesture: 'hand',
  animation: 'play',
  pattern: 'grid',
  texture: 'grid',
  shape: 'shape',
  blend: 'blend',
  plant: 'plant',
  pot: 'pot',
  knot: 'knot',
  spacing: 'spacing',
  sides: 'sides',
};

/**
 * Petit dessin d'une zone d'avatar.
 * Le code vient de la lecture. Un code inconnu reste un point.
 */
@Component({
  selector: 'app-avatar-zone-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 24 24">
      @switch (kind()) {
        @case ('mouth') {
          <path d="M6 13c1.6 3.2 4 4.6 6 4.6s4.4-1.4 6-4.6" />
        }
        @case ('eyes') {
          <circle cx="8" cy="12" r="1.6" />
          <circle cx="16" cy="12" r="1.6" />
        }
        @case ('brows') {
          <path d="M5 11c1.4-2 3.2-2.4 4.6-.6M14.4 10.4c1.4-1.8 3.2-1.4 4.6.6" />
        }
        @case ('nose') {
          <path d="M12 6v7c0 2-1.4 3-2.6 3" />
        }
        @case ('ears') {
          <path d="M6 9c-2 1-2 5 0 6M18 9c2 1 2 5 0 6" />
        }
        @case ('hair') {
          <path d="M5 14c0-6 3-9 7-9s7 3 7 9" />
          <path d="M8 13c.4-2 1.6-3 4-3s3.6 1 4 3" />
        }
        @case ('head') {
          <circle cx="12" cy="12" r="6" />
        }
        @case ('mood') {
          <circle cx="12" cy="12" r="6" />
          <path d="M9 14c.8 1.2 1.8 1.6 3 1.6s2.2-.4 3-1.6" />
        }
        @case ('cheeks') {
          <circle cx="7" cy="13" r="1.4" />
          <circle cx="17" cy="13" r="1.4" />
        }
        @case ('freckles') {
          <circle cx="8" cy="10" r="0.8" />
          <circle cx="12" cy="12" r="0.8" />
          <circle cx="16" cy="10" r="0.8" />
          <circle cx="10" cy="15" r="0.8" />
          <circle cx="14" cy="15" r="0.8" />
        }
        @case ('glasses') {
          <circle cx="8" cy="12" r="3" />
          <circle cx="16" cy="12" r="3" />
          <path d="M11 12h2" />
        }
        @case ('beard') {
          <path d="M7 10c0 6 2.2 9 5 9s5-3 5-9" />
        }
        @case ('mustache') {
          <path d="M4 13c2.2-2 4-1.2 5.2.4 1-1.6 3-2.4 5.2-.4C15.8 11.8 17.6 11 20 13" />
        }
        @case ('sideburns') {
          <path d="M7 6v8M17 6v8" />
        }
        @case ('earrings') {
          <path d="M8 6v3" />
          <circle cx="8" cy="12" r="2" />
          <path d="M16 6v3" />
          <circle cx="16" cy="12" r="2" />
        }
        @case ('hat') {
          <path d="M5 15h14" />
          <path d="M8 15V11c0-3 1.8-5 4-5s4 2 4 5v4" />
        }
        @case ('spark') {
          <path d="M12 4v16M4 12h16M7 7l10 10M17 7 7 17" />
        }
        @case ('mask') {
          <path d="M4 10c2-3 14-3 16 0 0 5-3 9-8 9s-8-4-8-9z" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="15" cy="12" r="1" />
        }
        @case ('shirt') {
          <path d="M8 6 4 9l2 3 2-2v8h8v-8l2 2 2-3-4-3-2 2h-4z" />
        }
        @case ('body') {
          <circle cx="12" cy="6" r="2" />
          <path d="M7 20c.4-4 2-6 5-6s4.6 2 5 6" />
        }
        @case ('shoulders') {
          <path d="M4 16c2-4 4-6 8-6s6 2 8 6" />
        }
        @case ('chest') {
          <path d="M8 6h8l2 4v10H6V10z" />
        }
        @case ('hand') {
          <path d="M9 12V6M12 12V4M15 12V6M8 12c0 5 1.6 8 4 8s4-3 4-8" />
        }
        @case ('play') {
          <path d="M8 6v12l10-6z" />
        }
        @case ('grid') {
          <path d="M5 5h14v14H5zM12 5v14M5 12h14" />
        }
        @case ('shape') {
          <circle cx="9" cy="10" r="3" />
          <path d="M13 14h6v6h-6z" />
        }
        @case ('blend') {
          <circle cx="9" cy="12" r="4" />
          <circle cx="15" cy="12" r="4" />
        }
        @case ('plant') {
          <path d="M12 20V10" />
          <path d="M12 14c-4 0-6-3-6-6 4 0 6 2 6 6zM12 12c4-1 6-4 6-7-4 0-6 3-6 7z" />
        }
        @case ('pot') {
          <path d="M8 10h8l-1 9H9zM7 10h10" />
        }
        @case ('knot') {
          <path d="M7 9c4 0 4 6 8 6M7 15c4 0 4-6 8-6" />
        }
        @case ('spacing') {
          <path d="M6 7h12M6 12h12M6 17h12" />
        }
        @case ('sides') {
          <path d="M8 8 4 12l4 4M16 8l4 4-4 4" />
        }
        @default {
          <circle cx="12" cy="12" r="2" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: #2a2444;
      color: #f5f5ff;
    }

    svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class AvatarZoneIcon {
  readonly code = input<string | null | undefined>(null);

  protected kind(): string {
    const code = this.code();
    return (code && KIND[code]) || 'mark';
  }
}
