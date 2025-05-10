import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CliGameComponent } from './cli-game.component';

describe('CliGameComponent', () => {
  let component: CliGameComponent;
  let fixture: ComponentFixture<CliGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CliGameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CliGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
