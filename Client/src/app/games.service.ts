import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService, User } from './auth.service';

export interface Game {
  id: number;
  name: string;
  path: string;
}

export interface GameRoom {
  success: boolean;
  id: number;
  game: Game;
  code: string;
  token?: string;
}

export interface GameRoomSummary {
  id: number;
  code: string;
  timeStarted: string | null;
  timeEnded: string | null;
  game?: Game;
  numberOfMembers?: number;
}

export interface GameRoomDetails extends GameRoomSummary {
  owner?: User;
  members?: User[];
}

/**
 * Handles communication with the backend API that deals with games and game rooms.
 */
@Injectable({
  providedIn: 'root'
})
export class GamesService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  public getGamesList(): Observable<Game[]> {
    return this.http.get<Game[]>(environment.apiUrl + 'api/games');
  }

  public getGame(id: number): Observable<Game> {
    return this.http.get<Game>(environment.apiUrl + 'api/game/' + id);
  }

  public getNewGameRoom(gameId: number): Observable<GameRoom> {
    return this.http.post<GameRoom>(
      environment.apiUrl + 'api/gameroom',
      { gameid: gameId },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  public getMyGameRooms(): Observable<GameRoomSummary[]> {
    return this.http.get<GameRoomSummary[]>(
      environment.apiUrl + 'api/mygamerooms',
      { headers: this.authService.getAuthHeaders() }
    );
  }

  public getGameRoomDetails(roomId: number): Observable<GameRoomDetails> {
    return this.http.get<GameRoomDetails>(
      environment.apiUrl + 'api/gameroom/' + roomId,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  public static getGameUrl(game: Game): string {
    return environment.gamesPath + game.path + '/';
  }

}
