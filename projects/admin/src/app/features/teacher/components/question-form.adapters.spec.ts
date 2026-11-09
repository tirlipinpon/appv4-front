import { buildSaveBody, parseSavedQuestion, requireSavedQuestion } from './question-form.adapters';
import { FORM, QuestionDraftSnapshot, emptyChoices, emptyDecoys, emptyItems, emptyLinks, emptyPairs, emptyStatements } from './question-form.model';

function emptyDraft(overrides: Partial<QuestionDraftSnapshot> = {}): QuestionDraftSnapshot {
  return {
    prompt: '',
    choices: emptyChoices(),
    pairs: emptyPairs(),
    items: emptyItems(),
    statements: emptyStatements(),
    links: emptyLinks(),
    sentence: '',
    answers: [],
    decoys: emptyDecoys(),
    expectedAnswer: '',
    clickImage: '',
    requireAllCorrect: true,
    clickZones: [],
    puzzleMagnet: 0.08,
    ...overrides,
  };
}

describe('question-form.adapters', () => {
  it('maps a valid QCM item and keeps its id', () => {
    const saved = parseSavedQuestion({
      id: 7,
      formCode: FORM.QCM,
      formLabel: 'Choix multiples',
      prompt: 'Combien font 2 + 2 ?',
      choices: [
        { id: 1, label: '3', correct: false },
        { id: 2, label: '4', correct: true },
      ],
    });

    expect(saved).toEqual(
      jasmine.objectContaining({
        id: 7,
        formCode: FORM.QCM,
        prompt: 'Combien font 2 + 2 ?',
        choices: [
          { label: '3', correct: false },
          { label: '4', correct: true },
        ],
      }),
    );
  });

  it('maps memory, order and texte payloads', () => {
    expect(
      parseSavedQuestion({
        id: 1,
        formCode: FORM.MEMORY,
        pairs: [{ questionSide: 'A', answerSide: '1' }],
      })?.pairs,
    ).toEqual([{ questionSide: 'A', answerSide: '1' }]);

    expect(
      parseSavedQuestion({
        id: 2,
        formCode: FORM.ORDER,
        items: [{ label: 'un' }, { label: 'deux' }],
      })?.items,
    ).toEqual([{ label: 'un' }, { label: 'deux' }]);

    expect(
      parseSavedQuestion({
        id: 3,
        formCode: FORM.TEXTE,
        expectedAnswer: 'Paris',
      })?.expectedAnswer,
    ).toBe('Paris');
  });

  it('rejects a missing or zero id instead of inventing 0', () => {
    expect(parseSavedQuestion({ formCode: FORM.QCM, prompt: 'x' })).toBeNull();
    expect(parseSavedQuestion({ id: 0, formCode: FORM.QCM, prompt: 'x' })).toBeNull();
    expect(() => requireSavedQuestion({ formCode: FORM.QCM, prompt: 'x' })).toThrowError(
      /identifiant/,
    );
  });

  it('builds a QCM create body from the draft', () => {
    const body = buildSaveBody(
      FORM.QCM,
      emptyDraft({
        prompt: 'Combien font 2 + 2 ?',
        choices: [
          { label: '3', correct: false },
          { label: '4', correct: true },
        ],
      }),
    );

    expect(body).toEqual({
      formCode: FORM.QCM,
      prompt: 'Combien font 2 + 2 ?',
      choices: [
        { label: '3', correct: false },
        { label: '4', correct: true },
      ],
    });
  });

  it('builds puzzle and image bodies without dropping shape points', () => {
    const zones = [
      {
        label: 'zone',
        correct: true,
        shape: 'polygon' as const,
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.1 },
          { x: 0.2, y: 0.2 },
        ],
      },
    ];

    expect(
      buildSaveBody(
        FORM.IMAGE_CLICK,
        emptyDraft({
          prompt: 'Clique',
          clickImage: 'data:image/webp;base64,AAA',
          clickZones: zones,
          requireAllCorrect: false,
        }),
      ),
    ).toEqual(
      jasmine.objectContaining({
        formCode: FORM.IMAGE_CLICK,
        imageWebp: 'AAA',
        requireAllCorrect: false,
        zones: [
          {
            label: 'zone',
            correct: true,
            shape: 'polygon',
            points: [
              { x: 0.1, y: 0.1 },
              { x: 0.2, y: 0.1 },
              { x: 0.2, y: 0.2 },
            ],
          },
        ],
      }),
    );

    expect(
      buildSaveBody(
        FORM.PUZZLE,
        emptyDraft({
          prompt: 'Assemble',
          clickImage: 'data:image/webp;base64,BBB',
          clickZones: zones,
          puzzleMagnet: 0.12,
        }),
      ),
    ).toEqual(
      jasmine.objectContaining({
        formCode: FORM.PUZZLE,
        imageWebp: 'BBB',
        snapDistance: 0.12,
        pieces: [
          {
            label: 'zone',
            shape: 'polygon',
            points: [
              { x: 0.1, y: 0.1 },
              { x: 0.2, y: 0.1 },
              { x: 0.2, y: 0.2 },
            ],
          },
        ],
      }),
    );
  });

  it('returns null for an unknown form code', () => {
    expect(buildSaveBody('inconnu', emptyDraft())).toBeNull();
    expect(buildSaveBody(null, emptyDraft())).toBeNull();
  });
});
