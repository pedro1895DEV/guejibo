import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import Cookies from 'js-cookie';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    Cookies.remove('jwt', { path: '/' });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    Cookies.remove('jwt', { path: '/' });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set up session and cookie on successful login', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeFakeJwt({ id: 1, name: 'Ana', email: 'ana@example.com', exp: futureExp });

    service.login('ana@example.com', 'password123').subscribe(res => {
      expect(res.success).toBeTrue();
    });

    const req = httpMock.expectOne(environment.apiUrl + 'auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, token });

    expect(service.isLoggedIn()).toBeTrue();
    expect(service.getLoggedInUser()).toEqual({ id: 1, name: 'Ana', email: 'ana@example.com' });
    expect(Cookies.get('jwt')).toBe(token);
  });

  it('should safely reject malformed tokens without throwing', () => {
    service.setupUserWithToken('not-a-valid-jwt');
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getLoggedInUser()).toBeNull();
  });

  it('should clear session for expired tokens', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const expiredToken = makeFakeJwt({ id: 2, name: 'Old', exp: pastExp });

    service.setupUserWithToken(expiredToken);
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('should clear session and cookie on logout', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeFakeJwt({ id: 3, name: 'Pedro', exp: futureExp });

    service.setupUserWithToken(token);
    expect(service.isLoggedIn()).toBeTrue();

    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
    expect(Cookies.get('jwt')).toBeUndefined();
  });
});
