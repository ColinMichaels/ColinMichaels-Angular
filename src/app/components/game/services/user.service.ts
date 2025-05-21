import {Injectable, OnDestroy} from '@angular/core';
import { TypingMode } from './typewriter.service';
import {BehaviorSubject, Subject} from 'rxjs';
import {SettingsService} from './settings.service';

export interface IUser {
  name: string;
  mode: TypingMode;
  score: number;
  level: number;
  sections: number;
}

export class User implements IUser {
  constructor(
    public name: string = '',
    public mode: TypingMode = 'default',
    public score = 0,
    public level = 0,
    public sections = 0
  ) {}
}

export class UserFactory {
  static createUser(name: string, mode: TypingMode, score: number, level: number, sections: number): User {
    return new User(name, mode, score, level, sections);
  }
}


@Injectable({ providedIn: 'root' })
export class UserService implements OnDestroy {
  private userSubject = new BehaviorSubject<User>(new User());
  private previousUserSubject = new BehaviorSubject<User>(new User());
  private destroy$ = new Subject<void>();

  constructor(private settings: SettingsService) {
    this.initializeUser();
    this.settings.registerSettingSet('user', [this.userSubject.value]);
  }

  get user(): User {
    const user = this.userSubject.value;
    console.warn('user', user);
    return user;
  }

  get previousLevel(): number {
    return this.previousUserSubject.value.level;
  }

  get statsString() {
    return `
    Player: ${this.user.name},
    Mode: ${this.user.mode},
    Score: ${this.user.score},
    Level: ${this.user.level},
    Sections: ${this.user.sections}
    `;
  }

  private initializeUser(): void {
    const loadedUser = this.loadUser();
    this.userSubject.next(loadedUser);
  }

  private loadUser(): User {
    const settingSet = this.settings.getSettingSet('user');
    if (!settingSet) {
      return new User();
    }

    const userData = settingSet.value[0] as User;
    return userData ? new User(
      userData.name,
      userData.mode,
      userData.score,
      userData.level,
      userData.sections
    ) : new User();
  }

  updateUser(update: Partial<IUser>): User {
    this.previousUserSubject.next(this.userSubject.value);
    const updatedUser = new User(
      update.name ?? this.userSubject.value.name,
      update.mode ?? this.userSubject.value.mode,
      update.score ?? this.userSubject.value.score,
      update.level ?? this.userSubject.value.level,
      update.sections ?? this.userSubject.value.sections
    );
    this.userSubject.next(updatedUser);
    this.saveUser();
    return updatedUser;
  }

  private saveUser(): void {
    this.settings.updateSettingSet('user', [this.userSubject.value]);
  }

  resetUser(): void {
    this.userSubject.next(new User());
    this.saveUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
