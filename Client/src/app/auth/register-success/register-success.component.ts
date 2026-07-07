import { Component, OnInit } from '@angular/core';
import { AuthService, User } from 'src/app/auth.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'auth-register-success',
    templateUrl: './register-success.component.html',
    styleUrls: ['./register-success.component.scss'],
    imports: [RouterLink]
})
export class RegisterSuccessComponent implements OnInit {

  public user: User;

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getLoggedInUser();
  }

}

