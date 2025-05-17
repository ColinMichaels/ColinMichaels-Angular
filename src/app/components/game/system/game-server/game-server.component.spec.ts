import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameServerComponent } from './game-server.component';

describe('GameServerComponent', () => {
  let component: GameServerComponent;
  let fixture: ComponentFixture<GameServerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameServerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameServerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
