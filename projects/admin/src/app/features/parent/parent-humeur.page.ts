import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import type { ParentHumeurChildItem } from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { ParentHumeurService } from './data-access/parent-humeur.service';

/**
 * Page Humeur du parent (ADMIN-70).
 * Chaque enfant montre son nom et les humeurs reçues, dans l'ordre de l'API.
 * Sans réponse, seul le nom apparaît.
 */
@Component({
  selector: 'app-parent-humeur-page',
  imports: [SpaceHeader],
  templateUrl: './parent-humeur.page.html',
  styleUrl: './parent-humeur.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentHumeurPage implements OnInit {
  private readonly api = inject(ParentHumeurService);

  readonly children = signal<ParentHumeurChildItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (children) => {
        this.children.set(children);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Humeurs indisponibles.'));
      },
    });
  }
}
