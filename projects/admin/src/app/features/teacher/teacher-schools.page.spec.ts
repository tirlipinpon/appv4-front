import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
    http.expectOne((request) => request.url.endsWith('/schools'))
      .flush({ schools: loaded.availableSchools, nextCursor: null });
    page.onSchoolChange(block.key, select(1));
    page.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choisis une classe pour cette école, ou retire-la.');
    http.expectNone(profileUrl);
  });

  it('parcourt les ecoles et conserve la selection hors de la page suivante', () => {
    page.addSchool();
    const block = page.blocks()[0];
    page.onCountryChange(block.key, select('Belgique'));
    http.expectOne((request) => request.url.endsWith('/schools')).flush({
      schools: loaded.availableSchools, nextCursor: 1,
    });
    page.onSchoolChange(block.key, select(1));
    page.moreSchools(block.key);
    const request = http.expectOne((item) => item.url.endsWith('/schools'));
    expect(request.request.params.get('afterId')).toBe('1');
    request.flush({ schools: [], nextCursor: null });
    expect(page.gradesFor(page.blocks()[0])).toContain('1e primaire');
    expect(page.optionsFor(page.blocks()[0]).some((school) => school.id === 1)).toBeTrue();
  });

  it('enregistre les écoles en renvoyant le nom déjà connu', () => {
    page.addSchool();
    const block = page.blocks()[0];
    page.onCountryChange(block.key, select('Belgique'));
    http.expectOne((request) => request.url.endsWith('/schools'))
      .flush({ schools: loaded.availableSchools, nextCursor: null });
    page.onSchoolChange(block.key, select(1));
    page.toggleGrade(block.key, '1e primaire', true);
    page.save();

    const put = http.expectOne(profileUrl);
    expect(put.request.body).toEqual({
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
    http.expectOne((request) => request.url.endsWith('/schools'))
      .flush({ schools: loaded.availableSchools, nextCursor: null });
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

  it('affiche une école déjà choisie, et place Ajouter une école au-dessus', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Ecole Nouvelle');
    expect(root.textContent).toContain('Belgique');
    expect(root.textContent).toContain('Modifier');
    expect(root.textContent).toContain('Supprimer');
    expect(root.textContent).not.toContain('Rechercher une école');
    expect(root.textContent).not.toContain('Enregistrer');
    expect(root.querySelector('mat-card-actions')).toBeNull();

    const add = [...root.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Ajouter une école'),
    );
    const school = root.querySelector('article.school');
    expect(add).withContext('bouton ajouter').not.toBeNull();
    expect(school).withContext('école').not.toBeNull();
    expect(Boolean(add!.compareDocumentPosition(school!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTrue();

    const grades = root.querySelector('.grades') as HTMLElement;
    expect(getComputedStyle(grades).flexDirection).toBe('row');
    expect(getComputedStyle(grades).flexWrap).toBe('wrap');
    expect(grades.textContent).toContain('1e primaire');
    expect(grades.textContent).toContain('2e primaire');
    expect(grades.querySelector('mat-checkbox')).toBeNull();
    expect(grades.querySelectorAll('.grade-wrap').length).toBe(2);
  });

  it('montre le même aperçu au survol d’une classe affichée', () => {
    const grades = fixture.nativeElement.querySelector('.grades') as HTMLElement;
    const wrap = grades.querySelector('.grade-wrap') as HTMLElement;
    expect(wrap.textContent).toContain('1e primaire');
    wrap.dispatchEvent(new MouseEvent('mouseenter'));

    const request = http.expectOne((call) => call.method === 'GET' && call.url === previewUrl);
    expect(request.request.params.get('schoolId')).toBe('1');
    expect(request.request.params.get('grade')).toBe('1e primaire');
    request.flush(preview);
    fixture.detectChanges();

    const tip = grades.querySelector('.impact-tip');
    expect(tip).not.toBeNull();
    expect(tip?.textContent).toContain('2 élèves');
    expect(tip?.textContent).toContain('Léa Martin');
    expect(tip?.textContent).toContain('1 matière');
    expect(tip?.textContent).toContain('Mathématiques');

    wrap.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(grades.querySelector('.impact-tip')).toBeNull();
  });

  it('ouvre le formulaire et aligne les classes après Modifier', () => {
    page.editSchool(page.blocks()[0].key);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Rechercher une école');
    const article = root.querySelector('article.school') as HTMLElement;
    expect(article.textContent).toContain('Annuler');
    expect(article.textContent).toContain('Enregistrer');
    expect(root.querySelector('mat-card-actions')).toBeNull();
    const grades = root.querySelector('.grades') as HTMLElement;
    expect(getComputedStyle(grades).flexDirection).toBe('row');
    expect(getComputedStyle(grades).flexWrap).toBe('wrap');
    expect(grades.querySelectorAll('mat-checkbox').length).toBe(2);
  });

  it('annule la modification et retrouve l’école enregistrée', () => {
    const block = page.blocks()[0];
    page.editSchool(block.key);
    page.onGradeChange(block.key, '1e primaire', { checked: false, source: { checked: false } } as MatCheckboxChange);
    expect(page.blocks()[0].grades).not.toContain('1e primaire');
    http.expectNone(previewUrl);

    page.cancelEdit(block.key);
    fixture.detectChanges();

    expect(page.blocks()[0].grades).toEqual(['1e primaire', '2e primaire']);
    expect(page.blocks()[0].editing).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Rechercher une école');
    http.expectNone(profileUrl);
  });

  it('place le formulaire d’une nouvelle école juste sous le bouton', () => {
    page.addSchool();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const add = [...root.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Ajouter une école'),
    );
    const articles = [...root.querySelectorAll('article.school')];
    expect(add).not.toBeNull();
    expect(articles.length).toBe(2);
    expect(articles[0].textContent).toContain('Rechercher une école');
    expect(articles[1].textContent).toContain('Ecole Nouvelle');
    expect(Boolean(add!.compareDocumentPosition(articles[0]) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTrue();
    expect(Boolean(articles[0].compareDocumentPosition(articles[1]) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTrue();
  });

  it('annule une école nouvelle sans l’enregistrer', () => {
    page.addSchool();
    expect(page.blocks().length).toBe(2);

    page.cancelEdit(page.blocks()[1].key);

    expect(page.blocks().length).toBe(1);
    expect(page.blocks()[0].schoolId).toBe(1);
    http.expectNone(profileUrl);
  });

  it('conserve une ecole enregistree absente des resultats de recherche', fakeAsync(() => {
    const block = page.blocks()[0];
    page.onSchoolSearch(block.key, { target: { value: 'autre' } } as unknown as Event);
    tick(300);
    http.expectOne((request) => request.url.endsWith('/schools')).flush({ schools: [], nextCursor: null });
    expect(page.gradesFor(block)).toContain('1e primaire');
    expect(page.optionsFor(block).some((school) => school.id === 1)).toBeTrue();
  }));

  it('montre les élèves et la matière au survol, et décoche sans bouton de confirmation', () => {
    const block = page.blocks()[0];
    page.editSchool(block.key);
    fixture.detectChanges();
    page.showGradeTip(block, '1e primaire');

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
    expect(text).not.toContain('Garder cette année');
    expect(text).not.toContain('Retirer quand même');

    page.hideTip();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.impact-tip')).toBeNull();

    page.onGradeChange(block.key, '1e primaire', { checked: false, source: { checked: false } } as MatCheckboxChange);
    expect(page.blocks()[0].grades).not.toContain('1e primaire');
    http.expectNone(previewUrl);

    page.save();
    const put = http.expectOne(profileUrl);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      schools: [{ schoolId: 1, grades: ['2e primaire'] }],
    });
    put.flush({
      ...saved,
      schools: [{ schoolId: 1, schoolName: 'Ecole Nouvelle', country: 'Belgique', grades: ['2e primaire'] }],
    });
  });

  it('montre l’aperçu de l’école au survol de Supprimer, puis la retire sans confirmation', () => {
    const block = page.blocks()[0];
    page.showSchoolTip(block);
    const request = http.expectOne((call) => call.method === 'GET' && call.url === previewUrl);
    expect(request.request.params.get('schoolId')).toBe('1');
    expect(request.request.params.has('grade')).toBe(false);
    request.flush({ ...preview, grade: undefined, studentCountLabel: '2 élèves', subjectCount: 1 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 élèves');
    expect(fixture.nativeElement.textContent).not.toContain('Garder cette école');
    expect(page.blocks().length).toBe(1);

    page.removeSchool(block.key);
    expect(page.blocks().length).toBe(0);
    http.expectNone(profileUrl);
  });
});

function select(value: string | number): MatSelectChange {
  return { value, source: { value: null } } as unknown as MatSelectChange;
}
