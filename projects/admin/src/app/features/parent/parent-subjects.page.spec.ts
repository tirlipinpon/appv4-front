import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import type { ParentSubjectsResponse } from '../../core/api/api-models';
import { ParentSubjectsPage } from './parent-subjects.page';

const url = 'http://localhost:8080/api/int/parent/subjects';
const childrenUrl = 'http://localhost:8080/api/int/parent/children';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

const loaded: ParentSubjectsResponse = {
  children: [
    {
      childId: 3,
      firstName: 'Léa',
      lastName: 'Martin',
      schoolId: 1,
      schoolName: 'École française',
      grade: 'CE1',
      chosen: [
        {
          subjectId: 11,
          name: 'Mathématiques',
          teacherName: 'Prof A',
          schoolId: 1,
          schoolName: 'École française',
          grade: 'CE1',
          scolaire: true,
        },
      ],
      proposed: [
        {
          subjectId: 12,
          name: 'Mathématiques',
          teacherName: 'Prof A',
          schoolId: 1,
          schoolName: 'École française',
          grade: 'CE2',
          scolaire: false,
        },
      ],
    },
  ],
};

describe('ParentSubjectsPage', () => {
  let fixture: ComponentFixture<ParentSubjectsPage>;
  let page: ParentSubjectsPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentSubjectsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentSubjectsPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function boot(body: ParentSubjectsResponse): void {
    fixture.detectChanges();
    http.expectOne(url).flush(body);
    http.expectOne(childrenUrl).flush({
      children: [{ id: 3, firstName: 'Léa', lastName: 'Martin', sex: 'FILLE', age: 8, avatarCode: 'fox' }],
    });
    http.expectOne(spacesUrl).flush({ roles: ['parent'], teacherRequest: 'none' });
    http.expectOne(accountUrl).flush({ displayName: 'Tony' });
    fixture.detectChanges();
  }

  it('montre Léa avec la matière de sa classe déjà choisie', () => {
    boot(loaded);

    expect(fixture.nativeElement.textContent).toContain('Léa Martin');
    expect(fixture.nativeElement.textContent).toContain('🦊');
    expect(fixture.nativeElement.textContent).toContain('Fille');
    expect(fixture.nativeElement.textContent).toContain('8 ans');
    expect(fixture.nativeElement.textContent).toContain('Scolaire');
    page.search(3);
    const search = http.expectOne((request) => request.url === `${url}/3/offers`);
    search.flush({ offers: loaded.children![0].proposed, nextCursor: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Extra-scolaire');

    page.add(3, 12);
    const post = http.expectOne(url);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ childId: 3, subjectId: 12 });
    post.flush(loaded.children![0].proposed![0]);
    expect(page.children()[0].chosen?.map((item) => item.subjectId)).toEqual([11, 12]);
  });

  it('pagine les offres et conserve les autres fiches', () => {
    boot({ children: [...loaded.children!, { childId: 4, firstName: 'Tom', chosen: [] }] });
    page.setSearchQuery(3, { target: { value: 'math' } } as unknown as Event);
    page.setSearchGrade(3, { target: { value: 'CE2' } } as unknown as Event);
    page.search(3);
    const first = http.expectOne((request) => request.url === `${url}/3/offers`);
    expect(first.request.params.get('query')).toBe('math');
    expect(first.request.params.get('grade')).toBe('CE2');
    first.flush({ offers: loaded.children![0].proposed, nextCursor: 12 });
    page.nextOffers(3);
    const next = http.expectOne((request) => request.url === `${url}/3/offers`);
    expect(next.request.params.get('afterId')).toBe('12');
    next.flush({ offers: [], nextCursor: null });
    expect(page.children().length).toBe(2);
    page.previousOffers(3);
    http.expectOne((request) => request.url === `${url}/3/offers`)
      .flush({ offers: loaded.children![0].proposed, nextCursor: 12 });
    expect(page.proposed(page.children()[0], false).length).toBe(1);
  });

  it('ignore une recherche lancee avant un ajout', () => {
    boot(loaded);
    page.search(3);
    const stale = http.expectOne((request) => request.url === `${url}/3/offers`);
    page.add(3, 12);
    http.expectOne(url).flush(loaded.children![0].proposed![0]);
    stale.flush({ offers: loaded.children![0].proposed, nextCursor: null });
    expect(page.proposed(page.children()[0], false)).toEqual([]);
    expect(page.children()[0].chosen?.map((item) => item.subjectId)).toEqual([11, 12]);
  });

  it('actualise les propositions apres un retrait sans remplacer la famille', () => {
    boot({ children: [...loaded.children!, { childId: 4, firstName: 'Tom', chosen: [] }] });
    page.search(3);
    http.expectOne((request) => request.url === `${url}/3/offers`)
      .flush({ offers: loaded.children![0].proposed, nextCursor: null });
    page.confirmRemove(3, 11);
    http.expectOne(`${url}/3/11`).flush(loaded.children![0].chosen![0]);
    http.expectOne((request) => request.url === `${url}/3/offers`)
      .flush({ offers: [loaded.children![0].chosen![0]], nextCursor: null });
    expect(page.children().length).toBe(2);
    expect(page.children()[0].chosen).toEqual([]);
    expect(page.proposed(page.children()[0], true).map((item) => item.subjectId)).toEqual([11]);
  });

  it('retire une matière après confirmation', () => {
    boot(loaded);
    page.askRemove(3, 11);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Retirer Mathématiques de Prof A de la liste de Léa ?',
    );
    page.cancelRemove();
    http.expectNone(`${url}/3/11`);

    page.askRemove(3, 11);
    page.confirmRemove(3, 11);
    const del = http.expectOne(`${url}/3/11`);
    expect(del.request.method).toBe('DELETE');
    del.flush(loaded.children![0].chosen![0]);
    expect(page.children()[0].chosen).toEqual([]);
  });

  it('propose des matières après deux lettres, puis retient le choix', fakeAsync(() => {
    boot(loaded);
    const query = field('parent-subject-query');
    const grade = field('parent-subject-grade');

    query.value = 'm';
    query.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tick(300);
    http.expectNone((request) => request.url === `${url}/3/offers`);
    expect(fixture.nativeElement.textContent).toContain('Tape au moins deux lettres');

    query.value = 'ma';
    query.dispatchEvent(new Event('input'));
    grade.value = 'CE2';
    grade.dispatchEvent(new Event('input'));
    tick(300);
    const search = http.expectOne((request) => request.url === `${url}/3/offers`);
    expect(search.request.params.get('query')).toBe('ma');
    expect(search.request.params.get('grade')).toBe('CE2');
    expect(search.request.params.get('limit')).toBe('8');
    search.flush({ offers: loaded.children![0].proposed, nextCursor: 99 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Mathématiques · Extra-scolaire · Prof A · École française · CE2',
    );
    expect(fixture.nativeElement.textContent).toContain("D'autres matières correspondent.");

    const suggestion: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="parent-subject-suggestion-12"]',
    );
    suggestion.click();
    fixture.detectChanges();

    expect(query.value).toBe('Mathématiques');
    expect(fixture.nativeElement.querySelector('[data-testid="parent-subject-suggestion-12"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="parent-offer-add"]')).not.toBeNull();
  }));

  it('ignore une suggestion plus ancienne que la dernière frappe', fakeAsync(() => {
    boot(loaded);
    const query = field('parent-subject-query');

    query.value = 'ma';
    query.dispatchEvent(new Event('input'));
    tick(300);
    const stale = http.expectOne((request) => request.url === `${url}/3/offers`);

    query.value = 'mat';
    query.dispatchEvent(new Event('input'));
    tick(300);
    const current = http.expectOne((request) => request.url === `${url}/3/offers`);
    expect(current.request.params.get('query')).toBe('mat');
    stale.flush({
      offers: [{ subjectId: 8, name: 'Ancienne', scolaire: false, teacherName: 'Prof B', schoolName: 'Autre', grade: 'CM1' }],
      nextCursor: null,
    });
    current.flush({ offers: [], nextCursor: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Ancienne');
    expect(fixture.nativeElement.textContent).toContain('Aucune matière pour ce nom.');
  }));

  function field(testId: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }
});
