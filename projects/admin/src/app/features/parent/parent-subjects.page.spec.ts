import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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
    expect(fixture.nativeElement.textContent).toContain('Extra-scolaire');

    page.add(3, 12);
    const post = http.expectOne(url);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ childId: 3, subjectId: 12 });
    post.flush(loaded);
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
    del.flush(loaded);
  });
});
