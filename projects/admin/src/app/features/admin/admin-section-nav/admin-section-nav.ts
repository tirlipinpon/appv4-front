import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Menu des pages admin : demandes, humeurs, IA.
 */
@Component({
  selector: 'app-admin-section-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-section-nav.html',
  styleUrl: './admin-section-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSectionNav {
  readonly items = [
    { label: 'Demandes professeur', path: '/admin/teacher-requests' },
    { label: 'Humeurs', path: '/admin/humeurs' },
    { label: 'IA', path: '/admin/ia' },
  ];
}
