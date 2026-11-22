import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HumeursPage } from './humeurs.page';

describe('HumeursPage', () => {
  let fixture: ComponentFixture<HumeursPage>;
  let page: HumeursPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HumeursPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HumeursPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((req) => req.method === 'GET' && req.url.includes('/admin/humeurs')).flush({ choices: [] });
    http.expectOne('http://localhost:8080/api/int/auth/me').flush({ displayName: 'Admin' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('montre une bibliothèque vide sans exemple', () => {
    expect(fixture.nativeElement.textContent).toContain('Aucune humeur.');
    expect(fixture.nativeElement.textContent).not.toContain('joie');
  });

  it('affiche un mot sans ajouter une icône', () => {
    reload([{ id: 1, word: 'calme' }]);

    const row = fixture.nativeElement.querySelector('[data-testid="humeur-1"]') as HTMLElement;
    expect(row.textContent).toContain('calme');
    expect(row.querySelector('[data-testid="humeur-choice-icon"]')).toBeNull();
  });

  it('affiche une icône sans ajouter un mot', () => {
    reload([{ id: 2, icon: '🙂' }]);

    const row = fixture.nativeElement.querySelector('[data-testid="humeur-2"]') as HTMLElement;
    expect(row.textContent).toContain('🙂');
    expect(row.querySelector('[data-testid="humeur-choice-word"]')).toBeNull();
  });

  it('garde l’ordre renvoyé', () => {
    reload([
      { id: 1, word: 'calme' },
      { id: 2, icon: '😊', word: 'joie' },
    ]);

    const rows = [...fixture.nativeElement.querySelectorAll('li')].map((item: HTMLElement) => item.textContent);
    expect(rows[0]).toContain('calme');
    expect(rows[1]).toContain('joie');
    expect(rows[1]).toContain('😊');
  });

  it('affiche le message de l’API et ne garde pas un choix refusé', () => {
    page.word.set('   ');
    page.save();
    http
      .expectOne((req) => req.method === 'POST' && req.url.endsWith('/admin/humeurs'))
      .flush({ message: 'Un choix a une icône, un mot, ou les deux.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Un choix a une icône, un mot, ou les deux.');
    expect(page.choices()).toEqual([]);
  });

  it('retire un choix après la relecture', () => {
    reload([{ id: 4, word: 'calme' }]);

    page.remove(page.choices()[0]);
    http.expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/admin/humeurs/4')).flush(null);
    http.expectOne((req) => req.method === 'GET' && req.url.includes('/admin/humeurs')).flush({ choices: [] });
    fixture.detectChanges();

    expect(page.choices()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Aucune humeur.');
  });

  function reload(choices: { id: number; icon?: string; word?: string }[]): void {
    page.ngOnInit();
    http.expectOne((req) => req.method === 'GET' && req.url.includes('/admin/humeurs')).flush({ choices });
    fixture.detectChanges();
  }
});
