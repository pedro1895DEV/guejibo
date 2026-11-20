import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])]
    });
    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('should allow access when user is logged in', () => {
    spyOn(authService, 'isLoggedIn').and.returnValue(true);
    const result = guard.canActivate({} as any, { url: '/newroom/1' } as any);
    expect(result).toBeTrue();
  });

  it('should redirect to login with returnUrl when user is not logged in', () => {
    spyOn(authService, 'isLoggedIn').and.returnValue(false);
    const navSpy = spyOn(router, 'navigate');

    const result = guard.canActivate({} as any, { url: '/newroom/1' } as any);
    expect(result).toBeFalse();
    expect(navSpy).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/newroom/1' } });
  });
});
