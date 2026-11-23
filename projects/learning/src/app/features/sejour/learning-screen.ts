/**
 * Code d'écran envoyé avec un signal de séjour (LEARN-74).
 * La partie n'est pas un écran : elle comptera sur la question plus tard.
 * L'humeur n'a pas de code : elle reste sur Accueil.
 */
export function learningScreenCode(url: string): string | null {
  const path = (url.split(/[?#]/)[0] ?? '').replace(/\/+$/, '') || '/';
  if (path === '/home') {
    return 'accueil';
  }
  if (path === '/learn') {
    return 'matieres';
  }
  if (/^\/learn\/[^/]+\/play\/[^/]+$/.test(path)) {
    return null;
  }
  if (/^\/learn\/[^/]+\/questions$/.test(path)) {
    return 'questions';
  }
  if (/^\/learn\/[^/]+$/.test(path)) {
    return 'board';
  }
  if (path === '/rewards') {
    return 'recompenses';
  }
  if (path === '/ranking') {
    return 'classement';
  }
  if (path === '/profile') {
    return 'profil';
  }
  return null;
}
