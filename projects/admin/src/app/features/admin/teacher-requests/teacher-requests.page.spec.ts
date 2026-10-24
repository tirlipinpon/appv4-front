import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherRequestsPage } from './teacher-requests.page';

describe('TeacherRequestsPage', () => {
  let fixture: ComponentFixture<TeacherRequestsPage>;
  let page: TeacherRequestsPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherRequestsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherRequestsPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((req) => req.method === 'GET' && req.url.includes('/admin/teacher-requests'))
      .flush({
        requests: [{ id: 7, email: 'prof@exemple.com', displayName: 'Prof', status: 'pending' }],
      });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('garde la validation si le rechargement de la liste échoue', () => {
    page.approve(page.pending()[0]);
    http
      .expectOne((req) => req.method === 'POST' && req.url.endsWith('/admin/teacher-requests/7/approve'))
      .flush({ id: 7, email: 'prof@exemple.com', displayName: 'Prof', status: 'approved' });
    fixture.detectChanges();

    expect(page.pending().length).toBe(0);
    expect(page.approved().map((item) => item.id)).toEqual([7]);

    http
      .expectOne((req) => req.method === 'GET' && req.url.includes('/admin/teacher-requests'))
      .flush({ message: 'liste indisponible' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(page.approved().map((item) => item.id)).toEqual([7]);
    expect(page.pending().length).toBe(0);
    expect(page.approvingId()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("n'a pas pu être rechargée");
    expect(fixture.nativeElement.textContent).not.toContain('liste indisponible');
  });
});
