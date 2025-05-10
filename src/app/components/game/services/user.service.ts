import { Injectable } from '@angular/core';
import {TypingMode} from './typewriter.service';
import {BehaviorSubject} from 'rxjs';

export interface IUser {
  name: string;
  mode: TypingMode;
  score: number;
  level: number;
  sections: number;
}

export class User implements IUser {
  constructor(
    public name = '',
    public mode: TypingMode = 'default',
    public score = 0,
    public level = 0,
    public sections = 0
  ) {}
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  $user: IUser = new User();
  private userSubject = new BehaviorSubject<User>(this.loadUser());
  user$ = this.userSubject.asObservable();

  constructor() {
    this.loadUser();
  }

  get user(): User {
    return this.loadUser();
  }

  private loadUser(): User {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : new User();
  }

  setUserName(name: string) {
    this.$user.name = name;
    this.saveUser();
  }
  setUserLevel(level: number) {
    this.$user.level = level;
    this.saveUser();
  }
  setUserMode(mode: TypingMode) {
    this.$user.mode = mode;
    this.saveUser();
  }

  addToScore(score: number) {
    this.$user.score += score;
    this.saveUser();
  }

  updateUser(user: Partial<IUser>) {
    Object.assign(this.$user, user);
    this.saveUser();
  }

  saveUser() {
    localStorage.setItem('user', JSON.stringify(this.$user));
    this.userSubject.next(this.$user);
  }

  resetUser() {
    this.$user = new User();
    this.saveUser();
  }
}
