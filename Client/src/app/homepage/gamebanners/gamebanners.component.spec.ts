import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { GamebannersComponent } from './gamebanners.component';

describe('GamebannersComponent', () => {
  let component: GamebannersComponent;
  let fixture: ComponentFixture<GamebannersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([])],
      imports: [GamebannersComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GamebannersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
