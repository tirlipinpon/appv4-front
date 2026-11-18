import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  host: { class: 'theme-learn' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
