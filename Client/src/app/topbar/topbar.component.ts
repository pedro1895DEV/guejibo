import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { AuthService, User } from '../auth.service';
import { Subscription } from 'rxjs';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-topbar',
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.scss'],
    imports: [NgIf, RouterLink]
})
export class TopbarComponent implements OnInit, OnDestroy {

  @Input() showLogo = true;
  title = 'Client';
  user: User = { id: 0, name: '' };
  loggedIn = false;

  private userSub: Subscription | null = null;

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.initTopbarReference(this);
    this.updateLoggedInStatus();
    this.userSub = this.authService.currentUser$.subscribe(currentUser => {
      this.loggedIn = currentUser !== null;
      this.user = currentUser || { id: 0, name: '' };
    });
  }

  ngOnDestroy(): void {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  updateLoggedInStatus(): void {
    this.loggedIn = this.authService.isLoggedIn();
    const loggedUser = this.authService.getLoggedInUser();
    if (this.loggedIn && loggedUser) {
      this.user = loggedUser;
    } else {
      this.user = { id: 0, name: '' };
    }
  }

}
