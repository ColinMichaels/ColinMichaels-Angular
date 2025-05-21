import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faApple} from '@fortawesome/free-brands-svg-icons';
import {TailwindClassGeneratorService} from '../../services/tailwind-class-generator.service';

@Component({
  selector: 'app-sleep-screen',
  standalone: true,
  imports: [
    FaIconComponent
  ],
  template: `
    <div
      [class]="rndBgClass?.bg ? rndBgClass?.bg + '/90' :  'bg-black'"
      class="w-screen h-screen transition-colors transform-gpu
      duration-1000 ease-in-out flex flex-col items-center justify-center"
      (click)="handleClick()"
    >
      <fa-icon
        [icon]="faApple"
        [class]="rndBgClass?.text ? rndBgClass?.text  :  'text-gray-300/80'"
        class="text-7xl animate-pulse transition-colors  duration-1000 mb-4"
      ></fa-icon>
      <p class="text-white/70 text-sm">Click to wake</p>
    </div>
    <div class="pointer-events-none">
      <div class="w-full h-full absolute top-0 left-0
    gradient--bg-sunset animate-pulse opacity-60">

      </div>
      <div class="w-full h-full absolute top-0 left-0
    gradient--bg-purple scale-x-150 animate-spin opacity-60">

      </div>
    </div>

  `
})
export class SleepScreenComponent implements OnInit, OnDestroy {
  timer!: any;
  rndBgClass!: any;

  constructor(
    private router: Router,
    private tailwind: TailwindClassGeneratorService) {

  }

  ngOnInit() {
    this.timer = setInterval(() => {
      this.rndBgClass = this.tailwind.generateRandomTextAndBg();
    }, 10000)
  }

  handleClick() {
    this.router.navigate(['/login']).then(
      () => {
        clearInterval(this.timer);
      }
    );
  }

  ngOnDestroy() {
    this.timer = null;
  }

  protected readonly faApple = faApple;
}
