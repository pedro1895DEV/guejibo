import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { GameTitleComponent } from './game-title.component';

describe('GameTitleComponent', () => {
  let component: GameTitleComponent;
  let fixture: ComponentFixture<GameTitleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([])],
      imports: [GameTitleComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTitleComponent);
    component = fixture.componentInstance;
    component.game = { id: 1, name: 'Test Game', path: 'stub' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
