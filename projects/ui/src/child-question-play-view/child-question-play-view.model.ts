/** Données d'aperçu / jeu enfant — ids optionnels (preview teacher sans ids). */
export interface ChildPlayViewChoice {
  choiceId?: number;
  label: string;
}

export interface ChildPlayViewStatement {
  statementId?: number;
  label: string;
}

export interface ChildPlayViewQuestion {
  formCode: string;
  formLabel?: string;
  prompt?: string;
  choices?: ChildPlayViewChoice[];
  statements?: ChildPlayViewStatement[];
}
