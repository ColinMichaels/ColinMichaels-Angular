import {ComponentFixture, TestBed} from '@angular/core/testing';

import {HomeTerminalWindowComponent} from './home-terminal-window.component';
import {TypewriterService} from '../../game/services/typewriter.service';
import {BehaviorSubject} from 'rxjs';

describe('HomeTerminalWindowComponent', () => {
  let component: HomeTerminalWindowComponent;
  let fixture: ComponentFixture<HomeTerminalWindowComponent>;
  const typedText$ = new BehaviorSubject('');
  const typewriterServiceMock = {
    enableSound: jasmine.createSpy('enableSound'),
    setVolume: jasmine.createSpy('setVolume'),
    typedText$,
    clear: jasmine.createSpy('clear'),
    enqueueLine: jasmine.createSpy('enqueueLine'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeTerminalWindowComponent],
      providers: [
        {provide: TypewriterService, useValue: typewriterServiceMock}
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(HomeTerminalWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
