import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { GameMetadataService } from './game-metadata.service';

describe('GamesMetadataService', () => {
  let service: GameMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(GameMetadataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
