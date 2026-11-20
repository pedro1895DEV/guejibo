import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: number;
  name: string;
  email?: string;
}

export interface Response {
  success: boolean;
  token?: string;
  error?: string;
}

type TokenValidationStatus = 'valid' | 'temporary' | 'invalid';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private topbar: { updateLoggedInStatus: () => void } | null = null;

  private loggedIn = false;
  private token: string | null = null;
  private currentUser: User | null = null;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.recoverUserDataFromCookie();
  }

  /**
   * Register a new user in the system.
   */
  public register(name: string, email: string, password: string): Observable<Response> {
    return this.http.post<Response>(
      environment.apiUrl + 'auth/register',
      {
        name: name,
        email: email,
        password: password
      }
    );
  }

  /**
   * Returns the http headers needed to connect to the server with the
   * JWT authentication.
   */
  public getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Bearer ' + (this.getToken() || '')
    });
  }

  /**
   * Initializes a reference to the Topbar component.
   * @param component The Topbar component.
   */
  public initTopbarReference(component: { updateLoggedInStatus: () => void }): void {
    this.topbar = component;
  }

  /**
   * Updates logged user info in the Topbar component and reactive subscribers.
   */
  public updateTopbar(): void {
    this.currentUserSubject.next(this.currentUser);
    if (this.topbar) {
      this.topbar.updateLoggedInStatus();
    }
  }

  /**
   * Reads the stored cookie to recover who is logged in, if necessary.
   * Temporary guest JWTs are ignored (without deleting the cookie needed by GamesLib).
   */
  private recoverUserDataFromCookie(): void {
    if (this.loggedIn) {
      return;
    }

    const jwt = Cookies.get('jwt');
    if (jwt === undefined) {
      return;
    }

    this.token = jwt;
    const status = this.decodeAuthToken();
    if (status === 'valid') {
      this.loggedIn = true;
      this.currentUserSubject.next(this.currentUser);
    } else if (status === 'temporary') {
      this.loggedIn = false;
      this.currentUser = null;
      this.token = null;
    } else {
      this.clearSession();
    }
  }

  /**
   * Returns whether a registered user is currently logged in in the system.
   */
  public isLoggedIn(): boolean {
    this.recoverUserDataFromCookie();
    if (this.loggedIn && this.decodeAuthToken() !== 'valid') {
      this.clearSession();
    }
    return this.loggedIn;
  }

  /**
   * Returns the current JWT token for a registered user.
   */
  public getToken(): string | null {
    this.recoverUserDataFromCookie();
    return this.token;
  }

  /**
   * Gets data about the currently logged in user.
   */
  public getLoggedInUser(): User | null {
    if (!this.isLoggedIn()) {
      return null;
    }
    return this.currentUser;
  }

  /**
   * Decodes the current JWT and validates expiration and account type.
   */
  private decodeAuthToken(): TokenValidationStatus {
    if (!this.token) {
      return 'invalid';
    }

    try {
      const decodedJwt = jwtDecode<any>(this.token);
      if (decodedJwt.exp && Date.now() >= decodedJwt.exp * 1000) {
        return 'invalid';
      }

      if (decodedJwt.temporary === true) {
        return 'temporary';
      }

      this.currentUser = {
        id: decodedJwt.id,
        name: decodedJwt.name,
        email: decodedJwt.email
      };
      return 'valid';
    } catch {
      return 'invalid';
    }
  }

  /**
   * Uses a JWT token to set up the current user.
   * @param token The JWT token.
   */
  public setupUserWithToken(token: string): void {
    this.token = token;
    const status = this.decodeAuthToken();
    if (status !== 'valid') {
      this.clearSession();
      return;
    }

    this.loggedIn = true;
    Cookies.set('jwt', token, { path: '/' });
    this.updateTopbar();
  }

  /**
   * Logs into the system with email and password.
   */
  public login(email: string, password: string): Observable<Response> {
    return this.http.post<Response>(
      environment.apiUrl + 'auth/login',
      {
        email: email,
        password: password
      }
    ).pipe(
      tap(response => {
        if (response.success === true && response.token) {
          this.setupUserWithToken(response.token);
        }
      })
    );
  }

  /**
   * Logs out of the system.
   */
  public logout(): void {
    this.clearSession();
  }

  private clearSession(): void {
    this.loggedIn = false;
    this.currentUser = null;
    this.token = null;
    Cookies.remove('jwt', { path: '/' });
    this.updateTopbar();
  }

}
