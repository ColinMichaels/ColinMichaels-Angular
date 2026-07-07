import {TestBed} from '@angular/core/testing';

import {AuthService} from './auth.service';
import {Auth} from 'firebase/auth';
import {Router} from '@angular/router';
import {LogService} from '../components/game/services/log.service';
import {FIREBASE_AUTH} from './firebase/firebase.tokens';
import {UserAccountService} from '../shared/user-account/user-account.service';

describe('AuthService', () => {
  let service: AuthService;

  const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
  const logServiceSpy = jasmine.createSpyObj('LogService', ['debug', 'info', 'warn', 'error']);
  const userAccountServiceSpy = jasmine.createSpyObj<UserAccountService>('UserAccountService', ['bootstrapUserProfile']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: FIREBASE_AUTH, useValue: {} as Auth},
        {provide: Router, useValue: routerSpy},
        {provide: LogService, useValue: logServiceSpy},
        {provide: UserAccountService, useValue: userAccountServiceSpy},
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
