import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterScreenComponent } from './register-screen.component';

describe('RegisterScreenComponent', () => {
  let component: RegisterScreenComponent;
  let fixture: ComponentFixture<RegisterScreenComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    imports: [RegisterScreenComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
