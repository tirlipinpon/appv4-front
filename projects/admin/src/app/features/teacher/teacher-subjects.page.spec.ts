import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { TeacherSubjectsResponse } from '../../core/api/api-models';
import { TeacherSubjectsPage } from './teacher-subjects.page';

const subjectsUrl = 'http://localhost:8080/api/int/teacher/subjects';
const invitesUrl = 'http://localhost:8080/api/int/teacher/subjects/transfer-invites';
const noticesUrl = 'http://localhost:8080/api/int/teacher/subjects/deactivate-notices';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';

const empty: TeacherSubjectsResponse = { schools: [] };

const loaded: TeacherSubjectsResponse = {
  schools: [
    {
      schoolId: 1,
      schoolName: 'École française',
      grades: [
        {
          grade: 'CE1',
          subjects: [{ id: 2, name: 'Lecture', active: true, ownedByMe: true, sharedWith: [] }],
        },
        {
          grade: 'CE2',
          subjects: [
            {
              id: 3,
              name: 'Mathématiques',
              active: true,
              ownedByMe: true,
              sharedWith: [{ userId: 10, displayName: 'Camille' }],
            },
          ],
        },
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

  function boot(body: TeacherSubjectsResponse, invites: unknown[] = [], notices: unknown[] = []): void {
    fixture.detectChanges();
    http.expectOne(subjectsUrl).flush(body);
    http.expectOne(invitesUrl).flush({ invites });
    http.expectOne(noticesUrl).flush({ notices });
    http.expectOne(spacesUrl).flush({ roles: ['teacher'], teacherRequest: 'none' });
    fixture.detectChanges();
  }

  function expectReload(body: TeacherSubjectsResponse = loaded): void {
    http.expectOne(subjectsUrl).flush(body);
    http.expectOne(invitesUrl).flush({ invites: [] });
    http.expectOne(noticesUrl).flush({ notices: [] });
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
    expect(fixture.nativeElement.textContent).toContain('Partagée avec Camille');

    page.onDraft(1, 'CE1', '   ');
    page.add(1, 'CE1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Le nom est obligatoire.');
    http.expectNone(subjectsUrl);

    page.onDraft(1, 'CE1', '  Français  ');
    page.add(1, 'CE1');
    const post = http.expectOne(subjectsUrl);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ schoolId: 1, grade: 'CE1', name: 'Français' });
    post.flush({ id: 8, name: 'Français', active: true, ownedByMe: true, sharedWith: [] });
    expectReload();
    fixture.detectChanges();

    expect(page.draft(1, 'CE1')).toBe('');
  });

  it('propose un partage via la liste des collègues', () => {
    boot(loaded);
    page.askTransfer({
      id: 2,
      name: 'Lecture',
      active: true,
      ownedByMe: true,
      sharedWith: [],
    });
    http.expectOne(`${subjectsUrl}/2/colleagues`).flush({
      colleagues: [{ userId: 10, displayName: 'Camille' }],
    });
    fixture.detectChanges();

    page.setTransferMode('share');
    page.setTransferColleague(10);
    page.prepareTransferConfirm(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Proposer de partager Lecture');

    page.confirmTransfer(2);
    const post = http.expectOne(`${subjectsUrl}/2/transfer`);
    expect(post.request.body).toEqual({ colleagueUserId: 10, mode: 'share' });
    post.flush(null);
    expectReload();
  });

  it('affiche une alerte et accepte une demande', () => {
    boot(loaded, [
      {
        id: 7,
        subjectId: 2,
        subjectName: 'Lecture',
        schoolId: 1,
        schoolName: 'École française',
        grade: 'CE1',
        mode: 'share',
        fromDisplayName: 'Anne',
      },
    ]);

    expect(fixture.nativeElement.textContent).toContain('Anne propose de partager Lecture');
    page.acceptInvite(7);
    const post = http.expectOne(`${invitesUrl}/7/accept`);
    expect(post.request.method).toBe('POST');
    post.flush(null);
    expectReload();
  });

  it('créateur choisit un co-prof à désactiver aussi', () => {
    boot(loaded);
    page.askDisable({
      id: 3,
      name: 'Mathématiques',
      active: true,
      ownedByMe: true,
      sharedWith: [{ userId: 10, displayName: 'Camille' }],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tu peux aussi la désactiver');
    page.toggleDisableAlso(10);
    page.confirmDisable(3);
    const post = http.expectOne(`${subjectsUrl}/3/deactivate`);
    expect(post.request.body).toEqual({ alsoUserIds: [10] });
    post.flush(null);
    expectReload();
  });

  it('affiche une alerte de désactivation et la ferme', () => {
    boot(loaded, [], [
      {
        id: 9,
        subjectId: 3,
        subjectName: 'Mathématiques',
        message: 'Anne a désactivé Mathématiques pour soi.',
      },
    ]);

    expect(fixture.nativeElement.textContent).toContain('Anne a désactivé Mathématiques pour soi.');
    page.dismissDeactivateNotice(9);
    const post = http.expectOne(`${noticesUrl}/9/dismiss`);
    expect(post.request.method).toBe('POST');
    post.flush(null);
    expectReload();
  });

  it('retire une matière partagée avec le bon message', () => {
    boot(loaded);
    page.askRemove({
      id: 3,
      name: 'Mathématiques',
      active: true,
      ownedByMe: true,
      sharedWith: [{ userId: 10, displayName: 'Camille' }],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Retirer Mathématiques de ta liste ? Camille la garde.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Déplacer vers un collègue');
    http.expectNone(`${subjectsUrl}/3/colleagues`);
    page.confirmRemove(3);
    const del = http.expectOne(`${subjectsUrl}/3`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    expectReload();
  });

  it('prévient le dernier détenteur et propose de déplacer', () => {
    boot(loaded);
    page.askRemove({
      id: 2,
      name: 'Lecture',
      active: true,
      ownedByMe: true,
      sharedWith: [],
    });
    http.expectOne(`${subjectsUrl}/2/colleagues`).flush({
      colleagues: [{ userId: 10, displayName: 'Camille' }],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('plus aucun professeur ne la verra');
    expect(fixture.nativeElement.textContent).toContain('Déplacer vers un collègue');

    page.chooseMoveInstead({
      id: 2,
      name: 'Lecture',
      active: true,
      ownedByMe: true,
      sharedWith: [],
    });
    fixture.detectChanges();
    expect(page.transferMode()).toBe('move');
    expect(page.transferColleagues().map((row) => row.displayName)).toEqual(['Camille']);
  });

  it('retire quand même si dernier détenteur sans collègue', () => {
    boot(loaded);
    page.askRemove({
      id: 2,
      name: 'Lecture',
      active: true,
      ownedByMe: true,
      sharedWith: [],
    });
    http.expectOne(`${subjectsUrl}/2/colleagues`).flush({ colleagues: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucun collègue avec cette classe.');
    expect(fixture.nativeElement.textContent).not.toContain('Déplacer vers un collègue');
    page.confirmRemove(2);
    http.expectOne(`${subjectsUrl}/2`).flush(null);
    expectReload();
  });
});
