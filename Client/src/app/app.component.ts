import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [TopbarComponent, RouterOutlet]
})
export class AppComponent {
  title = 'Client';

  constructor(
    private router: Router
  ) { }

  showLogo(): boolean {
    return this.router.url != '/';
  }
}
