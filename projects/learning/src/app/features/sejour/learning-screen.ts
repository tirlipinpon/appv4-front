/**
 * Code d'écran envoyé avec un signal de séjour (LEARN-74).
 * La partie n'est pas un écran : le signal porte l'identifiant de question (LEARN-75).
 * L'humeur n'a pas de code : elle reste sur Accueil.
 */
export function learningScreenCode(url: string): string | null {
  const path = learningPath(url);
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

/**
 * Question ouverte sur la route de jeu.
 * L'API retrouve la matière depuis cet identifiant : la route ne porte pas de code d'écran.
 */
export function learningQuestionId(url: string): number | null {
  const match = /^\/learn\/[^/]+\/play\/(\d+)$/.exec(learningPath(url));
  if (match == null) {
    return null;
  }
  const questionId = Number(match[1]);
  if (!Number.isSafeInteger(questionId) || questionId <= 0) {
    return null;
  }
  return questionId;
}

function learningPath(url: string): string {
  return (url.split(/[?#]/)[0] ?? '').replace(/\/+$/, '') || '/';
}
