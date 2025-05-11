import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { GameConfigService, GameLevel } from '../../services/game-config.service';
import { UserService } from '../../services/user.service';
import {NgIf} from '@angular/common';


@Component({
  selector: 'app-level-loader',
  templateUrl: './level-loader.component.html',
  styles: `.error {
    color: #ff5555;
    font-weight: bold;
    margin-top: 1rem;
  }`,
  imports: [
    NgIf
  ]
})
export class LevelLoaderComponent implements OnInit {
  @Output() loaded = new EventEmitter<GameLevel>();
  @Output() failed = new EventEmitter<string>();

  loading = true;
  errorMessage = '';

  constructor(
    private gameConfig: GameConfigService,
    private userService: UserService
  ) {}

  ngOnInit() {
    const userLevel = this.userService.user.level;

    this.gameConfig.loadLevelsForProgress(userLevel, 1).then(observable => {
      observable.subscribe({
        next: (levels) => {
          this.gameConfig.setLevels(levels);
          const level = levels[userLevel];

          if (level) {
            this.loaded.emit(level);
          } else {
            this.errorMessage = `Level ${userLevel + 1} not found.`;
            this.failed.emit(this.errorMessage);
          }

          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = `Error loading levels: ${err.message}`;
          this.failed.emit(this.errorMessage);
          this.loading = false;
        }
      });
    });
  }
}
