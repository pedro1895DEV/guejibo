import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GamesService, GameRoomSummary, GameRoomDetails } from '../games.service';

@Component({
  selector: 'app-my-rooms',
  templateUrl: './my-rooms.component.html',
  styleUrls: ['./my-rooms.component.scss'],
  imports: [NgIf, NgFor, RouterLink]
})
export class MyRoomsComponent implements OnInit {
  public rooms: GameRoomSummary[] = [];
  public selectedRoom: GameRoomDetails | null = null;
  public loading = true;
  public errorMessage = '';

  constructor(private gamesService: GamesService) { }

  ngOnInit(): void {
    this.gamesService.getMyGameRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar suas salas.';
        this.loading = false;
      }
    });
  }

  selectRoom(roomId: number): void {
    if (this.selectedRoom && this.selectedRoom.id === roomId) {
      this.selectedRoom = null;
      return;
    }

    this.gamesService.getGameRoomDetails(roomId).subscribe({
      next: (details) => {
        this.selectedRoom = details;
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar os detalhes da sala.';
      }
    });
  }
}
