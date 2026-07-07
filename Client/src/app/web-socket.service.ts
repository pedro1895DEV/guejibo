import { Injectable, isDevMode } from '@angular/core';
import { webSocket, WebSocketSubject } from "rxjs/webSocket";
import { BehaviorSubject, Observable, EMPTY } from 'rxjs';
import { retry, delay, tap, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Possible states of the WebSocket connection. */
export enum ConnectionStatus {
  Disconnected = 'DISCONNECTED',
  Connected = 'CONNECTED',
  Reconnecting = 'RECONNECTING'
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private subject: WebSocketSubject<any>;
  private reqCallbacks: object;
  private responseToCallbacks: object;

  /** Stored connection parameter so reconnections reuse the same identity. */
  private wsParam: string = null;

  /** Whether the disconnect was intentional (no auto-reconnect). */
  private intentionalClose = false;

  /** Observable that components can subscribe to for connection status updates. */
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.Disconnected);
  public connectionStatus$: Observable<ConnectionStatus> = this.connectionStatusSubject.asObservable();

  /** Reconnection configuration */
  private static readonly INITIAL_RETRY_DELAY_MS = 1000;
  private static readonly MAX_RETRY_DELAY_MS = 30000;
  private static readonly BACKOFF_MULTIPLIER = 2;

  constructor(
    private authService: AuthService
  ) {
    this.reqCallbacks = {};
    this.responseToCallbacks = {};
  }

  /**
   * Connects to the web socket using the token read from AuthService.token
   * or a guest name for unregistered users.
   * Automatically reconnects with exponential backoff on connection loss.
   */
  public connect(guestName?: string) {
    if (this.subject) {
      if (isDevMode())
        console.log('Already connected');
      return;
    }

    this.intentionalClose = false;

    this.wsParam =
      (guestName === undefined) ?
        this.authService.getToken()
        :
        'unregistered_' + toBase64Url(guestName);

    this.establishConnection();
  }

  /**
   * Creates the WebSocket connection and sets up the auto-reconnect pipeline.
   */
  private establishConnection(): void {
    const url = environment.wsUrl + this.wsParam;
    let currentRetryDelay = WebSocketService.INITIAL_RETRY_DELAY_MS;

    this.subject = webSocket({
      url: url,
      openObserver: {
        next: () => {
          if (isDevMode())
            console.log('WebSocket connected');
          currentRetryDelay = WebSocketService.INITIAL_RETRY_DELAY_MS;
          this.connectionStatusSubject.next(ConnectionStatus.Connected);
        }
      },
      closeObserver: {
        next: () => {
          if (isDevMode())
            console.log('WebSocket closed');
          if (!this.intentionalClose) {
            this.connectionStatusSubject.next(ConnectionStatus.Reconnecting);
          }
        }
      }
    });

    this.subject.pipe(
      retry({
        delay: (error, retryCount) => {
          if (isDevMode())
            console.warn('WebSocket error, reconnecting...', error);
          this.connectionStatusSubject.next(ConnectionStatus.Reconnecting);

          if (this.intentionalClose) {
            return EMPTY;
          }
          const delayTime = currentRetryDelay;
          currentRetryDelay = Math.min(
            currentRetryDelay * WebSocketService.BACKOFF_MULTIPLIER,
            WebSocketService.MAX_RETRY_DELAY_MS
          );
          return new Observable(subscriber => {
            setTimeout(() => {
              subscriber.next(null);
              subscriber.complete();
            }, delayTime);
          });
        }
      }),
      catchError(() => EMPTY)
    ).subscribe(
      msg => {
        if ('req' in msg) {
          if (msg.req in this.reqCallbacks) {
            this.reqCallbacks[msg.req](msg);
          }
        }
        else if ('responseTo' in msg) {
          if (msg.responseTo in this.responseToCallbacks) {
            this.responseToCallbacks[msg.responseTo](msg);
          }
        }
      }
    );
  }

  /**
   * Intentionally disconnects and cleans up the WebSocket.
   * Does NOT trigger auto-reconnection.
   */
  public disconnect(): void {
    this.intentionalClose = true;
    if (this.subject) {
      this.subject.complete();
      this.subject = null;
    }
    this.connectionStatusSubject.next(ConnectionStatus.Disconnected);
  }

  /**
   * Sets up a callback that will be called when the web sockets receives
   * a specific string in the "req" field.
   * @param req Value of the "req" field in the incoming object
   * @param callback Function to be called
   */
  public registerReqCallback(req: string, callback: (obj: any) => void): void {
    this.reqCallbacks[req] = callback;
  }

  /**
   * Sets up a callback that will be called when the web sockets receives
   * a specific string in the "responseTo" field.
   * @param responseTo Value of the "responseTo" field in the incoming object
   * @param callback Function to be called
   */
  public registerResponseToCallback(responseTo: string, callback: (obj: any) => void): void {
    this.responseToCallbacks[responseTo] = callback;
  }

  /**
   * Removes a callback that was set up with registerReqCallback.
   * @param req 
   */
  public removeReqCallback(req: string): void {
    delete this.reqCallbacks[req];
  }

  /**
  * Removes a callback that was set up with registerResponseToCallback.
  * @param req 
  */
  public removeResponseToCallback(req: string): void {
    delete this.responseToCallbacks[req];
  }

  /**
   * Sends a message to the web socket server.
   * @param msg 
   */
  public sendMessage(msg): void {
    this.subject.next(msg);
  }

}
