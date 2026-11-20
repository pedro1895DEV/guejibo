import { Component, OnInit, OnDestroy, ViewChild, isDevMode } from '@angular/core';
import { GamesService, GameRoom } from 'src/app/games.service';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth.service';
import { WebSocketService } from 'src/app/web-socket.service';
import { WaitingListService } from 'src/app/waiting-list.service';
import { NgIf } from '@angular/common';
import { GameTitleComponent } from '../../game-screen/game-title/game-title.component';
import { WaitingListComponent } from '../waiting-list/waiting-list.component';

@Component({
    selector: 'app-new-room',
    templateUrl: './new-room.component.html',
    styleUrls: ['./new-room.component.scss'],
    imports: [NgIf, GameTitleComponent, WaitingListComponent]
})
export class NewRoomComponent implements OnInit, OnDestroy {

  @ViewChild(WaitingListComponent) waitingListComp?: WaitingListComponent;

  private roomSub: Subscription | null = null;
  public gameRoom: GameRoom | null = null;
  public errorMessage = '';
  public readonly joinUrl: string = typeof window !== 'undefined'
    ? `${window.location.origin}/join`
    : '/join';

  constructor(
    private route: ActivatedRoute,
    private gameService: GamesService,
    private webSocketService: WebSocketService,
    private waitingListService: WaitingListService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.waitingListService.initialize();

    this.roomSub = this.route.paramMap.pipe(
      switchMap(paramMap => this.gameService.getNewGameRoom(Number(paramMap.get('gameid'))))
    ).subscribe({
      next: (gr: GameRoom) => {
        if (!gr || !gr.success) {
          this.errorMessage = 'Não foi possível criar a sala de jogo.';
          if (isDevMode()) {
            console.log('Server error when creating game room');
          }
          return;
        }

        this.gameRoom = gr;
        this.errorMessage = '';

        if ('token' in gr && gr.token) {
          this.authService.setupUserWithToken(gr.token);
        }

        this.webSocketService.connect();
        this.webSocketService.registerReqCallback(
          'player-is-ready',
          msg => { this.waitingListService.playerIsReady(msg.user); }
        );
        this.webSocketService.registerReqCallback(
          'game-over',
          () => {
            if (this.waitingListComp) {
              this.waitingListComp.markEnded();
            }
          }
        );
      },
      error: () => {
        this.errorMessage = 'Erro de conexão ao criar a sala.';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.roomSub) {
      this.roomSub.unsubscribe();
    }
    this.webSocketService.removeReqCallback('player-is-ready');
    this.webSocketService.removeReqCallback('update-score');
    this.webSocketService.removeReqCallback('game-over');
    this.webSocketService.disconnect();
    this.waitingListService.cleanUp();
  }

  gameStart(): void {
    if (!this.gameRoom) {
      return;
    }

    this.webSocketService.registerReqCallback(
      'update-score',
      msg => { this.waitingListService.updateScore(msg.user, msg.score, msg.endgame); }
    );

    this.webSocketService.sendMessage({
      action: 'start-game',
      gameroom: this.gameRoom.id
    });
  }

  gameEnd(): void {
    if (!this.gameRoom) {
      return;
    }

    this.webSocketService.sendMessage({
      action: 'end-game',
      gameroom: this.gameRoom.id
    });
  }

}
