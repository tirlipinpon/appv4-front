import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { HelloMessageResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Data-access de la feature home — appels API propres à cet onglet/page.
 * (Pas de HttpClient direct dans la page.)
 */
@Injectable({ providedIn: 'root' })
export class HomeHelloService {
  private readonly http = inject(HttpClient);

  getHello(): Observable<HelloMessageResponse> {
    return this.http.get<HelloMessageResponse>(`${environment.apiBaseUrl}/hello`);
  }
}
