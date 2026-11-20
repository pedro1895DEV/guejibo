import { Component, OnInit, Input } from '@angular/core';
import { Game } from 'src/app/games.service';
import { GameMetadataService } from 'src/app/game-metadata.service';

@Component({
    selector: 'gs-screenshot',
    templateUrl: './screenshot.component.html',
    styleUrls: ['./screenshot.component.scss']
})
export class ScreenshotComponent implements OnInit {

  @Input() game!: Game;

  constructor(
    private gameMetadataService: GameMetadataService
  ) { }

  ngOnInit(): void {
  }

  public screenshotBackground(): string {
    const primary = this.gameMetadataService.getScreenshotUrl(this.game);
    const fallback = this.gameMetadataService.getScreenshotFallbackUrl(this.game);
    return `url(${primary}), url(${fallback})`;
  }

  public screenshotUrl(): string {
    return this.gameMetadataService.getScreenshotUrl(this.game);
  }

}
