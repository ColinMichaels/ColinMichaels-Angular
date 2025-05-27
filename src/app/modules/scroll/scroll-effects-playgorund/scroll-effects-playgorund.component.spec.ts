import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ScrollEffectsPlaygorundComponent} from './scroll-effects-playgorund.component';

describe('ScrollEffectsPlaygorundComponent', () => {
  let component: ScrollEffectsPlaygorundComponent;
  let fixture: ComponentFixture<ScrollEffectsPlaygorundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrollEffectsPlaygorundComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ScrollEffectsPlaygorundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
