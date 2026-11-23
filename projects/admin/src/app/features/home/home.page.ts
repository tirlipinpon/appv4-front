import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { SpaceHeader } from '../../core/layout/space-header';

@Component({
  selector: 'app-home-page',
  imports: [MatCardModule, SpaceHeader],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
