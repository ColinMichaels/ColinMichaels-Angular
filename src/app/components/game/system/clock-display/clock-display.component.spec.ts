import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';

import {ClockService} from '../../services/clock.service';
import {ClockDisplayComponent} from './clock-display.component';

describe('ClockDisplayComponent', () => {
  let component: ClockDisplayComponent;
  let fixture: ComponentFixture<ClockDisplayComponent>;
  let clock$: Subject<Date>;
  let clock: jasmine.SpyObj<ClockService>;

  beforeEach(async () => {
    clock$ = new Subject<Date>();
    clock = jasmine.createSpyObj<ClockService>('ClockService', ['formatDate', 'formatTime'], {clock$});
    clock.formatDate.and.returnValue('Aug 25');
    clock.formatTime.and.returnValue('10:15 PM');

    await TestBed.configureTestingModule({
      imports: [ClockDisplayComponent],
      providers: [{provide: ClockService, useValue: clock}],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClockDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stops observing the root clock after the display is destroyed', () => {
    const firstTick = new Date('2026-08-25T02:15:00.000Z');
    clock$.next(firstTick);

    expect(component.timerDisplay).toBe('Aug 25  10:15 PM');
    expect(clock.formatDate).toHaveBeenCalledOnceWith(firstTick);

    fixture.destroy();
    clock$.next(new Date('2026-08-25T02:15:01.000Z'));

    expect(clock.formatDate).toHaveBeenCalledTimes(1);
    expect(clock.formatTime).toHaveBeenCalledTimes(1);
  });
});
