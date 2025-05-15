import {Component, OnInit} from '@angular/core';
import {UserService, User} from '../../services/user.service';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {NotificationService} from '../../services/notification.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faUserInjured} from '@fortawesome/free-solid-svg-icons';


export class Player extends User {
  override level: number;
  avatarUrl?: string;
  preferredRole?: string;

  constructor(init?: Partial<Player>) {
    super(init?.name ?? '');
    this.level = init?.level ?? 1;
    this.avatarUrl = init?.avatarUrl ?? '';
    this.preferredRole = init?.preferredRole ?? '';
  }
}
@Component({
  selector: 'app-player-configurator',
  imports: [
    ReactiveFormsModule,
    FaIconComponent
  ],
  templateUrl: './player-configurator.component.html',
  styles: `.input-field {
    @apply w-full px-2 py-1 text-xs mt-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100;
    @apply focus:outline-none focus:ring-2 focus:ring-blue-500;
  }`
})
export class PlayerConfiguratorComponent implements OnInit {
  form!: FormGroup;
  currentPlayer!: Player;

  constructor(
    private fb: FormBuilder,
    private notify: NotificationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Replace this with an actual fetch if needed
    const user = this.userService.user; // or fetchUser()
    this.currentPlayer = new Player(user);

    this.form = this.fb.group({
      name: [this.currentPlayer.name, [Validators.required, Validators.minLength(2)]],
      level: [this.currentPlayer.level, [Validators.required, Validators.min(1)]],
      avatarUrl: [this.currentPlayer.avatarUrl],
      preferredRole: [this.currentPlayer.preferredRole],
      settings: this.fb.group({
        soundVolume: [50],
        graphicsQuality: ['high'],
        enableHints: [true]
      }),
      stats: this.fb.group({
        speed: [5],
        intelligence: [5],
        creativity: [5]
      })
    });
  }


  onSave(): void {
    const updated = { ...this.currentPlayer, ...this.form.value };
    this.userService.updateUser(updated);
    this.notify.show({
      title: 'Player Updated',
      message: `Your player settings have been updated.`,
      media: {
        id: '',
        title: 'Player Updated',
        content: {
          type: 'icon',
          data: {
            type: "fontawesome",
            name: "fa fa-check text-base"
          }
        }
      },
      type: 'success',
      duration: 5 * 1000
    });

    this.notify.show({
      title: 'New Stats',
      message: this.userService.statsString,
      media: {
        id: '',
        title: 'Player Updated',
        content: {
          type: 'icon',
          data: {
            type: "fontawesome",
            name: "fa fa-gamepad text-base"
          }
        }
      },
      type: 'error',
      duration: 6 * 1000
    });
  }

  onReset(): void {
    this.form.reset(this.form.value); // or reset to initialPlayer if stored
  }

  protected readonly faUserInjured = faUserInjured;
}
