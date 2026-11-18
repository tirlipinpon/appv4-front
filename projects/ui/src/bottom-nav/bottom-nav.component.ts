import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BottomNavItem {
  id: string;
  label: string;
  link: string;
  testId: string;
}

/**
 * Barre de navigation basse (LEARN-28).
 * Les libellés et liens viennent de l'écran appelant.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  readonly items = input.required<readonly BottomNavItem[]>();
  readonly activeId = input.required<string>();
}
