import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { ScreenshotComponent } from './screenshot.component';

describe('ScreenshotComponent', () => {
  let component: ScreenshotComponent;
  let fixture: ComponentFixture<ScreenshotComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([])],
      imports: [ScreenshotComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScreenshotComponent);
    component = fixture.componentInstance;
    component.game = { id: 1, name: 'Test Game', path: 'stub' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
