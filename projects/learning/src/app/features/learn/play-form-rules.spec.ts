import type { ChildQuestionPlayViewComponent } from '@appv4/ui';
import { playForms } from '@appv4/ui';

describe('Construction des réponses de jeu', () => {
  const view = jasmine.createSpyObj<ChildQuestionPlayViewComponent>('view', [
    'selectedChoiceIds', 'allCardsPlaced', 'placements', 'imageReady', 'zoneClicks',
    'allPuzzlePiecesPlaced', 'puzzlePlacements',
  ]);

  it('envoie les identifiants sélectionnés pour un QCM', () => {
    const form = playForms.qcm;
    view.selectedChoiceIds.and.returnValue([]);
    expect(form.ready(view)).toBeFalse();
    view.selectedChoiceIds.and.returnValue([3, 7]);
    expect(form.ready(view)).toBeTrue();
    expect(form.answer(view)).toEqual({ formCode: 'qcm', selectedChoiceIds: [3, 7] });
  });

  it('associe chaque carte à sa colonne pour un classement', () => {
    const form = playForms.classement;
    const placements = [{ cardId: 2, columnId: 5 }];
    view.allCardsPlaced.and.returnValue(true);
    view.placements.and.returnValue(placements);
    expect(form.ready(view)).toBeTrue();
    expect(form.answer(view)).toEqual({ formCode: 'classement', placements });
  });

  it('conserve l’ordre des clics sur une image', () => {
    const form = playForms.image_interactive;
    view.imageReady.and.returnValue(true);
    view.zoneClicks.and.returnValue([9, 2]);
    expect(form.ready(view)).toBeTrue();
    expect(form.answer(view)).toEqual({ formCode: 'image_interactive', zoneClicks: [{ zoneId: 9 }, { zoneId: 2 }] });
  });

  it('envoie les coordonnées de chaque pièce du puzzle', () => {
    const form = playForms.puzzle;
    const puzzlePlacements = [{ pieceId: 3, x: 0.2, y: 0.5 }];
    view.allPuzzlePiecesPlaced.and.returnValue(true);
    view.puzzlePlacements.and.returnValue(puzzlePlacements);
    expect(form.ready(view)).toBeTrue();
    expect(form.answer(view)).toEqual({ formCode: 'puzzle', puzzlePlacements });
  });
});
