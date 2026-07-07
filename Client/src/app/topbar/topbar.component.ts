import { Component, OnInit, Input } from '@angular/core';
import { AuthService } from '../auth.service';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-topbar',
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.scss'],
    imports: [NgIf, RouterLink]
})
export class TopbarComponent implements OnInit {

  @Input() showLogo: boolean = true;
  title = 'Client';
  user = { name: '' };
  loggedIn = false;
  
  testMessage:string = 'yalala';

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.initTopbarReference(this);
    this.updateLoggedInStatus();
  }

  updateLoggedInStatus(){
    if(this.loggedIn = this.authService.isLoggedIn()){
      this.user = this.authService.getLoggedInUser();
    }
  }

}
