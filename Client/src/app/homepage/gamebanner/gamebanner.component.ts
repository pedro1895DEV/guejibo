import { Component, OnInit, Input } from '@angular/core';
import { Game } from 'src/app/games.service';
import { GameMetadataService } from 'src/app/game-metadata.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'hp-gamebanner',
    templateUrl: './gamebanner.component.html',
    styleUrls: ['./gamebanner.component.scss'],
    imports: [RouterLink]
})
export class GamebannerComponent implements OnInit {

  @Input() game!: Game;

  constructor(
    private gameMetadataService: GameMetadataService
  ) { }

  ngOnInit(): void {
  }

  public bannerUrl(): string {
    return this.gameMetadataService.getBannerUrl(this.game);
  }

}
