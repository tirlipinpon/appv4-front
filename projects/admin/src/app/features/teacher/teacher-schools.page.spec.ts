import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatSelectChange } from '@angular/material/select';

import type { TeacherProfileResponse, TeacherRemovalPreviewResponse } from '../../core/api/api-models';
import { TeacherSchoolsPage } from './teacher-schools.page';

const profileUrl = 'http://localhost:8080/api/int/teacher/profile';
const previewUrl = `${profileUrl}/removal-preview`;
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

const loaded: TeacherProfileResponse = {
  email: 'prof@example.com',
  displayName: 'Ancien',
  schools: [],
  availableSchools: [
    { id: 1, name: 'Ecole Nouvelle', country: 'Belgique', grades: ['1e primaire', '2e primaire'] },
    { id: 2, name: 'Autre', country: 'Belgique', grades: ['1e primaire'] },
  ],
};

describe('TeacherSchoolsPage', () => {
  let fixture: ComponentFixture<TeacherSchoolsPage>;
  let page: TeacherSchoolsPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherSchoolsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherSchoolsPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(profileUrl).flush(loaded);
    http.expectOne(spacesUrl).flush({ roles: ['teacher'], teacherRequest: 'none' });
    http.expectOne(accountUrl).flush({ displayName: 'Ancien' });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('signale un bloc école incomplet sans appeler l’API', () => {
    page.addSchool();
    page.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choisis une école dans la liste, ou retire-la.');
    http.expectNone(profileUrl);

    const block = page.blocks()[0];
    page.onCountryChange(block.key, select('Belgique'));
    page.onSchoolChange(block.key, select(1));
    page.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choisis une classe pour cette école, ou retire-la.');
    http.expectNone(profileUrl);
  });

  it('enregistre les écoles en renvoyant le nom déjà connu', () => {
    page.addSchool();
    const block = page.blocks()[0];
    page.onCountryChange(block.key, select('Belgique'));
    page.onSchoolChange(block.key, select(1));
    page.toggleGrade(block.key, '1e primaire', true);
    page.save();

    const put = http.expectOne(profileUrl);
    expect(put.request.body).toEqual({
      displayName: 'Ancien',
      schools: [{ schoolId: 1, grades: ['1e primaire'] }],
    });
    put.flush({
      ...loaded,
      schools: [{ schoolId: 1, schoolName: 'Ecole Nouvelle', country: 'Belgique', grades: ['1e primaire'] }],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ok')?.textContent).toContain('Enregistré');
    expect(fixture.nativeElement.textContent).not.toContain('Nom affiché');
  });

  it('retire une école jamais enregistrée sans demander l’aperçu', () => {
    page.addSchool();
    const block = page.blocks()[0];
    page.onCountryChange(block.key, select('Belgique'));
    page.onSchoolChange(block.key, select(1));
    page.removeSchool(block.key);

    expect(page.blocks().length).toBe(0);
    http.expectNone(previewUrl);
  });
});

describe('TeacherSchoolsPage retrait enregistré', () => {
  let fixture: ComponentFixture<TeacherSchoolsPage>;
  let page: TeacherSchoolsPage;
  let http: HttpTestingController;

  const saved: TeacherProfileResponse = {
    ...loaded,
    schools: [
      {
        schoolId: 1,
        schoolName: 'Ecole Nouvelle',
        country: 'Belgique',
        grades: ['1e primaire', '2e primaire'],
      },
    ],
  };

  const preview: TeacherRemovalPreviewResponse = {
    schoolId: 1,
    schoolName: 'Ecole Nouvelle',
    grade: '1e primaire',
    studentCount: 2,
    studentCountLabel: '2 élèves',
    emptyStudentsLabel: 'Aucun élève inscrit dans cette classe.',
    students: [
      { id: 2, firstName: 'Léa', lastName: 'Martin', grade: '1e primaire' },
      { id: 3, firstName: 'Noah', lastName: 'Bernard', grade: '1e primaire' },
    ],
    subjectCount: 1,
    subjectCountLabel: '1 matière',
    emptySubjectsLabel: 'Aucune matière dans cette année.',
    subjects: [
      {
        id: 10,
        name: 'Mathématiques',
        grade: '1e primaire',
        followerCount: 2,
        followerWarning: '2 enfants suivent ce cours.',
        followerNames: ['Léa Martin', 'Noah Bernard'],
      },
    ],
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TeacherSchoolsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherSchoolsPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(profileUrl).flush(saved);
    http.expectOne(spacesUrl).flush({ roles: ['teacher'], teacherRequest: 'none' });
    http.expectOne(accountUrl).flush({ displayName: 'Ancien' });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('montre les élèves et la matière avant de décocher une année enregistrée', () => {
    const block = page.blocks()[0];
    const box = { checked: false };
    page.onGradeChange(block.key, '1e primaire', { checked: false, source: box } as MatCheckboxChange);

    expect(box.checked).toBe(true);
    expect(block.grades).toContain('1e primaire');
    const request = http.expectOne(
      (call) => call.method === 'GET' && call.url === previewUrl,
    );
    expect(request.request.params.get('schoolId')).toBe('1');
    expect(request.request.params.get('grade')).toBe('1e primaire');
    request.flush(preview);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ecole Nouvelle');
    expect(text).toContain('1e primaire');
    expect(text).toContain('2 élèves');
    expect(text).toContain('Léa Martin');
    expect(text).toContain('Noah Bernard');
    expect(text).toContain('1 matière');
    expect(text).toContain('Mathématiques');
    expect(text).toContain('Garder cette année');

    page.keep(page.impactsFor(block.key)[0]);
    fixture.detectChanges();
    expect(page.impactsFor(block.key).length).toBe(0);
    http.expectNone(profileUrl);

    page.onGradeChange(block.key, '1e primaire', { checked: false, source: { checked: false } } as MatCheckboxChange);
    http.expectOne((call) => call.url === previewUrl).flush(preview);
    page.confirmRemoval(page.impactsFor(block.key)[0]);
    expect(page.blocks()[0].grades).not.toContain('1e primaire');

    page.save();
    const put = http.expectOne(profileUrl);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      displayName: 'Ancien',
      schools: [{ schoolId: 1, grades: ['2e primaire'] }],
    });
    put.flush({
      ...saved,
      schools: [{ schoolId: 1, schoolName: 'Ecole Nouvelle', country: 'Belgique', grades: ['2e primaire'] }],
    });
  });

  it('demande l’aperçu de l’école avant de la retirer, et garder la laisse', () => {
    const block = page.blocks()[0];
    page.removeSchool(block.key);
    const request = http.expectOne((call) => call.method === 'GET' && call.url === previewUrl);
    expect(request.request.params.get('schoolId')).toBe('1');
    expect(request.request.params.has('grade')).toBe(false);
    request.flush({ ...preview, grade: undefined, studentCountLabel: '2 élèves', subjectCount: 1 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Garder cette école');
    page.keep(page.impactsFor(block.key)[0]);
    expect(page.blocks().length).toBe(1);
    http.expectNone(profileUrl);

    page.removeSchool(page.blocks()[0].key);
    http.expectOne((call) => call.url === previewUrl).flush({ ...preview, grade: undefined });
    page.confirmRemoval(page.impactsFor(page.blocks()[0].key)[0]);
    expect(page.blocks().length).toBe(0);
  });
});

function select(value: string | number): MatSelectChange {
  return { value, source: { value: null } } as unknown as MatSelectChange;
}
