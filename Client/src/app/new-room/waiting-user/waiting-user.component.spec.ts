import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { WaitingUserComponent } from './waiting-user.component';

describe('WaitingUserComponent', () => {
  let component: WaitingUserComponent;
  let fixture: ComponentFixture<WaitingUserComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [WaitingUserComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WaitingUserComponent);
    component = fixture.componentInstance;
    component.user = { name: 'Player 1', online: true, finished: false, score: 250 };
    fixture.detectChanges();
  });

  it('should create and preserve existing player score', () => {
    expect(component).toBeTruthy();
    expect(component.user.score).toBe(250);
  });
});
