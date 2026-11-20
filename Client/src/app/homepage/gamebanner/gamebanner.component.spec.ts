import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { GamebannerComponent } from './gamebanner.component';

describe('GamebannerComponent', () => {
  let component: GamebannerComponent;
  let fixture: ComponentFixture<GamebannerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([])],
      imports: [GamebannerComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GamebannerComponent);
    component = fixture.componentInstance;
    component.game = { id: 1, name: 'Test Game', path: 'stub' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
