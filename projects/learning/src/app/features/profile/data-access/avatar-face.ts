import { Avatar, Style, type StyleDefinition } from '@dicebear/core';

import { CHARACTER_STYLES } from './avatar-styles';

/**
 * Dessin du personnage (LEARN-56).
 * La graine, le style, la palette et les variantes viennent de l'API.
 */
export function avatarDataUri(input: {
  seed: string;
  styleCode: string;
  options?: Record<string, unknown> | null;
  pins: Record<string, string>;
}): string | null {
  const definition: StyleDefinition | undefined = CHARACTER_STYLES[input.styleCode];
  if (!definition) {
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
  return new Avatar(new Style(definition), options).toDataUri();
}
