import { Component, OnInit, Input } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Game, GamesService } from 'src/app/games.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'gs-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    imports: [RouterLink]
})
export class MenuComponent implements OnInit {

  @Input() game: Game;

  constructor() { }

  ngOnInit(): void {
  }

  public localGameUrl(): string {
    return GamesService.getGameUrl(this.game);
  }

}

