import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { TeacherProfileResponse } from '../../core/api/api-models';
import { TeacherProfilePage } from './teacher-profile.page';

const profileUrl = 'http://localhost:8080/api/int/teacher/profile';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

const loaded: TeacherProfileResponse = {
  email: 'prof@example.com',
  displayName: 'Ancien',
  schools: [{ schoolId: 1, schoolName: 'Ecole Nouvelle', country: 'Belgique', grades: ['1e primaire'] }],
  availableSchools: [
    { id: 1, name: 'Ecole Nouvelle', country: 'Belgique', grades: ['1e primaire', '2e primaire'] },
    { id: 2, name: 'Autre', country: 'Belgique', grades: ['1e primaire'] },
  ],
};

describe('TeacherProfilePage', () => {
  let fixture: ComponentFixture<TeacherProfilePage>;
  let page: TeacherProfilePage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherProfilePage);
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

  it('conserve la saisie faite pendant la sauvegarde et n’affiche pas Enregistré', () => {
    page.onName('Version envoyee');
    page.save();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="displayName"]');
    expect(page.saving()).toBeTrue();
    expect(input.disabled).toBeTrue();

    const put = http.expectOne(profileUrl);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      displayName: 'Version envoyee',
      schools: [{ schoolId: 1, grades: ['1e primaire'] }],
      contactEmail: '',
      phone: '',
      avatarCode: '',
    });

    page.onName('Modification pendant sauvegarde');
    put.flush({ ...loaded, displayName: 'Version envoyee' });
    fixture.detectChanges();

    expect(page.displayName()).toBe('Modification pendant sauvegarde');
    expect(page.saving()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.ok')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("n'est pas encore enregistrée");
  });

  it('affiche Enregistré quand la réponse correspond encore à l’écran', () => {
    page.onName('Version envoyee');
    page.save();
    http.expectOne(profileUrl).flush({ ...loaded, displayName: 'Version envoyee' });
    fixture.detectChanges();

    expect(page.displayName()).toBe('Version envoyee');
    expect(fixture.nativeElement.querySelector('.who')?.textContent?.trim()).toBe(
      'Version envoyee',
    );
    expect(fixture.nativeElement.querySelector('.ok')?.textContent).toContain('Enregistré');
    expect(page.saving()).toBeFalse();
  });

  it('signale un nom vide ou trop long sans appeler l’API', () => {
    page.onName('   ');
    page.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Le nom est obligatoire.');
    http.expectNone(profileUrl);

    page.onName('x'.repeat(256));
    page.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Le nom est trop long (maximum 255).');
    http.expectNone(profileUrl);
  });

  it('restaure l’écran si l’enregistrement échoue', () => {
    page.onName('Version envoyee');
    page.save();
    expect(page.saving()).toBeTrue();

    http.expectOne(profileUrl).flush(
      { message: 'Enregistrement impossible.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="displayName"]');
    expect(page.saving()).toBeFalse();
    expect(page.saved()).toBeFalse();
    expect(page.displayName()).toBe('Version envoyee');
    expect(input.disabled).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Enregistrement impossible.');
  });
});
