import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SpaceHeader } from '../../core/layout/space-header';
import { HomeHelloService } from './data-access/home-hello.service';

/**
 * Page home (feature) — smoke JWT + /api/int/hello.
 * L'en-tête change d'espace quand le jeton liste deux rôles (SCRUM-125).
 */
@Component({
  selector: 'app-home-page',
  imports: [MatCardModule, MatProgressSpinnerModule, SpaceHeader],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly hello = inject(HomeHelloService);

  readonly message = signal<string>('Chargement…');
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.hello.getHello().subscribe({
      next: (response) => {
        this.message.set(response.text);
        this.error.set(null);
        this.loading.set(false);
      },
      error: () => {
        this.message.set('');
        this.error.set('Impossible de joindre /api/int/hello (401 si JWT manquant/invalide)');
        this.loading.set(false);
      },
    });
  }
}
