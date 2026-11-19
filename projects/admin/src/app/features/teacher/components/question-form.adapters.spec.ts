import { buildSaveBody, parseSavedQuestion, requireSavedQuestion } from './question-form.adapters';
import {
  FORM,
  PUZZLE_BOARD_MODE,
  QuestionDraftSnapshot,
  emptyCards,
  emptyChoices,
  emptyColumns,
  emptyDecoys,
  emptyItems,
  emptyLinks,
  emptyPairs,
  emptyStatements,
} from './question-form.model';

function emptyDraft(overrides: Partial<QuestionDraftSnapshot> = {}): QuestionDraftSnapshot {
  return {
    prompt: '',
    choices: emptyChoices(),
    pairs: emptyPairs(),
    items: emptyItems(),
    statements: emptyStatements(),
    links: emptyLinks(),
    columns: emptyColumns(),
    cards: emptyCards(),
    sentence: '',
    answers: [],
    decoys: emptyDecoys(),
    expectedAnswer: '',
    clickImage: '',
    boardMode: PUZZLE_BOARD_MODE.TROUS,
    boardImage: '',
    requireAllCorrect: true,
    clicksOrdered: true,
    clickZones: [],
    puzzleMagnet: 0.08,
    timelineEnabled: false,
    simonType: null,
    simonElements: [],
    simonSequence: [],
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
    ).toEqual([
      { label: 'un', axisLabel: '' },
      { label: 'deux', axisLabel: '' },
    ]);

    expect(
      parseSavedQuestion({
        id: 22,
        formCode: FORM.ORDER,
        timelineEnabled: true,
        items: [
          { label: 'un', axisLabel: '20 minutes' },
          { label: 'deux', axisLabel: '1 heure' },
        ],
      }),
    ).toEqual(
      jasmine.objectContaining({
        timelineEnabled: true,
        items: [
          { label: 'un', axisLabel: '20 minutes' },
          { label: 'deux', axisLabel: '1 heure' },
        ],
      }),
    );

    expect(
      parseSavedQuestion({
        id: 3,
        formCode: FORM.TEXTE,
        expectedAnswer: 'Paris',
      })?.expectedAnswer,
    ).toBe('Paris');
  });

  it('maps classement columns and cards with columnIndex', () => {
    const saved = parseSavedQuestion({
      id: 21,
      formCode: FORM.CLASSIFICATION,
      columns: [
        { id: 10, label: 'Oui' },
        { id: 11, label: 'Non' },
      ],
      cards: [
        { id: 1, label: 'A', correctColumnId: 10 },
        { id: 2, label: 'B', correctColumnId: 11 },
      ],
    });
    expect(saved?.columns).toEqual([{ label: 'Oui' }, { label: 'Non' }]);
    expect(saved?.cards).toEqual([
      { label: 'A', columnIndex: 0 },
      { label: 'B', columnIndex: 1 },
    ]);

    expect(
      buildSaveBody(
        FORM.CLASSIFICATION,
        emptyDraft({
          columns: [{ label: 'Oui' }, { label: 'Non' }],
          cards: [
            { label: 'A', columnIndex: 0 },
            { label: 'B', columnIndex: 1 },
          ],
        }),
      ),
    ).toEqual({
      formCode: FORM.CLASSIFICATION,
      prompt: '',
      columns: [{ label: 'Oui' }, { label: 'Non' }],
      cards: [
        { label: 'A', columnIndex: 0 },
        { label: 'B', columnIndex: 1 },
      ],
    });
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

  it('builds an order body with timeline jalons', () => {
    const body = buildSaveBody(
      FORM.ORDER,
      emptyDraft({
        timelineEnabled: true,
        items: [
          { label: 'Circulation', axisLabel: '20 minutes' },
          { label: 'Monoxyde', axisLabel: '12 heures' },
        ],
      }),
    );

    expect(body).toEqual({
      formCode: FORM.ORDER,
      prompt: '',
      timelineEnabled: true,
      items: [
        { label: 'Circulation', axisLabel: '20 minutes' },
        { label: 'Monoxyde', axisLabel: '12 heures' },
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
            clickOrder: 1,
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
          boardMode: PUZZLE_BOARD_MODE.FOND,
          boardImage: 'data:image/webp;base64,CCC',
          clickZones: [
            {
              ...zones[0],
              slot: { x: 0.25, y: 0.35, width: 0.4 },
            },
          ],
          puzzleMagnet: 0.12,
        }),
      ),
    ).toEqual(
      jasmine.objectContaining({
        formCode: FORM.PUZZLE,
        imageWebp: 'BBB',
        boardMode: 'fond',
        boardImageWebp: 'CCC',
        snapDistance: 0.12,
        pieces: [
          jasmine.objectContaining({
            label: 'zone',
            shape: 'polygon',
            points: [
              { x: 0.1, y: 0.1 },
              { x: 0.2, y: 0.1 },
              { x: 0.2, y: 0.2 },
            ],
            slotX: 0.25,
            slotY: 0.35,
            slotWidth: 0.4,
          }),
        ],
      }),
    );

    expect(
      buildSaveBody(
        FORM.PUZZLE,
        emptyDraft({
          prompt: 'Trous',
          clickImage: 'data:image/webp;base64,BBB',
          boardMode: PUZZLE_BOARD_MODE.TROUS,
          boardImage: 'data:image/webp;base64,CCC',
          clickZones: zones,
        }),
      ),
    ).toEqual(
      jasmine.objectContaining({
        boardMode: 'trous',
        boardImageWebp: '',
      }),
    );

    expect(
      buildSaveBody(
        FORM.PUZZLE,
        emptyDraft({
          prompt: 'Blanc',
          clickImage: 'data:image/webp;base64,BBB',
          boardMode: PUZZLE_BOARD_MODE.BLANC,
          clickZones: [
            {
              ...zones[0],
              slot: { x: 0.3, y: 0.4 },
            },
          ],
        }),
      ),
    ).toEqual(
      jasmine.objectContaining({
        boardMode: 'blanc',
        boardImageWebp: '',
        pieces: [
          jasmine.objectContaining({
            label: 'zone',
            slotX: 0.3,
            slotY: 0.4,
          }),
        ],
      }),
    );
  });

  it('maps a simon question and keeps element positions for the sequence', () => {
    const saved = parseSavedQuestion({
      id: 30,
      formCode: FORM.SIMON,
      formLabel: 'Simon',
      elementType: 'couleurs',
      elements: [
        { id: 1, label: 'rouge', color: '#ff0000' },
        { id: 2, label: 'bleu', color: '#0000ff' },
      ],
      sequence: [0, 1, 0, 7],
    });

    expect(saved).toEqual(
      jasmine.objectContaining({
        elementType: 'couleurs',
        elements: [
          { label: 'rouge', color: '#ff0000' },
          { label: 'bleu', color: '#0000ff' },
        ],
        sequence: [0, 1, 0],
      }),
    );

    const other = parseSavedQuestion({ id: 31, formCode: FORM.QCM, elementType: 'couleurs', sequence: [0, 1] });
    expect(other?.elementType).toBeNull();
    expect(other?.elements).toEqual([]);
    expect(other?.sequence).toEqual([]);
  });

  it('builds a simon body and sends a color only for the couleurs genre', () => {
    const elements = [
      { label: 'rouge', color: '#ff0000' },
      { label: 'bleu', color: '#0000ff' },
    ];

    expect(
      buildSaveBody(
        FORM.SIMON,
        emptyDraft({ prompt: 'Refais', simonType: 'couleurs', simonElements: elements, simonSequence: [1, 0, 1] }),
      ),
    ).toEqual({
      formCode: FORM.SIMON,
      prompt: 'Refais',
      elementType: 'couleurs',
      elements: [
        { label: 'rouge', color: '#ff0000' },
        { label: 'bleu', color: '#0000ff' },
      ],
    });

    expect(
      buildSaveBody(FORM.SIMON, emptyDraft({ simonType: 'formes', simonElements: elements, simonSequence: [0, 1] })),
    ).toEqual({
      formCode: FORM.SIMON,
      prompt: '',
      elementType: 'formes',
      elements: [{ label: 'rouge' }, { label: 'bleu' }],
    });
  });

  it('returns null for an unknown form code', () => {
    expect(buildSaveBody('inconnu', emptyDraft())).toBeNull();
    expect(buildSaveBody(null, emptyDraft())).toBeNull();
  });
});
