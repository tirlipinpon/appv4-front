import { Injectable, signal } from '@angular/core';
import type { StyleDefinition } from '@dicebear/core';

const styleLoaders: Readonly<Record<string, () => Promise<{ default: unknown }>>> = {
  adventurer: () => import('@dicebear/styles/adventurer.json'),
  'adventurer-neutral': () => import('@dicebear/styles/adventurer-neutral.json'),
  avataaars: () => import('@dicebear/styles/avataaars.json'),
  'avataaars-neutral': () => import('@dicebear/styles/avataaars-neutral.json'),
  'big-ears': () => import('@dicebear/styles/big-ears.json'),
  'big-ears-neutral': () => import('@dicebear/styles/big-ears-neutral.json'),
  'big-smile': () => import('@dicebear/styles/big-smile.json'),
  bottts: () => import('@dicebear/styles/bottts.json'),
  'bottts-neutral': () => import('@dicebear/styles/bottts-neutral.json'),
  cameo: () => import('@dicebear/styles/cameo.json'),
  clay: () => import('@dicebear/styles/clay.json'),
  critters: () => import('@dicebear/styles/critters.json'),
  croodles: () => import('@dicebear/styles/croodles.json'),
  'croodles-neutral': () => import('@dicebear/styles/croodles-neutral.json'),
  cutouts: () => import('@dicebear/styles/cutouts.json'),
  dylan: () => import('@dicebear/styles/dylan.json'),
  'fun-emoji': () => import('@dicebear/styles/fun-emoji.json'),
  gaze: () => import('@dicebear/styles/gaze.json'),
  'line-face': () => import('@dicebear/styles/line-face.json'),
  lorelei: () => import('@dicebear/styles/lorelei.json'),
  'lorelei-neutral': () => import('@dicebear/styles/lorelei-neutral.json'),
  marbles: () => import('@dicebear/styles/marbles.json'),
  micah: () => import('@dicebear/styles/micah.json'),
  miniavs: () => import('@dicebear/styles/miniavs.json'),
  moods: () => import('@dicebear/styles/moods.json'),
  notionists: () => import('@dicebear/styles/notionists.json'),
  'notionists-neutral': () => import('@dicebear/styles/notionists-neutral.json'),
  'open-peeps': () => import('@dicebear/styles/open-peeps.json'),
  personas: () => import('@dicebear/styles/personas.json'),
  'pixel-art': () => import('@dicebear/styles/pixel-art.json'),
  'pixel-art-neutral': () => import('@dicebear/styles/pixel-art-neutral.json'),
  pixelbot: () => import('@dicebear/styles/pixelbot.json'),
  shadows: () => import('@dicebear/styles/shadows.json'),
  sprouts: () => import('@dicebear/styles/sprouts.json'),
  thumbs: () => import('@dicebear/styles/thumbs.json'),
  'toon-head': () => import('@dicebear/styles/toon-head.json'),
  'voxel-art': () => import('@dicebear/styles/voxel-art.json'),
  'voxel-bot': () => import('@dicebear/styles/voxel-bot.json'),
};

interface AvatarRenderInput {
  seed: string;
  styleCode: string;
  options?: Record<string, unknown> | null;
  pins: Record<string, string>;
}

type DrawAvatar = (options: Record<string, unknown>) => string;

/** Charge les styles demandés par le catalogue du back et rend le personnage dans les deux apps. */
@Injectable({ providedIn: 'root' })
export class AvatarRenderer {
  private readonly loads = new Map<string, Promise<void>>();
  private readonly styles = signal<ReadonlyMap<string, DrawAvatar>>(new Map());

  load(styleCode: string): Promise<void> {
    if (!Object.hasOwn(styleLoaders, styleCode)) {
      return Promise.resolve();
    }
    const pending = this.loads.get(styleCode);
    if (pending) {
      return pending;
    }

    const load = Promise.all([styleLoaders[styleCode](), import('@dicebear/core')])
      .then(([definition, { Avatar, Style }]) => {
        const style = new Style(definition.default as StyleDefinition);
        const draw: DrawAvatar = (options) => new Avatar(style, options).toDataUri();
        this.styles.update((current) => new Map(current).set(styleCode, draw));
      })
      .catch(() => {
        this.loads.delete(styleCode);
      });
    this.loads.set(styleCode, load);
    return load;
  }

  draw(input: AvatarRenderInput): string | null {
    const draw = this.styles().get(input.styleCode);
    if (!draw) {
      return null;
    }
    const options: Record<string, unknown> = {
      seed: input.seed,
      size: 160,
      ...(input.options ?? {}),
    };
    for (const [zone, variant] of Object.entries(input.pins)) {
      if (variant === 'none') {
        options[`${zone}Probability`] = 0;
      } else {
        options[`${zone}Variant`] = [variant];
      }
    }
    return draw(options);
  }
}
