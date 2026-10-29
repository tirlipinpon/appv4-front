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
const accountUrl = 'http://localhost:8080/api/int/auth/me';

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
    http.expectOne(accountUrl).flush({ displayName: 'Anne' });
    fixture.detectChanges();
  }

  function flushFollowers(
    subjectId: number,
    body: { childCount: number; warning: string; names: string[] } = {
      childCount: 2,
      warning: '2 enfants suivent ce cours.',
      names: ['Léa Martin', 'Tom Bernard'],
    },
  ): void {
    const req = http.expectOne(`${subjectsUrl}/${subjectId}/followers`);
    expect(req.request.method).toBe('GET');
    req.flush(body);
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

  it('propose de réactiver une matière retirée du même nom', () => {
    boot(loaded);

    page.onDraft(2, '3e primaire', 'Calcul');
    page.add(2, '3e primaire');
    http.expectOne(subjectsUrl).flush(
      { message: 'Cette matière a été retirée. Tu peux la réactiver.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Cette matière a été retirée. Tu peux la réactiver.',
    );
    expect(page.canRestore(2, '3e primaire')).toBe(true);

    page.restore(2, '3e primaire');
    const restore = http.expectOne(`${subjectsUrl}/restore`);
    expect(restore.request.method).toBe('POST');
    expect(restore.request.body).toEqual({ schoolId: 2, grade: '3e primaire', name: 'Calcul' });
    restore.flush({ id: 9, name: 'Calcul', active: true, ownedByMe: true, sharedWith: [] });
    expectReload({
      schools: [
        {
          schoolId: 2,
          schoolName: 'École belge',
          grades: [
            {
              grade: '3e primaire',
              subjects: [{ id: 9, name: 'Calcul', active: true, ownedByMe: true, sharedWith: [] }],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    expect(page.draft(2, '3e primaire')).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Calcul');
  });

  it('propose de demander le partage quand le nom existe déjà', () => {
    boot(loaded);

    page.onDraft(2, '3e primaire', 'Calcul');
    page.add(2, '3e primaire');
    http.expectOne(subjectsUrl).flush(
      { message: 'Une matière de ce nom existe déjà. Tu peux demander à Anne de la partager.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('demander à Anne de la partager');
    expect(page.canAskShare(2, '3e primaire')).toBe(true);

    page.requestShare(2, '3e primaire');
    const ask = http.expectOne(`${subjectsUrl}/share-requests`);
    expect(ask.request.method).toBe('POST');
    expect(ask.request.body).toEqual({ schoolId: 2, grade: '3e primaire', name: 'Calcul' });
    ask.flush(null);
    fixture.detectChanges();

    expect(page.canAskShare(2, '3e primaire')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Demande envoyée.');
  });

  it('propose aussi le partage quand le nom ressemble à une matière existante', () => {
    boot(loaded);

    page.onDraft(2, '3e primaire', 'Maths');
    page.add(2, '3e primaire');
    http.expectOne(subjectsUrl).flush(
      { message: 'Ce nom ressemble à Mathématiques. Tu peux demander à Anne de la partager.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(page.canAskShare(2, '3e primaire')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Ce nom ressemble à Mathématiques');
    expect(fixture.nativeElement.textContent).not.toContain('Réactiver');
  });

  it('explique une demande de partage reçue', () => {
    boot(loaded, [
      {
        id: 8,
        subjectId: 2,
        subjectName: 'Lecture',
        schoolId: 1,
        schoolName: 'École française',
        grade: 'CE1',
        mode: 'ask',
        fromDisplayName: 'Camille',
      },
    ]);

    expect(fixture.nativeElement.textContent).toContain(
      'Camille demande à voir aussi Lecture (École française, CE1). Si tu acceptes, vous la partagerez.',
    );
  });

  it('propose un partage via la liste des collègues', () => {
    boot(loaded);
    page.askTransfer({
      id: 2,
      name: 'Lecture',
      active: true,
      ownedByMe: true,
      followedByMe: true,
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

  it('retire une matière partagée avec le bon message', () => {
    boot(loaded);
    page.askRemove({
      id: 3,
      name: 'Mathématiques',
      active: true,
      ownedByMe: true,
      followedByMe: true,
      sharedWith: [{ userId: 10, displayName: 'Camille' }],
    });
    flushFollowers(3, { childCount: 1, warning: '1 enfant suit ce cours.', names: ['Léa Martin'] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Retirer Mathématiques de ta liste ? Camille la garde.',
    );
    expect(fixture.nativeElement.textContent).toContain('1 enfant suit ce cours.');
    expect(fixture.nativeElement.textContent).toContain('Léa Martin');
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
      followedByMe: true,
      sharedWith: [],
    });
    http.expectOne(`${subjectsUrl}/2/colleagues`).flush({
      colleagues: [{ userId: 10, displayName: 'Camille' }],
    });
    flushFollowers(2);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('plus aucun professeur ne la verra');
    expect(fixture.nativeElement.textContent).toContain('Déplacer vers un collègue');

    page.chooseMoveInstead({
      id: 2,
      name: 'Lecture',
      active: true,
      ownedByMe: true,
      followedByMe: true,
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
      followedByMe: true,
      sharedWith: [],
    });
    http.expectOne(`${subjectsUrl}/2/colleagues`).flush({ colleagues: [] });
    flushFollowers(2, { childCount: 0, warning: 'Aucun enfant ne suit ce cours.', names: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucun enfant ne suit ce cours.');
    expect(fixture.nativeElement.textContent).toContain('Aucun collègue avec cette classe.');
    expect(fixture.nativeElement.textContent).not.toContain('Déplacer vers un collègue');
    page.confirmRemove(2);
    http.expectOne(`${subjectsUrl}/2`).flush(null);
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

  it('affiche une matière déjà suivie par un collègue sans les actions de la sienne', () => {
    boot({
      schools: [
        {
          schoolId: 1,
          schoolName: 'École française',
          grades: [
            {
              grade: 'CE1',
              subjects: [
                {
                  id: 2,
                  name: 'Lecture',
                  active: true,
                  ownedByMe: true,
                  followedByMe: true,
                  sharedWith: [],
                },
                {
                  id: 4,
                  name: 'Mathématiques',
                  active: true,
                  ownedByMe: false,
                  followedByMe: false,
                  sharedWith: [{ userId: 10, displayName: 'Camille' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.subject') as NodeListOf<HTMLElement>);
    const lecture = rows.find((row) => row.textContent?.includes('Lecture'));
    const maths = rows.find((row) => row.textContent?.includes('Mathématiques'));
    expect(lecture?.textContent).toContain('Renommer');
    expect(lecture?.textContent).toContain('Retirer');
    expect(lecture?.textContent).not.toContain('Désactiver');
    expect(maths?.textContent).toContain('Suivie par Camille');
    expect(maths?.textContent).not.toContain('Renommer');
    expect(maths?.textContent).not.toContain('Retirer');
    expect(maths?.textContent).not.toContain('Transférer');
    expect(maths?.textContent).toContain('Demander le partage');

    maths?.querySelector('button')?.click();
    const ask = http.expectOne(`${subjectsUrl}/share-requests`);
    expect(ask.request.method).toBe('POST');
    expect(ask.request.body).toEqual({ schoolId: 1, grade: 'CE1', name: 'Mathématiques' });
    ask.flush(null);
    expectReload({
      schools: [
        {
          schoolId: 1,
          schoolName: 'École française',
          grades: [
            {
              grade: 'CE1',
              subjects: [
                {
                  id: 4,
                  name: 'Mathématiques',
                  active: true,
                  ownedByMe: false,
                  followedByMe: false,
                  sharedWith: [{ userId: 10, displayName: 'Camille' }],
                  shareAskedTo: [{ userId: 9, displayName: 'Anne' }],
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Demande de partage déjà envoyée à Anne.');
    expect(fixture.nativeElement.textContent).not.toContain('Demander le partage');
  });

  it('remplace Demander le partage par les noms déjà sollicités', () => {
    boot({
      schools: [
        {
          schoolId: 1,
          schoolName: 'École française',
          grades: [
            {
              grade: 'CE1',
              subjects: [
                {
                  id: 4,
                  name: 'Mathématiques',
                  active: true,
                  ownedByMe: false,
                  followedByMe: false,
                  sharedWith: [{ userId: 10, displayName: 'Camille' }],
                  shareAskedTo: [
                    { userId: 9, displayName: 'Anne' },
                    { userId: 11, displayName: 'luc2' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(fixture.nativeElement.textContent).toContain('Demande de partage déjà envoyée à Anne, luc2.');
    expect(fixture.nativeElement.textContent).not.toContain('Demander le partage');
  });

  it('réserve Renommer au créateur, même quand un collègue suit aussi la matière', () => {
    boot({
      schools: [
        {
          schoolId: 1,
          schoolName: 'École française',
          grades: [
            {
              grade: 'CE1',
              subjects: [
                {
                  id: 2,
                  name: 'Lecture',
                  active: true,
                  ownedByMe: true,
                  followedByMe: true,
                  sharedWith: [{ userId: 10, displayName: 'Camille' }],
                  owner: { userId: 2, displayName: 'Martin' },
                },
                {
                  id: 4,
                  name: 'Mathématiques',
                  active: true,
                  ownedByMe: false,
                  followedByMe: true,
                  sharedWith: [
                    { userId: 9, displayName: 'Anne' },
                    { userId: 11, displayName: 'luc2' },
                  ],
                  owner: { userId: 9, displayName: 'Anne' },
                },
                {
                  id: 5,
                  name: 'Sciences',
                  active: true,
                  ownedByMe: false,
                  followedByMe: true,
                  sharedWith: [],
                  owner: { userId: 12, displayName: 'Luc' },
                },
              ],
            },
          ],
        },
      ],
    });

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.subject') as NodeListOf<HTMLElement>);
    const lecture = rows.find((row) => row.textContent?.includes('Lecture'));
    const maths = rows.find((row) => row.textContent?.includes('Mathématiques'));
    const sciences = rows.find((row) => row.textContent?.includes('Sciences'));
    expect(lecture?.textContent).toContain('Renommer');
    expect(lecture?.textContent).toContain('Retirer');
    expect(lecture?.textContent).toContain('Transférer');
    expect(lecture?.querySelector('strong.owner')).toBeNull();
    expect(maths?.textContent).toContain('Partagée avec');
    expect(maths?.textContent).toContain('Anne');
    expect(maths?.textContent).toContain('luc2');
    expect(Array.from(maths?.querySelectorAll('strong') ?? []).map((node) => node.textContent)).toEqual(['Anne']);
    expect(maths?.textContent).not.toContain('Renommer');
    expect(maths?.textContent).toContain('Retirer');
    expect(maths?.textContent).toContain('Transférer');
    expect(sciences?.querySelector('strong.owner')?.textContent).toBe('Luc');
  });
});
