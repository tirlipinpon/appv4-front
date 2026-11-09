/**
 * Conserve le state OAuth dans le navigateur (issue #32) — sessionStorage.
 * Le FE compare le state du callback avec celui émis à authorize-url.
 */

const keyFor = (provider: 'google' | 'facebook' | 'apple') => `appv4.oauth.state.${provider}`;

export function storeOAuthState(provider: 'google' | 'facebook' | 'apple', state: string): void {
  sessionStorage.setItem(keyFor(provider), state);
}

export function takeOAuthState(
  provider: 'google' | 'facebook' | 'apple',
  returnedState: string | null,
): string | null {
  const key = keyFor(provider);
  const expected = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  if (!expected || !returnedState || expected !== returnedState) {
    return null;
  }
  return expected;
}
