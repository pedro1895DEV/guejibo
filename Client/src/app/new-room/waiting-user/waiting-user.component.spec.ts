import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { WaitingUserComponent } from './waiting-user.component';

describe('WaitingUserComponent', () => {
  let component: WaitingUserComponent;
  let fixture: ComponentFixture<WaitingUserComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [WaitingUserComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WaitingUserComponent);
    component = fixture.componentInstance;
    component.user = { name: 'Player 1', online: true, finished: false, score: 0 };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
