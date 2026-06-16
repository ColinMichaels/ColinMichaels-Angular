import { ComponentFixture, TestBed } from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {RouterTestingModule} from '@angular/router/testing';
import {AuthService} from '../../../../services/auth.service';
import {OsUserService} from '../../services/os-user.service';
import {SoundService} from '../../services/sound.service';
import {MusicService} from '../../services/music.service';
import {LogService} from '../../services/log.service';

import { LoginScreenComponent } from './login-screen.component';

describe('LoginScreenComponent', () => {
  let component: LoginScreenComponent;
  let fixture: ComponentFixture<LoginScreenComponent>;
  const authServiceMock = {
    user$: of(null),
    handleRedirectResult: jasmine.createSpy('handleRedirectResult').and.returnValue(of(null)),
    signInWithEmail: jasmine.createSpy('signInWithEmail').and.returnValue(of(null)),
    registerWithEmail: jasmine.createSpy('registerWithEmail').and.returnValue(of(null)),
    loginWithGoogle: jasmine.createSpy('loginWithGoogle').and.returnValue(of(null)),
    loginWithGoogleRedirect: jasmine.createSpy('loginWithGoogleRedirect').and.returnValue(of(undefined)),
    updateUserProfile: jasmine.createSpy('updateUserProfile').and.returnValue(of(undefined))
  };
  const userServiceMock = {
    updateUser: jasmine.createSpy('updateUser').and.returnValue(Promise.resolve())
  };
  const soundServiceMock = jasmine.createSpyObj<SoundService>('SoundService', ['stopAll']);
  const musicServiceMock = jasmine.createSpyObj<MusicService>('MusicService', ['stopAll']);
  const loggerMock = jasmine.createSpyObj<LogService>('LogService', ['info', 'error', 'warn', 'debug']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginScreenComponent, RouterTestingModule],
      providers: [
        {provide: AuthService, useValue: authServiceMock},
        {provide: OsUserService, useValue: userServiceMock},
        {provide: SoundService, useValue: soundServiceMock},
        {provide: MusicService, useValue: musicServiceMock},
        {provide: LogService, useValue: loggerMock},
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: {queryParamMap: convertToParamMap({})}
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
