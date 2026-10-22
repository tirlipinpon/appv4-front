import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [MatToolbarModule, MatCardModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly message = signal<string>('Chargement…');
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.http.get<{ text: string }>(`${environment.apiBaseUrl}/hello`).subscribe({
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

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
