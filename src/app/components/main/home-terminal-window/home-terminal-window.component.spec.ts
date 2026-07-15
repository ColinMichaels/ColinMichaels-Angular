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

  it('renders typed content as text with a separate blinking cursor', () => {
    typedText$.next('<img src=x onerror=alert(1)>Safe%');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('<img src=x onerror=alert(1)>Safe%');
    expect(element.querySelector('.animate-blink')?.textContent).toBe('%');
  });

  it('queues plain-text line breaks instead of HTML fragments', () => {
    const queuedLines = typewriterServiceMock.enqueueLine.calls.allArgs().map(([line]) => line.text);

    expect(queuedLines.some(text => text.includes('<br>'))).toBeFalse();
    expect(queuedLines.some(text => text.includes('<span'))).toBeFalse();
  });
});
