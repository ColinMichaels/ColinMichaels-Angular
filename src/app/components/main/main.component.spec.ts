import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {BehaviorSubject} from 'rxjs';

import {NotificationService} from '../game/services/notification.service';
import {TypewriterService} from '../game/services/typewriter.service';
import {User, UserService} from '../game/services/user.service';
import {MainComponent} from './main.component';

describe('MainComponent', () => {
  let fixture: ComponentFixture<MainComponent>;

  beforeEach(async () => {
    const notificationService = jasmine.createSpyObj<Pick<NotificationService, 'show'>>('NotificationService', ['show']);
    const typewriterService = jasmine.createSpyObj<Pick<TypewriterService, 'enableSound' | 'setVolume' | 'clear' | 'enqueueLine'>>(
      'TypewriterService',
      ['enableSound', 'setVolume', 'clear', 'enqueueLine'],
    ) as unknown as Pick<TypewriterService, 'enableSound' | 'setVolume' | 'clear' | 'enqueueLine'> & {
      typedText$: BehaviorSubject<string>;
    };
    typewriterService.typedText$ = new BehaviorSubject('');
    const user = new User();
    user.name = '';

    await TestBed.configureTestingModule({
      imports: [
        MainComponent,
        RouterTestingModule,
      ],
      providers: [
        {provide: NotificationService, useValue: notificationService},
        {provide: TypewriterService, useValue: typewriterService},
        {provide: UserService, useValue: {user}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainComponent);
  });

  it('renders the SPA homepage sections', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#work')).not.toBeNull();
    expect(element.querySelector('#blog')).not.toBeNull();
    expect(element.querySelector('#labs')).not.toBeNull();
    expect(element.querySelector('#os')).toBeNull();
    expect(element.textContent?.match(/Launch OS/g)?.length).toBe(1);
  });

  it('embeds published blog content on the homepage', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Latest writing');
    expect(element.textContent).toContain('Architecture Boundaries for the Site and OS');
  });
});
