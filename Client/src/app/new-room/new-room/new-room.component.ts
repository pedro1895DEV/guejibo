import { Component, OnInit, OnDestroy, isDevMode } from '@angular/core';
import { GamesService, GameRoom } from 'src/app/games.service';
import { Observable } from 'rxjs';
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

  private gameRoom$: Observable<GameRoom>;
  public gameRoom: GameRoom;

  constructor(
    private route: ActivatedRoute,
    private gameService: GamesService,
    private webSocketService: WebSocketService,
    private waitingListService: WaitingListService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {

    this.waitingListService.initialize();

    this.route.paramMap.subscribe(
      paramMap => {
        const gameid = Number(paramMap.get('gameid'));
        this.gameRoom$ = this.gameService.getNewGameRoom(gameid);
        this.gameRoom$.subscribe({
          next: (gr: GameRoom) => {
            this.gameRoom = gr;

            if (!gr.success) {
              if(isDevMode())
                console.log("Server error when creating game room");
              return;
            }

            if('token' in gr)
              this.authService.setupUserWithToken(gr.token);
              
            this.webSocketService.connect();
            this.webSocketService.registerReqCallback(
              'player-is-ready',
              msg => { this.waitingListService.playerIsReady(msg.user); }
            );
          }
        });
      }
    );
  }

  ngOnDestroy(): void {
    this.webSocketService.removeReqCallback('player-is-ready');
    this.webSocketService.removeReqCallback('update-score');
    this.waitingListService.cleanUp();
  }

  gameStart() {
    this.webSocketService.registerReqCallback(
      'update-score',
      msg => { this.waitingListService.updateScore(msg.user, msg.score, msg.endgame); }
    );

    this.webSocketService.sendMessage(
      {
          action: "start-game",
          gameroom: this.gameRoom.id
      }
    );
  }

}

