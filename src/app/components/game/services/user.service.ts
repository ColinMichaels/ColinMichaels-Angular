import { Injectable } from '@angular/core';
import { TypingMode } from './typewriter.service';
import { BehaviorSubject } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class UserService {
  $user: IUser = new User();
  $previousUserSettings: IUser = new User();
  private userSubject = new BehaviorSubject<User>(this.loadUser());
  user$ = this.userSubject.asObservable();

  constructor() {
    this.loadUser();
  }

  get user(): User {
    return this.loadUser();
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

  get previousLevel(): number {
    return this.$previousUserSettings.level;
  }


  private loadUser(): User {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : new User();
  }

  updateUser(update: Partial<IUser>) {
    this.$previousUserSettings = this.user;
    Object.assign(this.$user, update);
    this.saveUser();
  }

  saveUser() {
    localStorage.setItem('user', JSON.stringify(this.$user));
  }

  resetUser() {
    this.$user = new User();
    this.saveUser();
  }
}
