import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GamesService, Game } from 'src/app/games.service';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GameMetadataService } from 'src/app/game-metadata.service';
import { NgIf, AsyncPipe } from '@angular/common';
import { GameTitleComponent } from '../game-title/game-title.component';
import { ScreenshotComponent } from '../screenshot/screenshot.component';
import { MenuComponent } from '../menu/menu.component';

@Component({
    selector: 'app-game-screen',
    templateUrl: './game-screen.component.html',
    styleUrls: ['./game-screen.component.scss'],
    imports: [NgIf, GameTitleComponent, ScreenshotComponent, MenuComponent, AsyncPipe]
})
export class GameScreenComponent implements OnInit {

  public game$: Observable<Game>;
  public description$: Observable<string>;

  constructor(
    private route: ActivatedRoute,
    private gameService: GamesService,
    private gameMetadataService: GameMetadataService
  ) { }

  ngOnInit(): void {
    this.game$ = this.route.paramMap.pipe(
      switchMap(paramMap => this.gameService.getGame(Number(paramMap.get('id'))))
    );

    this.description$ = this.game$.pipe(
      switchMap(game => this.gameMetadataService.getDescription(game))
    );
  }

}

