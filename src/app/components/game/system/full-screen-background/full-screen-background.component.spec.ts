import {ComponentFixture, TestBed} from '@angular/core/testing';

import {FullScreenBackgroundComponent} from './full-screen-background.component';

describe('FullScreenBackgroundComponent', () => {
  let component: FullScreenBackgroundComponent;
  let fixture: ComponentFixture<FullScreenBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullScreenBackgroundComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(FullScreenBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
