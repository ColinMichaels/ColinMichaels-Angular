import { ComponentFixture, TestBed } from '@angular/core/testing';
import {ActivatedRoute, Router, convertToParamMap} from '@angular/router';
import {BehaviorSubject, NEVER, Observable, of} from 'rxjs';
import {RouterTestingModule} from '@angular/router/testing';
import {User, UserCredential} from 'firebase/auth';

import {AuthService} from '../../../../services/auth.service';
import {OsUserService} from '../../services/os-user.service';
import {SoundService} from '../../services/sound.service';
import {MusicService} from '../../services/music.service';
import {LogService} from '../../services/log.service';

import { LoginScreenComponent } from './login-screen.component';

describe('LoginScreenComponent', () => {
  let component: LoginScreenComponent;
  let fixture: ComponentFixture<LoginScreenComponent>;
  let queryParams$: BehaviorSubject<Record<string, string>>;
  let router: Router;
  let authServiceMock: {
    user$: Observable<User | null>;
    handleRedirectResult: jasmine.Spy;
    signInWithEmail: jasmine.Spy;
    registerWithEmail: jasmine.Spy;
    loginWithGoogle: jasmine.Spy;
    loginWithGoogleRedirect: jasmine.Spy;
    loginWithFacebook: jasmine.Spy;
    loginWithFacebookRedirect: jasmine.Spy;
    updateUserProfile: jasmine.Spy;
  };
  let userServiceMock: {
    updateUser: jasmine.Spy;
  };

  const firebaseUser = {
    uid: 'reader-uid',
    email: 'reader@example.com',
    displayName: 'Reader Example',
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
  } as unknown as User;

  function createCredential(user: User = firebaseUser): UserCredential {
    return {
      user,
      providerId: 'password',
      operationType: 'signIn',
    } as UserCredential;
  }

  beforeEach(async () => {
    queryParams$ = new BehaviorSubject<Record<string, string>>({});
    authServiceMock = {
      user$: of(null),
      handleRedirectResult: jasmine.createSpy('handleRedirectResult').and.returnValue(of(null)),
      signInWithEmail: jasmine.createSpy('signInWithEmail').and.returnValue(of(null)),
      registerWithEmail: jasmine.createSpy('registerWithEmail').and.returnValue(of(null)),
      loginWithGoogle: jasmine.createSpy('loginWithGoogle').and.returnValue(of(null)),
      loginWithGoogleRedirect: jasmine.createSpy('loginWithGoogleRedirect').and.returnValue(of(undefined)),
      loginWithFacebook: jasmine.createSpy('loginWithFacebook').and.returnValue(of(null)),
      loginWithFacebookRedirect: jasmine.createSpy('loginWithFacebookRedirect').and.returnValue(of(undefined)),
      updateUserProfile: jasmine.createSpy('updateUserProfile').and.returnValue(of(undefined))
    };
    userServiceMock = {
      updateUser: jasmine.createSpy('updateUser').and.returnValue(Promise.resolve())
    };
    const soundServiceMock = jasmine.createSpyObj<SoundService>('SoundService', ['stopAll']);
    const musicServiceMock = jasmine.createSpyObj<MusicService>('MusicService', ['stopAll']);
    const loggerMock = jasmine.createSpyObj<LogService>('LogService', ['info', 'error', 'warn', 'debug']);

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
            queryParams: queryParams$.asObservable(),
            snapshot: {queryParamMap: convertToParamMap({})}
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginScreenComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts Facebook login through the auth service', () => {
    authServiceMock.loginWithFacebook.and.returnValue(NEVER);

    component.loginWithFacebook();

    expect(component.loading).toBeTrue();
    expect(component.facebookLoading).toBeTrue();
    expect(authServiceMock.loginWithFacebook).toHaveBeenCalled();
  });

  it('returns email users to the public home page when no redirect was requested', () => {
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    authServiceMock.signInWithEmail.and.returnValue(of(createCredential()));
    component.loginForm.setValue({email: firebaseUser.email, password: 'password'});

    component.onLogin();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
    expect(userServiceMock.updateUser).not.toHaveBeenCalled();
  });

  it('returns email users to the requested public page', () => {
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    authServiceMock.signInWithEmail.and.returnValue(of(createCredential()));
    queryParams$.next({redirectUrl: '/blog/example-post'});
    component.loginForm.setValue({email: firebaseUser.email, password: 'password'});

    component.onLogin();

    expect(navigateByUrl).toHaveBeenCalledWith('/blog/example-post');
    expect(userServiceMock.updateUser).not.toHaveBeenCalled();
  });

  it('syncs the OS user only when the requested destination is the OS', () => {
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    authServiceMock.signInWithEmail.and.returnValue(of(createCredential()));
    queryParams$.next({redirectUrl: '/os'});
    component.loginForm.setValue({email: firebaseUser.email, password: 'password'});

    component.onLogin();

    expect(navigateByUrl).toHaveBeenCalledWith('/os');
    expect(userServiceMock.updateUser).toHaveBeenCalledWith({name: firebaseUser.displayName});
  });

  it('rejects login utility redirect URLs to avoid auth loops', () => {
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    authServiceMock.signInWithEmail.and.returnValue(of(createCredential()));
    queryParams$.next({redirectUrl: '/login'});
    component.loginForm.setValue({email: firebaseUser.email, password: 'password'});

    component.onLogin();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
