import {Injectable, OnDestroy} from '@angular/core';
import {TypingMode} from './typewriter.service';
import {
  BehaviorSubject,
  combineLatest,
  Subject,
  take,
  takeUntil,
  filter,
  map,
  firstValueFrom,
  from,
  EMPTY,
  Observable
} from 'rxjs';
import {SettingsService} from './settings.service';
import {catchError} from 'rxjs/operators';

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
export class UserService implements OnDestroy {
  private userSubject = new BehaviorSubject<User>(new User());
  private previousUserSubject = new BehaviorSubject<User>(new User());
  private destroy$ = new Subject<void>();
  private initialized$ = new BehaviorSubject<boolean>(false);


  constructor(private settings: SettingsService) {
    // First register the settings set with a default user
    this.settings.registerSettingSet('user', [new User()]);

    // Then subscribe to both the initialization status and settings changes
    combineLatest([
      this.settings.getSettingSet<User>('user')!,
      this.initialized$
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([_, initialized]) => initialized),
      map(([users]) => users)
    ).subscribe({
      next: (users) => {
        if (users?.[0]?.name) {
          console.log('Loading user from settings:', users[0]);
          this.userSubject.next(users[0]);
        }
      },
      error: (error) => console.error('Error loading user:', error)
    });

    // Load initial data from IndexedDB
    this.settings.getSettingSet<User>('user')?.pipe(
      take(1)
    ).subscribe({
      next: (users) => {
        if (users?.[0]?.name) {
          console.log('Initial user load:', users[0]);
          this.userSubject.next(users[0]);
        }
        this.initialized$.next(true);
      }
    });
  }



  get user(): User {
    return this.userSubject.value;
  }

  get user$(): Observable<User> {
    return this.userSubject.asObservable();
  }


  get username(): string {
    return this.userSubject.value.name ?? '';
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

  async updateUser(userUpdate: Partial<IUser>): Promise<User> {
    const currentUser = this.userSubject.value;
    const updatedUser = new User(
      userUpdate.name ?? currentUser.name,
      userUpdate.mode ?? currentUser.mode,
      userUpdate.score ?? currentUser.score,
      userUpdate.level ?? currentUser.level,
      userUpdate.sections ?? currentUser.sections
    );

    // Update settings first to ensure persistence
    await firstValueFrom(
      new Observable<void>(observer => {
        this.settings.updateSettingSet('user', [updatedUser]);
        observer.next();
        observer.complete();
      }).pipe(
        catchError(error => {
          console.error('Failed to update user settings:', error);
          return EMPTY;
        })
      )
    );

    // Only update the subject after successful persistence
    this.userSubject.next(updatedUser);
    console.log('User updated successfully:', updatedUser);

    return updatedUser;
  }


  private saveUser(): void {
    this.settings.updateSettingSet('user', [this.userSubject.value]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
