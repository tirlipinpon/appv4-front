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
}
