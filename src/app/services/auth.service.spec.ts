import {TestBed} from '@angular/core/testing';

import {AuthService} from './auth.service';
import {Auth} from '@angular/fire/auth';
import {Router} from '@angular/router';
import {LogService} from '../components/game/services/log.service';

describe('AuthService', () => {
  let service: AuthService;

  const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
  const logServiceSpy = jasmine.createSpyObj('LogService', ['debug', 'info', 'warn', 'error']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: Auth, useValue: {} as Auth},
        {provide: Router, useValue: routerSpy},
        {provide: LogService, useValue: logServiceSpy},
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
