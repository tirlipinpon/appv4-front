import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { TeacherStudentsResponse } from '../../core/api/api-models';
import { TeacherStudentsPage } from './teacher-students.page';

const studentsUrl = 'http://localhost:8080/api/int/teacher/students';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

const empty: TeacherStudentsResponse = {
  noClassMessage: "Aucune classe à afficher tant que le profil n'a pas d'école.",
  schools: [],
};

const loaded: TeacherStudentsResponse = {
  noClassMessage: "Aucune classe à afficher tant que le profil n'a pas d'école.",
  schools: [
    {
      schoolId: 1,
      schoolName: 'École du parc',
      curriculumLabel: 'France',
      grades: [
        {
          grade: 'CE1',
          countLabel: '2 élèves',
          emptyMessage: 'Aucun élève inscrit dans cette classe.',
          students: [
            {
              id: 1,
              firstName: 'Léa',
              lastName: 'Martin',
              age: 7,
              avatarCode: 'owl',
              hasPhoto: false,
            },
            {
              id: 2,
              firstName: 'Tom',
              lastName: 'Martin',
              age: 7,
              avatarCode: 'fox',
              hasPhoto: true,
            },
          ],
        },
        {
          grade: 'CE2',
          countLabel: '0 élève',
          emptyMessage: 'Aucun élève inscrit dans cette classe.',
          students: [],
        },
      ],
    },
  ],
};

describe('TeacherStudentsPage', () => {
  let fixture: ComponentFixture<TeacherStudentsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherStudentsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherStudentsPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function boot(body: TeacherStudentsResponse): void {
    fixture.detectChanges();
    http.expectOne(studentsUrl).flush(body);
    http.expectOne(spacesUrl).flush({ roles: ['teacher'], teacherRequest: 'none' });
    http.expectOne(accountUrl).flush({ displayName: 'Anne' });
    const photo = http.match(`${studentsUrl}/2/photo`);
    for (const request of photo) {
      request.flush(new Blob(['img'], { type: 'image/png' }));
    }
    fixture.detectChanges();
  }

  it('dit qu’aucune classe n’est à afficher', () => {
    boot(empty);

    const main: HTMLElement = fixture.nativeElement.querySelector('main');
    expect(main.textContent).toContain("Aucune classe à afficher tant que le profil n'a pas d'école.");
    expect(main.querySelector('input, button, textarea')).toBeNull();
  });

  it('affiche les élèves de la classe et le groupe vide', () => {
    boot(loaded);

    const main: HTMLElement = fixture.nativeElement.querySelector('main');
    const text = main.textContent ?? '';
    expect(text).toContain('École du parc');
    expect(text).toContain('France — CE1');
    expect(text).toContain('2 élèves');
    expect(text).toContain('Martin Léa');
    expect(text).toContain('Martin Tom');
    expect(text).toContain('7 ans');
    expect(text).toContain('France — CE2');
    expect(text).toContain('0 élève');
    expect(text).toContain('Aucun élève inscrit dans cette classe.');
    expect(text).not.toContain('PIN');
    expect(main.querySelector('input, button, textarea')).toBeNull();
    expect(main.querySelectorAll('.student').length).toBe(2);
    expect(main.querySelector('.student img')).not.toBeNull();
  });
});
