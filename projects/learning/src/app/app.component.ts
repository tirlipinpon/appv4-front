import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly title = 'learning';
  readonly message = signal<string>('Chargement…');
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<{ text: string }>(`${environment.apiBaseUrl}/hello`).subscribe({
      next: (response) => {
        this.message.set(response.text);
        this.error.set(null);
      },
      error: () => {
        this.message.set('');
        this.error.set('Impossible de joindre /api/ext/hello');
      },
    });
  }
}
