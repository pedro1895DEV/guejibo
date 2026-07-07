import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AuthService } from 'src/app/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'auth-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [FormsModule]
})
export class LoginComponent implements OnInit {

  public model = {
    email: '',
    password: ''
  };
  public errorMessage: string = "";
  @Output() success = new EventEmitter();

  private returnUrl: string = '/';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Capture the intended destination set by AuthGuard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  submit() {
    this.authService.login(this.model.email, this.model.password).subscribe(
      response => {
        if (response.success === true) {
          this.authService.setupUserWithToken(response['token']);
          this.success.emit();
          this.router.navigateByUrl(this.returnUrl);
        }
        else {
          this.errorMessage = response['error'];
        }
      }
    );
  }

  authenticateWithGoogle() {
    window.location.href = environment.apiUrl + 'auth/google';
  }
}

