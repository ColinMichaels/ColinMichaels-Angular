import { ComponentFixture, TestBed } from '@angular/core/testing';
import {ActivatedRoute, Router, convertToParamMap} from '@angular/router';
import {BehaviorSubject, NEVER, Observable, of, throwError} from 'rxjs';
import {RouterTestingModule} from '@angular/router/testing';
import {User, UserCredential} from 'firebase/auth';

import {AuthService} from '../../../../services/auth.service';
import {OsUserService} from '../../services/os-user.service';
import {SoundService} from '../../services/sound.service';
import {MusicService} from '../../services/music.service';
import {LogService} from '../../services/log.service';
import {BlogMembershipCampaignStateService} from '../../../../features/blog/services/blog-membership-campaign-state.service';
import {AuthReturnUrlService} from '../../../../services/auth-return-url.service';

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
    getProviderConflictInfo: jasmine.Spy;
    updateUserProfile: jasmine.Spy;
  };
  let userServiceMock: {
    updateUser: jasmine.Spy;
  };
  let membershipCampaignMock: {
    getPendingPreferences: jasmine.Spy;
    rememberPendingPreferences: jasmine.Spy;
    clearPendingPreferences: jasmine.Spy;
    snooze: jasmine.Spy;
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
    sessionStorage.clear();
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
      getProviderConflictInfo: jasmine.createSpy('getProviderConflictInfo').and.returnValue(of(null)),
      updateUserProfile: jasmine.createSpy('updateUserProfile').and.returnValue(of(undefined))
    };
    userServiceMock = {
      updateUser: jasmine.createSpy('updateUser').and.returnValue(Promise.resolve())
    };
    membershipCampaignMock = {
      getPendingPreferences: jasmine.createSpy('getPendingPreferences').and.returnValue(null),
      rememberPendingPreferences: jasmine.createSpy('rememberPendingPreferences'),
      clearPendingPreferences: jasmine.createSpy('clearPendingPreferences'),
      snooze: jasmine.createSpy('snooze'),
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
        {provide: BlogMembershipCampaignStateService, useValue: membershipCampaignMock},
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

  it('shows notification choices only for reader campaign registration', () => {
    queryParams$.next({mode: 'register', source: 'blog-membership'});
    fixture.detectChanges();

    expect(component.isLoginMode).toBeFalse();
    expect(component.isReaderCampaign).toBeTrue();
    expect(fixture.nativeElement.querySelector('.reader-preferences')).not.toBeNull();

    queryParams$.next({mode: 'register'});
    fixture.detectChanges();

    expect(component.isReaderCampaign).toBeFalse();
    expect(fixture.nativeElement.querySelector('.reader-preferences')).toBeNull();
  });

  it('keeps every registration field rendered after the email value changes', () => {
    queryParams$.next({mode: 'register', source: 'blog-membership'});
    fixture.detectChanges();

    component.registerForm.get('email')?.setValue('reader@example.com');
    fixture.detectChanges();

    const formElement = fixture.nativeElement as HTMLElement;
    const inputs = Array.from(formElement.querySelectorAll<HTMLInputElement>('.login-input'));

    expect(inputs.map(input => input.id)).toEqual([
      'displayName',
      'registerEmail',
      'registerPassword',
      'confirmPassword',
    ]);
    expect(inputs.find(input => input.id === 'registerEmail')?.autocomplete).toBe('email');
    expect(inputs.find(input => input.id === 'registerPassword')?.autocomplete).toBe('new-password');
    expect(inputs.find(input => input.id === 'confirmPassword')?.autocomplete).toBe('new-password');
  });

  it('preserves selected campaign choices before social registration', () => {
    authServiceMock.loginWithGoogle.and.returnValue(NEVER);
    queryParams$.next({mode: 'register', source: 'blog-membership'});
    component.registerForm.patchValue({
      browserNotifications: true,
    });

    component.loginWithGoogle();

    expect(membershipCampaignMock.rememberPendingPreferences).toHaveBeenCalledWith({
      browserNotifications: true,
      newPostEmails: false,
      newsletter: false,
    });
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

  it('restores the requested post when a provider callback returns without login query parameters', () => {
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    const authReturnUrl = TestBed.inject(AuthReturnUrlService);
    authReturnUrl.rememberDestination('/blog/socially-shared-post?source=facebook');
    queryParams$.next({});
    authServiceMock.signInWithEmail.and.returnValue(of(createCredential()));
    component.loginForm.setValue({email: firebaseUser.email, password: 'password'});

    component.onLogin();

    expect(navigateByUrl).toHaveBeenCalledWith('/blog/socially-shared-post?source=facebook');
  });

  it('remembers the requested post before falling back from a blocked popup to provider redirect', () => {
    const authReturnUrl = TestBed.inject(AuthReturnUrlService);
    queryParams$.next({redirectUrl: '/blog/socially-shared-post'});
    authServiceMock.loginWithGoogle.and.returnValue(throwError(() => ({code: 'auth/popup-blocked'})));

    component.loginWithGoogle();

    expect(authServiceMock.loginWithGoogleRedirect).toHaveBeenCalled();
    expect(authReturnUrl.resolveDestination(null)).toBe('/blog/socially-shared-post');
  });

  it('lets a reader leave the campaign login and snoozes the reminder', () => {
    const navigateByUrl = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    queryParams$.next({
      mode: 'register',
      source: 'blog-membership',
      redirectUrl: '/blog/socially-shared-post',
    });
    fixture.detectChanges();
    const continueButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    ).find(button => button.textContent?.includes('Continue reading'));

    continueButton?.click();

    expect(continueButton).toBeDefined();
    expect(membershipCampaignMock.clearPendingPreferences).toHaveBeenCalled();
    expect(membershipCampaignMock.snooze).toHaveBeenCalledWith(7);
    expect(navigateByUrl).toHaveBeenCalledWith('/blog/socially-shared-post');
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

  it('guides Facebook users to sign in with their original provider before linking', () => {
    const error = {
      code: 'auth/account-exists-with-different-credential',
      customData: {email: firebaseUser.email},
    };
    authServiceMock.loginWithFacebook.and.returnValue(throwError(() => error));
    authServiceMock.getProviderConflictInfo.and.returnValue(of({
      email: firebaseUser.email,
      providerLabels: ['Google'],
      signInMethods: ['google.com'],
    }));

    component.loginWithFacebook();

    expect(authServiceMock.getProviderConflictInfo).toHaveBeenCalledWith(error);
    expect(component.loading).toBeFalse();
    expect(component.facebookLoading).toBeFalse();
    expect(component.error).toBe('This email already has an account for reader@example.com. Sign in with Google first, then connect Facebook from your profile.');
  });
});
