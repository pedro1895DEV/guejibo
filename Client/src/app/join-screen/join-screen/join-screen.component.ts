import { Component, OnInit, OnDestroy, isDevMode } from '@angular/core';
import { WebSocketService } from 'src/app/web-socket.service';
import { AuthService } from 'src/app/auth.service';
import { GlobalConstants } from 'src/app/common/global-constants';
import { WaitingListService } from 'src/app/waiting-list.service';
import { environment } from 'src/environments/environment';
import { WaitingUser } from 'src/app/new-room/waiting-user/waiting-user.component';
import Cookies from 'js-cookie';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WaitingListComponent } from '../../new-room/waiting-list/waiting-list.component';

@Component({
    selector: 'app-join-screen',
    templateUrl: './join-screen.component.html',
    styleUrls: ['./join-screen.component.scss'],
    imports: [NgIf, FormsModule, WaitingListComponent]
})
export class JoinScreenComponent implements OnInit, OnDestroy {

  public code = '';
  public name = '';
  public joined = false;
  public errorMessage = '';

  private gameRoomId = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private webSocketService: WebSocketService,
    private waitingListService: WaitingListService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.waitingListService.initialize();
  }

  join(): void {
    this.errorMessage = '';
    const wss = this.webSocketService;
    if (this.authService.isLoggedIn()) {
      wss.connect();
    } else {
      wss.connect((this.name || '').trim());
    }

    // When successfully joined, change interface to waiting list and
    // start sending "im-ready" messages
    wss.registerResponseToCallback(
      'join',
      msg => {
        if (!msg.success) {
          this.errorMessage = msg.error || 'Sala não encontrada ou já iniciada.';
          wss.disconnect();
          if (isDevMode()) {
            console.log('Error trying to join');
          }
        } else {
          this.gameRoomId = msg.gameroom.id;

          if (!this.isLoggedIn() && msg.token) {
            Cookies.set('jwt', msg.token, { path: '/' });
            wss.setAuthToken(msg.token);
          }

          this.intervalId = setInterval(
            () => {
              wss.sendMessage({
                action: 'im-ready',
                gameroom: this.gameRoomId
              });
            },
            GlobalConstants.TIMES.SHOUT_IM_HERE_INTERVAL
          );
          this.joined = true;
        }
      }
    );

    // When another player is ready, update its status on the waiting list
    wss.registerReqCallback(
      'player-is-ready',
      msg => {
        this.waitingListService.playerIsReady(msg.user);
      }
    );

    // When a 'game-started' message is received, start the game
    wss.registerReqCallback(
      'game-started',
      msg => {
        Cookies.set('gameroom', String(msg.gameroom), { path: '/' });

        if (!this.isLoggedIn() && msg.token) {
          Cookies.set('jwt', msg.token, { path: '/' });
        }

        window.open(environment.gamesPath + msg.path + '/index.html', '_self');
      }
    );

    // After registering all the above callbacks,
    // send a message to the server asking to join the game
    wss.sendMessage({
      action: 'join',
      code: this.code
    });
  }

  ngOnDestroy(): void {
    this.waitingListService.cleanUp();
    this.webSocketService.removeResponseToCallback('join');
    this.webSocketService.removeReqCallback('player-is-ready');
    this.webSocketService.removeReqCallback('game-started');
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  getUser(): WaitingUser {
    const loggedUser = this.authService.getLoggedInUser();
    if (this.isLoggedIn() && loggedUser) {
      return {
        name: loggedUser.name,
        online: true,
        finished: false,
        score: 0
      };
    }
    return {
      name: this.name,
      online: true,
      finished: false,
      score: 0
    };
  }

}
