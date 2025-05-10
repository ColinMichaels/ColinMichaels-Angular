import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelLoaderComponent } from './level-loader.component';

describe('LevelLoaderComponent', () => {
  let component: LevelLoaderComponent;
  let fixture: ComponentFixture<LevelLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LevelLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
