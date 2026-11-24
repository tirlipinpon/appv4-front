import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type {
  ChangeResponse,
  ConnexionResponse,
  EssaiResponse,
  FournisseurResponse,
  LectureResponse,
  ModeleResponse,
  RouteResponse,
  UsageLineResponse,
} from '../../../core/api/api-models';
import { SpaceHeader } from '../../../core/layout/space-header';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { AdminSectionNav } from '../../../core/layout/admin-section-nav/admin-section-nav';
import { AiConnectionsService } from './data-access/ai-connections.service';
import { AiRoutesService } from './data-access/ai-routes.service';

/**
 * Zone pour régler les besoins, lire la consommation, et essayer une connexion.
 * Les noms, les paires, les totaux et les dates viennent de l'API.
 */
@Component({
  selector: 'app-ia-page',
  imports: [MatButtonModule, SpaceHeader, AdminSectionNav],
  templateUrl: './ia.page.html',
  styleUrl: './ia.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IaPage implements OnInit {
  private readonly api = inject(AiConnectionsService);
  private readonly routesApi = inject(AiRoutesService);

  readonly connections = signal<ConnexionResponse[]>([]);
  readonly catalogs = signal<LectureResponse[]>([]);
  readonly providers = signal<FournisseurResponse[]>([]);
  readonly providerQuery = signal('');
  readonly provider = signal('');
  readonly modelQuery = signal('');
  readonly model = signal('');
  readonly apiKey = signal('');
  readonly routes = signal<RouteResponse[]>([]);
  readonly adapters = signal<string[]>([]);
  readonly besoinCode = signal('');
  readonly besoinLabel = signal('');
  readonly besoinProvider = signal('');
  readonly besoinModel = signal('');
  readonly usageFrom = signal('');
  readonly usageTo = signal('');
  readonly usageLines = signal<UsageLineResponse[]>([]);
  readonly changes = signal<ChangeResponse[]>([]);
  readonly routeModelOpen = signal<string | null>(null);
  readonly routeModelQuery = signal<Record<string, string>>({});
  readonly routeModelDraft = signal<Record<string, string>>({});
  readonly error = signal<string | null>(null);
  readonly trials = signal<Record<number, EssaiResponse>>({});
  readonly loading = signal(true);

  readonly providerSuggestions = computed(() => {
    const query = this.providerQuery().trim().toLowerCase();
    if (query.length === 0 || this.providerChosen(query)) {
      return [];
    }
    return this.providers().filter((item) => this.providerMatchesQuery(item, query)).slice(0, 8);
  });

  readonly modelSuggestions = computed(() => {
    const selected = this.providers().find((item) => item.code === this.provider());
    if (selected == null) {
      return [];
    }
    const models = selected.models ?? [];
    const query = this.modelQuery().trim().toLowerCase();
    if (query.length === 0) {
      return models.slice(0, 12);
    }
    if (this.modelChosen(selected, query)) {
      return [];
    }
    return models.filter((item) => this.modelMatches(item, query)).slice(0, 12);
  });

  ngOnInit(): void {
    this.reload();
    this.loadCatalog();
    this.loadRoutes();
    this.loadUsage('', '');
    this.loadChanges();
  }

  inputValue(event: Event): string {
    const target = event.target;
    return target instanceof HTMLInputElement ? target.value : '';
  }

  selectValue(event: Event): string {
    const target = event.target;
    return target instanceof HTMLSelectElement ? target.value : '';
  }

  chooseProvider(event: Event): void {
    this.typeProvider(this.inputValue(event));
  }

  pickProvider(item: FournisseurResponse): void {
    this.provider.set(item.code ?? '');
    this.providerQuery.set(item.name ?? item.code ?? '');
    this.model.set('');
    this.modelQuery.set('');
  }

  typeModel(value: string): void {
    this.modelQuery.set(value);
    const selected = this.providers().find((item) => item.code === this.provider());
    const match = (selected?.models ?? []).find((item) => this.sameText(item.name, value) || this.sameText(item.id, value));
    this.model.set(match?.id ?? value);
  }

  pickModel(item: ModeleResponse): void {
    this.model.set(item.id ?? '');
    this.modelQuery.set(item.name ?? item.id ?? '');
  }

  createBesoin(): void {
    this.error.set(null);
    this.routesApi
      .create({
        code: this.besoinCode(),
        label: this.besoinLabel(),
        provider: this.besoinProvider(),
        model: this.besoinModel(),
      })
      .subscribe({
        next: () => {
          this.besoinCode.set('');
          this.besoinLabel.set('');
          this.besoinModel.set('');
          this.loadRoutes();
          this.loadChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(httpErrorMessage(err, "Le besoin n'a pas pu être enregistré."));
          this.loadRoutes();
        },
      });
  }

  changeRoute(route: RouteResponse, event: Event): void {
    event.preventDefault();
    if (route.code == null) {
      return;
    }
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const data = new FormData(form);
    const provider = String(data.get('provider') ?? '');
    const model = String(data.get('model') ?? '');
    this.error.set(null);
    this.routesApi.change(route.code, provider, model).subscribe({
      next: () => {
        this.loadRoutes();
        this.loadChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, "Le modèle n'a pas pu être changé."));
        this.loadRoutes();
      },
    });
  }

  toggle(route: RouteResponse): void {
    if (route.code == null) {
      return;
    }
    this.error.set(null);
    this.routesApi.active(route.code, route.active !== true).subscribe({
      next: () => this.loadRoutes(),
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, "Le besoin n'a pas pu être modifié."));
      },
    });
  }

  focusRouteModel(route: RouteResponse): void {
    this.routeModelOpen.set(route.code ?? null);
  }

  typeRouteModel(route: RouteResponse, event: Event): void {
    const code = route.code ?? '';
    this.routeModelOpen.set(code);
    const value = this.inputValue(event);
    this.routeModelDraft.update((current) => ({ ...current, [code]: value }));
    this.routeModelQuery.update((current) => ({ ...current, [code]: value }));
  }

  pickRouteModel(route: RouteResponse, item: ModeleResponse): void {
    const code = route.code ?? '';
    const id = this.callableModelId(route.provider ?? '', item);
    this.routeModelDraft.update((current) => ({ ...current, [code]: id }));
    this.routeModelQuery.update((current) => ({ ...current, [code]: '' }));
    this.routeModelOpen.set(null);
  }

  shownRouteModel(route: RouteResponse): string {
    const code = route.code ?? '';
    return this.routeModelDraft()[code] ?? route.model ?? '';
  }

  routeSuggestions(route: RouteResponse): ModeleResponse[] {
    if (this.routeModelOpen() !== route.code) {
      return [];
    }
    const models = this.modelsOf(route.provider ?? '');
    const query = (this.routeModelQuery()[route.code ?? ''] ?? '').trim().toLowerCase();
    const matched = query.length === 0 ? models : models.filter((item) => this.modelMatches(item, query));
    return (matched.length > 0 ? matched : models).slice(0, 12);
  }

  readUsage(event: Event): void {
    event.preventDefault();
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const data = new FormData(form);
    this.loadUsage(String(data.get('from') ?? ''), String(data.get('to') ?? ''));
  }

  create(): void {
    this.error.set(null);
    this.api
      .create({
        provider: this.provider(),
        model: this.model(),
        apiKey: this.apiKey(),
      })
      .subscribe({
        next: () => {
          this.apiKey.set('');
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(httpErrorMessage(err, "La connexion n'a pas pu être enregistrée."));
        },
      });
  }

  test(connection: ConnexionResponse): void {
    if (connection.id == null) {
      return;
    }
    const id = connection.id;
    this.error.set(null);
    this.api.test(id).subscribe({
      next: (result) => {
        this.trials.update((current) => ({ ...current, [id]: result }));
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, "L'essai n'a pas pu partir."));
      },
    });
  }

  trial(id: number | undefined): EssaiResponse | null {
    if (id == null) {
      return null;
    }
    return this.trials()[id] ?? null;
  }

  private modelsOf(provider: string): ModeleResponse[] {
    const selected = this.providers().find((item) => this.sameText(item.code, provider));
    return selected?.models ?? [];
  }

  private callableModelId(provider: string, item: ModeleResponse): string {
    const id = item.id ?? '';
    const prefix = provider.trim().toLowerCase() + '/';
    return id.toLowerCase().startsWith(prefix) ? id.slice(prefix.length) : id;
  }

  private typeProvider(value: string): void {
    this.providerQuery.set(value);
    const match = this.providers().find(
      (item) => this.sameText(item.name, value) || this.sameText(item.code, value),
    );
    if (match?.code !== this.provider()) {
      this.model.set('');
      this.modelQuery.set('');
    }
    this.provider.set(match?.code ?? value);
  }

  private providerChosen(query: string): boolean {
    const selected = this.providers().find((item) => item.code === this.provider());
    return selected != null && (selected.name ?? selected.code ?? '').toLowerCase() === query;
  }

  private providerMatchesQuery(item: FournisseurResponse, query: string): boolean {
    return (item.name ?? '').toLowerCase().includes(query) || (item.code ?? '').toLowerCase().includes(query);
  }

  private modelChosen(selected: FournisseurResponse, query: string): boolean {
    const model = (selected.models ?? []).find((item) => item.id === this.model());
    if (model == null) {
      return false;
    }
    return (model.name ?? model.id ?? '').toLowerCase() === query;
  }

  private sameText(left: string | undefined, right: string): boolean {
    return (left ?? '').toLowerCase() === right.trim().toLowerCase();
  }

  private modelMatches(item: ModeleResponse, query: string): boolean {
    return (item.name ?? '').toLowerCase().includes(query) || (item.id ?? '').toLowerCase().includes(query);
  }

  private reload(): void {
    this.api.list().subscribe({
      next: (connections) => {
        this.connections.set(connections);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Connexions indisponibles.'));
      },
    });
  }

  private loadCatalog(): void {
    this.api.catalog().subscribe({
      next: (body) => {
        this.catalogs.set(body.catalogs ?? []);
        this.providers.set(body.providers ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, 'Catalogue indisponible.'));
      },
    });
  }

  private loadRoutes(): void {
    this.routesApi.list().subscribe({
      next: (body) => {
        this.routes.set(body.routes ?? []);
        this.adapters.set(body.providers ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, 'Besoins indisponibles.'));
      },
    });
  }

  private loadUsage(from: string, to: string): void {
    this.routesApi.usage(from, to).subscribe({
      next: (body) => {
        this.usageFrom.set(body.from ?? '');
        this.usageTo.set(body.to ?? '');
        this.usageLines.set(body.lines ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, 'Consommation indisponible.'));
      },
    });
  }

  private loadChanges(): void {
    this.routesApi.changes().subscribe({
      next: (changes) => this.changes.set(changes),
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, 'Historique indisponible.'));
      },
    });
  }
}
