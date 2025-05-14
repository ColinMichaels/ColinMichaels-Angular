import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlassCardComponent } from './glass-card.component';

describe('GlassCardComponent', () => {
  let component: GlassCardComponent;
  let fixture: ComponentFixture<GlassCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlassCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlassCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
