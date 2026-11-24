import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IaPage } from './ia.page';

describe('IaPage', () => {
  let fixture: ComponentFixture<IaPage>;
  let page: IaPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IaPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IaPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/connections')).flush({
      connections: [],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/catalog')).flush({
      catalogs: [],
      providers: [],
    });
    http.expectOne('http://localhost:8080/api/int/auth/me').flush({ displayName: 'Admin' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('montre une liste vide sans connexion d’exemple', () => {
    expect(fixture.nativeElement.textContent).toContain('Aucune connexion.');
    expect(fixture.nativeElement.textContent).not.toContain('openai');
    expect(fixture.nativeElement.querySelector('[data-testid="ia-key"]')).not.toBeNull();
  });

  it('propose les fournisseurs et les modèles renvoyés par les catalogues', () => {
    page.ngOnInit();
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/connections')).flush({
      connections: [],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/catalog')).flush({
      catalogs: [
        { code: 'openrouter', name: 'OpenRouter', available: true, message: '1 modèles' },
        { code: 'modelsdev', name: 'models.dev', available: true, message: '1 modèles' },
        {
          code: 'artificial-analysis',
          name: 'Artificial Analysis',
          available: false,
          message: 'Clé Artificial Analysis absente.',
        },
      ],
      providers: [
        { code: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-flash', name: 'DeepSeek Flash', catalogs: ['openrouter'] }] },
        { code: 'qwen', name: 'Qwen', models: [{ id: 'qwen4-max', name: 'Qwen4 Max', catalogs: ['modelsdev'] }] },
      ],
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('OpenRouter');
    expect(text).toContain('Clé Artificial Analysis absente.');
    const providers = fixture.nativeElement.querySelector('[data-testid="ia-provider"]') as HTMLSelectElement;
    expect(providers.textContent).toContain('DeepSeek');
    expect(providers.textContent).toContain('Qwen');
    providers.value = 'qwen';
    providers.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const models = fixture.nativeElement.querySelector('[data-testid="ia-model"]') as HTMLSelectElement;
    expect(models.textContent).toContain('Qwen4 Max');
    expect(models.textContent).not.toContain('DeepSeek Flash');
  });

  it('affiche le modèle et le fournisseur renvoyés, sans clé', () => {
    reload([{ id: 4, provider: 'openai', model: 'mini' }]);

    const row = fixture.nativeElement.querySelector('[data-testid="ia-connection-4"]') as HTMLElement;
    expect(row.textContent).toContain('mini');
    expect(row.textContent).toContain('openai');
    expect(row.textContent).not.toContain('secrete');
  });

  it('envoie la clé puis la retire du formulaire', () => {
    page.provider.set('openai');
    page.model.set('mini');
    page.apiKey.set('secrete');
    page.create();

    const created = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/admin/ai/connections'));
    expect(created.request.body).toEqual({ provider: 'openai', model: 'mini', apiKey: 'secrete' });
    created.flush({ id: 4, provider: 'openai', model: 'mini' });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/connections')).flush({
      connections: [{ id: 4, provider: 'openai', model: 'mini' }],
    });
    fixture.detectChanges();

    expect(page.apiKey()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('mini');
    expect(fixture.nativeElement.textContent).not.toContain('secrete');
  });

  it('affiche le message de l’API et n’ajoute pas la connexion refusée', () => {
    page.provider.set('autre');
    page.model.set('mini');
    page.apiKey.set('cle');
    page.create();
    http
      .expectOne((req) => req.method === 'POST' && req.url.endsWith('/admin/ai/connections'))
      .flush({ message: "Ce fournisseur n'a pas d'adaptateur." }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Ce fournisseur n'a pas d'adaptateur.");
    expect(page.connections()).toEqual([]);
  });

  it('montre le résultat de l’essai renvoyé', () => {
    reload([{ id: 4, provider: 'openai', model: 'mini' }]);

    (fixture.nativeElement.querySelector('[data-testid="ia-test"]') as HTMLButtonElement).click();
    http
      .expectOne((req) => req.method === 'POST' && req.url.endsWith('/admin/ai/connections/4/test'))
      .flush({ success: false, message: 'panne' });
    fixture.detectChanges();

    const trial = fixture.nativeElement.querySelector('[data-testid="ia-trial"]') as HTMLElement;
    expect(trial.textContent).toContain('panne');
  });

  function reload(connections: { id: number; provider: string; model: string }[]): void {
    page.ngOnInit();
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/connections')).flush({
      connections,
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/catalog')).flush({
      catalogs: [],
      providers: [],
    });
    fixture.detectChanges();
  }
});
