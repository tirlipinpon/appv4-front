import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { TeacherProfileResponse } from '../../core/api/api-models';
import { TeacherSchoolsPage } from './teacher-schools.page';

const profileUrl = 'http://localhost:8080/api/int/teacher/profile';
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
    page.onCountry(block.key, 'Belgique');
    page.onSchool(block.key, 1);
    page.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choisis une classe pour cette école, ou retire-la.');
    http.expectNone(profileUrl);
  });

  it('enregistre les écoles en renvoyant le nom déjà connu', () => {
    page.addSchool();
    const block = page.blocks()[0];
    page.onCountry(block.key, 'Belgique');
    page.onSchool(block.key, 1);
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
});
