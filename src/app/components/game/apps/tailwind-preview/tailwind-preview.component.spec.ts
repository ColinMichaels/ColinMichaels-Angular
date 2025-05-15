import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TailwindPreviewComponent } from './tailwind-preview.component';

describe('TailwindPreviewComponent', () => {
  let component: TailwindPreviewComponent;
  let fixture: ComponentFixture<TailwindPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TailwindPreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TailwindPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
