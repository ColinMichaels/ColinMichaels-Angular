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
  EMPTY,
  Observable
} from 'rxjs';
import {SettingsService} from './settings.service';
import {catchError} from 'rxjs/operators';
import {LogService} from './log.service';
import {StorageService} from './storage.service';

const OS_USER_SETTING_SET_ID = 'osUser';
const LEGACY_USER_SETTING_SET_ID = 'user';

export interface OsUserProfile {
  name: string;
  mode: TypingMode;
  score: number;
  level: number;
  sections: number;
}

export class OsUser implements OsUserProfile {
  constructor(
    public name: string = '',
    public mode: TypingMode = 'default',
    public score = 0,
    public level = 0,
    public sections = 0
  ) {
  }
}

@Injectable({providedIn: 'root'})
export class OsUserService implements OnDestroy {
  private osUserSubject = new BehaviorSubject<OsUser>(new OsUser());
  private previousOsUserSubject = new BehaviorSubject<OsUser>(new OsUser());
  private destroy$ = new Subject<void>();
  private initialized$ = new BehaviorSubject<boolean>(false);


  constructor(
    private settings: SettingsService,
    private storageService: StorageService,
    private logger: LogService
  ) {
    // First register the settings set with a default OS user.
    this.settings.registerSettingSet(OS_USER_SETTING_SET_ID, [new OsUser()]);
    this.migrateLegacyUserSetting();

    // Then subscribe to both the initialization status and settings changes
    combineLatest([
      this.settings.getSettingSet<OsUser>(OS_USER_SETTING_SET_ID)!,
      this.initialized$
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([, initialized]) => initialized),
      map(([users]) => users)
    ).subscribe({
      next: (users) => {
        if (users?.[0]?.name) {
          this.logger.debug(`Loading OS user from settings: `, users[0]);
          this.osUserSubject.next(users[0]);
        }
      },
      error: (error) => this.logger.error(`Error loading OS user: `, error)
    });

    // Load initial data from IndexedDB
    this.settings.getSettingSet<OsUser>(OS_USER_SETTING_SET_ID)?.pipe(
      take(1)
    ).subscribe({
      next: (users) => {
        if (users?.[0]?.name) {
          this.logger.debug(`Initial OS user load: `, users[0]);
          this.osUserSubject.next(users[0]);
        }
        this.initialized$.next(true);
      }
    });
  }


  get user(): OsUser {
    return this.osUserSubject.value;
  }

  get user$(): Observable<OsUser> {
    return this.osUserSubject.asObservable();
  }


  get username(): string {
    return this.osUserSubject.value.name ?? '';
  }


  get previousLevel(): number {
    return this.previousOsUserSubject.value.level;
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

  async updateUser(userUpdate: Partial<OsUserProfile>): Promise<OsUser> {
    const currentUser = this.osUserSubject.value;
    const updatedUser = new OsUser(
      userUpdate.name ?? currentUser.name,
      userUpdate.mode ?? currentUser.mode,
      userUpdate.score ?? currentUser.score,
      userUpdate.level ?? currentUser.level,
      userUpdate.sections ?? currentUser.sections
    );

    // Update settings first to ensure persistence
    await firstValueFrom(
      new Observable<void>(observer => {
        this.settings.updateSettingSet(OS_USER_SETTING_SET_ID, [updatedUser]);
        observer.next();
        observer.complete();
      }).pipe(
        catchError(error => {
          this.logger.error(`Failed to update OS user settings: ${error}`);
          return EMPTY;
        })
      )
    );

    // Only update the subject after successful persistence
    this.osUserSubject.next(updatedUser);
    this.logger.debug(`OS user updated successfully: ${updatedUser}`);

    return updatedUser;
  }

  private migrateLegacyUserSetting(): void {
    const osUsers$ = this.settings.getSettingSet<OsUser>(OS_USER_SETTING_SET_ID);

    if (!osUsers$) {
      return;
    }

    this.storageService.getItems<OsUser>(LEGACY_USER_SETTING_SET_ID).pipe(take(1)).subscribe(users => {
      const legacyUser = users?.[0];
      const currentOsUser = osUsers$.value?.[0];

      if (!legacyUser?.name || currentOsUser?.name) {
        return;
      }

      const migratedUser = new OsUser(
        legacyUser.name,
        legacyUser.mode,
        legacyUser.score,
        legacyUser.level,
        legacyUser.sections
      );

      this.logger.debug(`Migrating legacy user settings to OS user settings: `, migratedUser);
      this.settings.updateSettingSet(OS_USER_SETTING_SET_ID, [migratedUser]);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
