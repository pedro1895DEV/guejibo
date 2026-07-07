import { Component, OnInit } from '@angular/core';
import { GamesService, Game } from '../../games.service';
import { Observable } from 'rxjs';
import { NgFor, AsyncPipe } from '@angular/common';
import { GamebannerComponent } from '../gamebanner/gamebanner.component';

@Component({
    selector: 'hp-gamebanners',
    templateUrl: './gamebanners.component.html',
    styleUrls: ['./gamebanners.component.scss'],
    imports: [NgFor, GamebannerComponent, AsyncPipe]
})
export class GamebannersComponent implements OnInit {

  public games$ : Observable<Game[]>;

  constructor(
    private gamesService : GamesService
  ) { }

  ngOnInit(): void {
    this.games$ = this.gamesService.getGamesList(); 
  }

}

