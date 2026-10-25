import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { TeacherSubjectsResponse } from '../../core/api/api-models';
import { TeacherSubjectsPage } from './teacher-subjects.page';

const subjectsUrl = 'http://localhost:8080/api/int/teacher/subjects';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';

const empty: TeacherSubjectsResponse = { schools: [] };

const loaded: TeacherSubjectsResponse = {
  schools: [
    {
      schoolId: 1,
      schoolName: 'École française',
      grades: [
        { grade: 'CE1', subjects: [{ id: 2, name: 'Lecture' }] },
        { grade: 'CE2', subjects: [{ id: 3, name: 'Mathématiques' }] },
      ],
    },
    {
      schoolId: 2,
      schoolName: 'École belge',
      grades: [{ grade: '3e primaire', subjects: [] }],
    },
  ],
};

describe('TeacherSubjectsPage', () => {
  let fixture: ComponentFixture<TeacherSubjectsPage>;
  let page: TeacherSubjectsPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherSubjectsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherSubjectsPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function boot(body: TeacherSubjectsResponse): void {
    fixture.detectChanges();
    http.expectOne(subjectsUrl).flush(body);
    http.expectOne(spacesUrl).flush({ roles: ['teacher'], teacherRequest: 'none' });
    fixture.detectChanges();
  }

  it('dit qu’il n’y a pas encore de classe', () => {
    boot(empty);

    expect(fixture.nativeElement.textContent).toContain("Il n'y a pas encore de classe.");
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });

  it('affiche les classes et ajoute une matière', () => {
    boot(loaded);

    expect(fixture.nativeElement.textContent).toContain('École française');
    expect(fixture.nativeElement.textContent).toContain('Aucune matière');
    expect(fixture.nativeElement.textContent).toContain('Lecture');

    page.onDraft(1, 'CE1', '   ');
    page.add(1, 'CE1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Le nom est obligatoire.');
    http.expectNone(subjectsUrl);

    page.onDraft(1, 'CE1', 'a'.repeat(101));
    page.add(1, 'CE1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Le nom dépasse 100 caractères.');
    http.expectNone(subjectsUrl);

    page.onDraft(1, 'CE1', '  Français  ');
    page.add(1, 'CE1');
    const post = http.expectOne(subjectsUrl);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ schoolId: 1, grade: 'CE1', name: 'Français' });
    post.flush({ id: 8, name: 'Français' });
    http.expectOne(subjectsUrl).flush(loaded);
    fixture.detectChanges();

    expect(page.draft(1, 'CE1')).toBe('');
  });

  it('affiche le refus quand le nom est déjà pris', () => {
    boot(loaded);
    page.onDraft(1, 'CE1', 'lecture');
    page.add(1, 'CE1');

    const post = http.expectOne(subjectsUrl);
    post.flush(
      { message: 'Une matière de ce nom existe déjà dans cette classe.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Une matière de ce nom existe déjà dans cette classe.',
    );
  });

  it('renomme sans changer de classe', () => {
    boot(loaded);
    page.startRename({ id: 2, name: 'Lecture' });
    page.onRenameDraft('  Français  ');
    page.saveRename(2);

    const put = http.expectOne(`${subjectsUrl}/2`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ name: 'Français' });
    put.flush({ id: 2, name: 'Français' });
    http.expectOne(subjectsUrl).flush(loaded);
  });

  it('retire une matière seulement après confirmation', () => {
    boot(loaded);
    page.askRemove({ id: 3, name: 'Mathématiques' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Retirer Mathématiques du CE2 de École française ?',
    );
    page.cancelRemove();
    fixture.detectChanges();
    http.expectNone(`${subjectsUrl}/3`);
    expect(fixture.nativeElement.textContent).toContain('Mathématiques');

    page.askRemove({ id: 3, name: 'Mathématiques' });
    page.confirmRemove(3);
    const del = http.expectOne(`${subjectsUrl}/3`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    http.expectOne(subjectsUrl).flush(loaded);
  });
});
