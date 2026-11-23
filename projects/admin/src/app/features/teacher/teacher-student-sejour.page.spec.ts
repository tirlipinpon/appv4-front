import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/auth/auth.service';
import { TEACHER_ROUTES } from './teacher.routes';
import { TeacherStudentSejourPage } from './teacher-student-sejour.page';

const studentsUrl = 'http://localhost:8080/api/int/teacher/students';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

describe('TeacherStudentSejourPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([{ path: 'teacher', children: TEACHER_ROUTES }]),
      ],
    });
    TestBed.inject(AuthService).setToken(teacherToken());
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('montre le nom de l’élève et les libellés de séjour reçus', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/teacher/eleves/1', TeacherStudentSejourPage);

    http.expectOne(studentsUrl).flush({
      schools: [
        {
          schoolId: 1,
          schoolName: 'École du parc',
          grades: [
            {
              grade: 'CE1',
              students: [{ id: 1, firstName: 'Léa', lastName: 'Martin', age: 7 }],
            },
          ],
        },
      ],
    });
    const sejour = http.expectOne(`${studentsUrl}/1/sejours`);
    expect(sejour.request.method).toBe('GET');
    sejour.flush({
      sejours: [
        {
          dateLabel: '22 novembre 2026',
          timeLabel: '21:50',
          durationLabel: '1 min 30',
          lines: [
            { label: 'Accueil', durationLabel: '40 s' },
            { label: 'Combien font 2 + 2 ?', subjectName: 'Maths', durationLabel: '2 min' },
          ],
        },
      ],
    });
    flushHeader();
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="teacher-sejour-child"]')?.textContent).toContain('Léa');
    expect(root.querySelector('[data-testid="teacher-sejour-child"]')?.textContent).toContain('Martin');
    const row = root.querySelector('[data-testid="teacher-sejour-sejour"]') as HTMLElement;
    expect(row.textContent).toContain('22 novembre 2026');
    expect(row.textContent).toContain('21:50');
    expect(row.textContent).toContain('1 min 30');
    const lines = [...row.querySelectorAll('[data-testid="teacher-sejour-line"]')] as HTMLElement[];
    expect(lines.map((line) => line.querySelector('[data-testid="teacher-sejour-label"]')?.textContent)).toEqual([
      'Accueil',
      'Combien font 2 + 2 ?',
    ]);
    expect(lines[0].querySelector('[data-testid="teacher-sejour-subject"]')).toBeNull();
    expect(lines[0].textContent).toContain('40 s');
    expect(lines[1].querySelector('[data-testid="teacher-sejour-subject"]')?.textContent).toBe('Maths');
    expect(lines[1].textContent).toContain('2 min');
  });

  it('montre le nom et aucun exemple quand l’élève n’a pas de séjour', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/teacher/eleves/1', TeacherStudentSejourPage);

    http.expectOne(studentsUrl).flush({
      schools: [
        {
          schoolId: 1,
          grades: [{ grade: 'CE1', students: [{ id: 1, firstName: 'Léa', lastName: 'Martin', age: 7 }] }],
        },
      ],
    });
    http.expectOne(`${studentsUrl}/1/sejours`).flush({ sejours: [] });
    flushHeader();
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="teacher-sejour-child"]')?.textContent).toContain('Léa');
    expect(root.querySelector('[data-testid="teacher-sejour-child"]')?.textContent).toContain('Martin');
    expect(root.querySelectorAll('[data-testid="teacher-sejour-sejour"]').length).toBe(0);
    expect(root.textContent).not.toContain('40 s');
    expect(root.textContent).not.toContain('22 novembre 2026');
  });

  it('affiche le message renvoyé quand l’élève n’est pas dans les classes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/teacher/eleves/9', TeacherStudentSejourPage);

    http.expectOne(studentsUrl).flush({ schools: [] });
    http.expectOne(`${studentsUrl}/9/sejours`).flush(
      { message: "Cet élève n'est pas dans tes classes." },
      { status: 404, statusText: 'Not Found' },
    );
    flushHeader();
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    const sentence = "Cet élève n'est pas dans tes classes.";
    expect(root.querySelector('[data-testid="teacher-sejour-error"]')?.textContent?.trim()).toBe(sentence);
    expect(root.textContent?.split(sentence).length).toBe(2);
    expect(root.querySelector('[data-testid="teacher-sejour-child"]')).toBeNull();
    expect(root.querySelectorAll('[data-testid="teacher-sejour-sejour"]').length).toBe(0);
    expect(root.textContent).not.toContain('Temps indisponible.');
  });

  function flushHeader(): void {
    http.expectOne(accountUrl).flush({ displayName: 'Anne' });
    http.expectOne(spacesUrl).flush({ roles: ['teacher'], teacherRequest: 'none' });
  }
});

function teacherToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, activeRole: 'teacher', roles: ['teacher'] })).replace(/=+$/, '');
  return `e30.${body}.sig`;
}
