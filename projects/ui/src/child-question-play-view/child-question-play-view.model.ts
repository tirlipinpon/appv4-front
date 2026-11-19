/** Données d'aperçu / jeu enfant — ids optionnels (preview teacher sans ids). */
export interface ChildPlayViewChoice {
  choiceId?: number;
  label: string;
}

export interface ChildPlayViewStatement {
  statementId?: number;
  label: string;
}

export interface ChildPlayViewPair {
  pairId?: number;
  questionSide: string;
  answerSide: string;
}

export interface ChildPlayViewItem {
  itemId?: number;
  label: string;
  /** Jalon de frise (ex. « 20 minutes »). Affiché seulement si `timelineEnabled`. */
  axisLabel?: string;
}

export interface ChildPlayViewColumn {
  columnId?: number;
  label: string;
}

export interface ChildPlayViewCard {
  cardId?: number;
  label: string;
}

export interface ChildPlayViewLink {
  linkId?: number;
  leftLabel: string;
  rightLabel: string;
}

export interface ChildPlayViewWord {
  wordId?: number;
  label: string;
}

export interface ChildPlayViewClickPoint {
  x: number;
  y: number;
}

/** Zone cliquable, sans dire si elle est juste. */
export interface ChildPlayViewClickZone {
  zoneId?: number;
  shape: string;
  points: ChildPlayViewClickPoint[];
}

/** Consigne d'une étape, quand les clics ont un ordre. */
export interface ChildPlayViewClickStep {
  zoneId?: number;
  prompt: string;
}

export interface ChildPlayViewQuestion {
  formCode: string;
  formLabel?: string;
  prompt?: string;
  choices?: ChildPlayViewChoice[];
  statements?: ChildPlayViewStatement[];
  pairs?: ChildPlayViewPair[];
  items?: ChildPlayViewItem[];
  timelineEnabled?: boolean;
  columns?: ChildPlayViewColumn[];
  cards?: ChildPlayViewCard[];
  links?: ChildPlayViewLink[];
  /** Phrase avec `___` pour chaque trou. */
  sentence?: string;
  /** Banque mélangée : mots justes et leurres, sans les distinguer. */
  words?: ChildPlayViewWord[];
  /** Image WebP, en base64 brut ou déjà en data URL. */
  imageWebp?: string;
  /** true : une consigne par zone juste. false : clics dans n'importe quel ordre. */
  clicksOrdered?: boolean;
  clickZones?: ChildPlayViewClickZone[];
  clickSteps?: ChildPlayViewClickStep[];
  /** Nombre de cases lettre par lettre (sans le mot). */
  letterCount?: number;
  /**
   * Masque jouable : `#` = case lettre, espace = saut.
   * Fourni par l'API play (sans révéler le mot).
   */
  letterMask?: string;
  /**
   * Mot attendu — aperçu teacher seulement, pour verrouiller en vert sans appel API.
   * Learn ne le reçoit pas.
   */
  letterExpected?: string;
}
