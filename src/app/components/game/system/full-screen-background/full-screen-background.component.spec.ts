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

  it('handles each window scroll once and removes the Angular listener on destroy', () => {
    const updateParallax = spyOn(
      component as unknown as { updateParallax(): void },
      'updateParallax'
    );

    window.dispatchEvent(new Event('scroll'));

    expect(updateParallax).toHaveBeenCalledTimes(1);

    fixture.destroy();
    updateParallax.calls.reset();
    window.dispatchEvent(new Event('scroll'));

    expect(updateParallax).not.toHaveBeenCalled();
  });
});
