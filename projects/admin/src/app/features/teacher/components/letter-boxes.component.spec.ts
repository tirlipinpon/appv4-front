import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LetterBoxesComponent } from './letter-boxes.component';

describe('LetterBoxesComponent', () => {
  let fixture: ComponentFixture<LetterBoxesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LetterBoxesComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LetterBoxesComponent);
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
  });

  it('keeps Valider inactive until every box has a letter', () => {
    const inputs = boxes();
    expect(inputs.length).toBe(5);
    expect(validate()?.disabled).toBe(true);

    fill(['p', 'a', 'r', 'i', '']);
    expect(validate()?.disabled).toBe(true);

    fill(['p', 'a', 'r', 'i', 's']);
    expect(validate()?.disabled).toBe(false);
  });

  it('emits the word built from the boxes', () => {
    const words: string[] = [];
    fixture.componentInstance.submitted.subscribe((word) => words.push(word));
    fill(['P', 'A', 'R', 'I', 'S']);

    validate()?.click();

    expect(words).toEqual(['PARIS']);
  });

  it('shows the message returned for this attempt', () => {
    fixture.componentRef.setInput('message', 'La réponse est acceptée.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('La réponse est acceptée.');
  });

  function boxes(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input'));
  }

  function validate(): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((button) =>
      button.textContent?.includes('Valider'),
    );
  }

  function fill(letters: string[]): void {
    const inputs = boxes();
    letters.forEach((letter, index) => {
      inputs[index].value = letter;
      inputs[index].dispatchEvent(new InputEvent('input', { bubbles: true, data: letter }));
    });
    fixture.detectChanges();
  }
});
