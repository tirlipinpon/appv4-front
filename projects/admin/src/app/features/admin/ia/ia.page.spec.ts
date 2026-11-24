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
    flushBesoins();
    http.expectOne('http://localhost:8080/api/int/auth/me').flush({ displayName: 'Admin' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('montre une liste vide sans connexion d’exemple', () => {
    expect(fixture.nativeElement.textContent).toContain('Aucune connexion.');
    expect(fixture.nativeElement.textContent).toContain('Aucun besoin.');
    expect(fixture.nativeElement.textContent).not.toContain('openai');
    expect(fixture.nativeElement.querySelector('[data-testid="ia-key"]')).not.toBeNull();
  });

  it('affiche le besoin, la consommation et l’historique renvoyés', () => {
    page.ngOnInit();
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/connections')).flush({
      connections: [],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/catalog')).flush({
      catalogs: [],
      providers: [
        {
          code: 'openai',
          name: 'OpenAI',
          models: [{ id: 'openai/gpt-4o', name: 'GPT-4o', catalogs: ['openrouter'] }],
        },
      ],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/routes')).flush({
      routes: [
        { code: 'question-draft', label: 'Proposer des questions', provider: 'openai', model: 'depart', active: true },
      ],
      providers: ['openai'],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/usage')).flush({
      from: '2026-11-23',
      to: '2026-11-23',
      lines: [
        {
          date: '2026-11-23',
          code: 'question-draft',
          label: 'Proposer des questions',
          provider: 'openai',
          model: 'depart',
          calls: 1,
          tokens: 20,
        },
      ],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/route-changes')).flush({
      changes: [
        {
          code: 'question-draft',
          label: 'Proposer des questions',
          adminName: 'Ada',
          dateLabel: '24 novembre 2026',
          timeLabel: '00:30',
          oldProvider: 'openai',
          oldModel: 'depart',
          newProvider: 'openai',
          newModel: 'mini',
        },
      ],
    });
    fixture.detectChanges();

    const route = fixture.nativeElement.querySelector('[data-testid="ia-route-question-draft"]') as HTMLElement;
    expect(route.textContent).toContain('Proposer des questions');
    expect(route.textContent).toContain('Actif');
    expect(fixture.nativeElement.textContent).toContain('2026-11-23');
    expect(fixture.nativeElement.textContent).toContain('1 appels');
    expect(fixture.nativeElement.textContent).toContain('20 tokens');
    expect(fixture.nativeElement.textContent).toContain('Ada');
    expect(fixture.nativeElement.textContent).toContain('24 novembre 2026');
    expect(fixture.nativeElement.textContent).toContain('00:30');

    const model = route.querySelector('[data-testid="ia-route-model"]') as HTMLInputElement;
    model.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    const choices = route.querySelector('[data-testid="ia-route-models"]') as HTMLElement;
    expect(choices.textContent).toContain('GPT-4o');
    (choices.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((route.querySelector('[data-testid="ia-route-model"]') as HTMLInputElement).value).toBe('gpt-4o');
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
    flushBesoins();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('OpenRouter');
    expect(text).toContain('Clé Artificial Analysis absente.');
    const provider = fixture.nativeElement.querySelector('[data-testid="ia-provider"]') as HTMLInputElement;
    provider.value = 'qw';
    provider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const providerList = fixture.nativeElement.querySelector('[data-testid="ia-provider-suggestions"]') as HTMLElement;
    expect(providerList.textContent).toContain('Qwen');
    expect(providerList.textContent).not.toContain('DeepSeek');
    (providerList.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const opened = fixture.nativeElement.querySelector('[data-testid="ia-model-suggestions"]') as HTMLElement;
    expect(opened.textContent).toContain('Qwen4 Max');

    const model = fixture.nativeElement.querySelector('[data-testid="ia-model"]') as HTMLInputElement;
    model.value = 'max';
    model.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const modelList = fixture.nativeElement.querySelector('[data-testid="ia-model-suggestions"]') as HTMLElement;
    expect(modelList.textContent).toContain('Qwen4 Max');
    expect(modelList.textContent).not.toContain('DeepSeek Flash');
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
    flushBesoins();
    fixture.detectChanges();
  }

  function flushBesoins(): void {
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/routes')).flush({
      routes: [],
      providers: [],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/usage')).flush({
      from: '2026-11-23',
      to: '2026-11-23',
      lines: [],
    });
    http.expectOne((req) => req.method === 'GET' && req.url.endsWith('/admin/ai/route-changes')).flush({
      changes: [],
    });
  }
});
