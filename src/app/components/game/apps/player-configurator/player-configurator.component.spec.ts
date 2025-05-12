import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerConfiguratorComponent } from './player-configurator.component';

describe('PlaywrConfiguratorComponent', () => {
  let component: PlayerConfiguratorComponent;
  let fixture: ComponentFixture<PlayerConfiguratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerConfiguratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
