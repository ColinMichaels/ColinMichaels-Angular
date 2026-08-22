import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DesktopComponent } from './desktop.component';
import {ApplicationManagerService} from '@core-os/app-registry/application-manager.service';
import { ContextMenuService } from '../services/context-menu.service';
import { OverlayService } from '../services/overlay.service';
import { NotificationService } from '../services/notification.service';
import {OsUserService} from '../services/os-user.service';
import { TypewriterService } from '../services/typewriter.service';
import { SoundService } from '../services/sound.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import {LogService} from '../services/log.service';
import {GameLevel} from '../services/game-config.service';

describe('DesktopComponent', () => {
  let component: DesktopComponent;
  let fixture: ComponentFixture<DesktopComponent>;

  // Mocks for injected services
  const appManagerServiceMock = {
    openApplication: jasmine.createSpy('openApplication'),
    closeAllApps: jasmine.createSpy('closeAllApps'),
    setApplicationFocus: jasmine.createSpy('setApplicationFocus'),
  };

  const contextMenuServiceMock = {
    open: jasmine.createSpy('open'),
  };

  const overlayServiceMock = {
    showOverlay: jasmine.createSpy('showOverlay'),
  };

  const notificationServiceMock = {
    show: jasmine.createSpy('show'),
  };

  const userServiceMock = {
    user: { name: 'John Doe', level: 5 },
  };

  const typewriterServiceMock = {
    enqueueLine: jasmine.createSpy('enqueueLine'),
  };

  const soundServiceMock = {
    play: jasmine.createSpy('playNote'),
  };

  const activatedRouteMock = {
    paramMap: of({
      get: (key: string) => {
        if (key === 'app') {
          return 'testApp';
        }
        return null;
      },
    }),
  };

  const logServiceMock = {
    debug: jasmine.createSpy('debug'),
    info: jasmine.createSpy('info'),
    warn: jasmine.createSpy('warn'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    TestBed.overrideComponent(DesktopComponent, {
      set: {
        template: '',
        imports: [],
      }
    });

    await TestBed.configureTestingModule({
      imports: [DesktopComponent],
      providers: [
        { provide: ApplicationManagerService, useValue: appManagerServiceMock },
        { provide: ContextMenuService, useValue: contextMenuServiceMock },
        { provide: OverlayService, useValue: overlayServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        {provide: OsUserService, useValue: userServiceMock},
        { provide: TypewriterService, useValue: typewriterServiceMock },
        { provide: SoundService, useValue: soundServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        {provide: LogService, useValue: logServiceMock},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DesktopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call onBeginInvestigation when view initializes', () => {
    spyOn(component, 'onBeginInvestigation');
    component.ngAfterViewInit();

    expect(component.onBeginInvestigation).toHaveBeenCalled();
  });

  it('should call openApp on route param change', () => {
    appManagerServiceMock.openApplication.calls.reset();
    component.ngOnInit();
    expect(appManagerServiceMock.openApplication).toHaveBeenCalledWith('testApp', undefined);
  });

  it('should handle onDoubleClicked and close all apps', () => {
    const event = {target: 'desktop', currentTarget: 'desktop'} as unknown as MouseEvent;
    component.onDoubleClicked(event);
    expect(appManagerServiceMock.closeAllApps).toHaveBeenCalled();
  });

  it('should handle onRightClick and open context menu', () => {
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      clientX: 100,
      clientY: 200,
    } as unknown as MouseEvent;

    component.onRightClick(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(contextMenuServiceMock.open).toHaveBeenCalled();
  });

  it('should handle onClickWindow and set application focus', () => {
    const event = {
      target: 'desktop',
      currentTarget: 'desktop',
      offsetX: 50,
      offsetY: 100,
    } as unknown as MouseEvent;

    component.onClickWindow(event);

    expect(appManagerServiceMock.setApplicationFocus).toHaveBeenCalledWith(
      'desktop',
      50,
      100
    );
  });

  it('should focus the desktop from keyboard activation', () => {
    appManagerServiceMock.setApplicationFocus.calls.reset();
    const event = {
      target: 'desktop',
      currentTarget: 'desktop',
      key: 'Enter',
      preventDefault: jasmine.createSpy('preventDefault'),
    } as unknown as KeyboardEvent;

    component.onDesktopKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(appManagerServiceMock.setApplicationFocus).toHaveBeenCalledWith('desktop', 0, 0);
  });

  it('should call showNotificationUpdates in onBeginInvestigation', () => {
    notificationServiceMock.show.calls.reset();
    component.onBeginInvestigation();

    expect(notificationServiceMock.show).toHaveBeenCalledTimes(4);
  });

  it('should enqueue a line in onBeginInvestigation if user has no name', () => {
    userServiceMock.user.name = '';
    component.onBeginInvestigation();

    expect(soundServiceMock.play).toHaveBeenCalledWith('glitch-1.mp3', {
      volume: 0.3,
      forceRestart: true,
    });
    expect(typewriterServiceMock.enqueueLine).toHaveBeenCalledWith({
      text: '> who_are_you?',
      agent: 'system',
      speed: 40,
    });
  });

  it('should enqueue welcome lines if user has a name', () => {
    userServiceMock.user.name = 'John';

    component.onBeginInvestigation();

    expect(typewriterServiceMock.enqueueLine).toHaveBeenCalledWith({
      text: `Welcome back JOHN`,
      agent: 'system',
      speed: 40,
      mode: 'system',
    });

    expect(typewriterServiceMock.enqueueLine).toHaveBeenCalledWith({
      text: `You are currently on Level: 5`,
      agent: 'system',
      speed: 10,
    });
  });

  it('should call overlayService.showOverlay with correct properties', () => {
    component.onBeginInvestigation();

    expect(overlayServiceMock.showOverlay).toHaveBeenCalledWith({
      imagePath: component.overlayImagePath,
      visible: true,
      zIndex: 10000,
      opacity: 1,
      transition: 'opacity 0.3s ease-in-out',
    });
  });

  it('should enqueue lines and playNote sound for onLevelLoadFailed', () => {
    const message = 'Failed to load level';

    component.onLevelLoadFailed(message);

    expect(typewriterServiceMock.enqueueLine).toHaveBeenCalledWith({
      text: message,
      agent: 'system',
      mode: 'dramatic',
      onBegin: jasmine.any(Function),
    });

    // Call the onBegin method and verify the sound was played
    const onBegin = typewriterServiceMock.enqueueLine.calls.mostRecent()
      .args[0].onBegin;
    onBegin();
    expect(soundServiceMock.play).toHaveBeenCalledWith('beep-warning.mp3', {
      volume: 0.4,
      forceRestart: true,
      loop: false,
    });
  });

  it('should enqueue lines when onLevelLoaded is called', () => {
    const levelMock: GameLevel = {
      id: '1',
      name: 'Level 1',
      unlockedCommands: [],
    };

    component.onLevelLoaded(levelMock);

    expect(typewriterServiceMock.enqueueLine).toHaveBeenCalledWith({
      text: `Level 5 loaded.`,
      agent: 'system',
      speed: 40,
      mode: 'system',
    });
  });
});
