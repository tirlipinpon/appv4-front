import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/**
 * Data-access de la feature home — appels API propres à cet onglet/page.
 * (Pas de HttpClient direct dans la page.)
 */
@Injectable({ providedIn: 'root' })
export class HomeHelloService {
  private readonly http = inject(HttpClient);

  getHello(): Observable<{ text: string }> {
    return this.http.get<{ text: string }>(`${environment.apiBaseUrl}/hello`);
  }
}
