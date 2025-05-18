import {Component, OnInit} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faApple} from '@fortawesome/free-brands-svg-icons';
import {Router} from '@angular/router';

@Component({
  selector: 'app-loading-screen',
  imports: [
    FaIconComponent
  ],
  templateUrl: './loading-screen.component.html',
  styles: `
    @keyframes loading-bar {
      0% {
        transform: translateX(-100%);
      }
      50% {
        transform: translateX(-50%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    .animate-loading-bar {
      animation: loading-bar 10.5s ease-in-out infinite;
      width: 100%;
    }
  `
})
export class LoadingScreenComponent implements OnInit {

  protected readonly faApple = faApple;
  private redirectTimeout = Math.floor(Math.random() * 1000) + 8000;

  constructor(private router: Router) {
  }
  ngOnInit() {
   const timer =  setTimeout(() => {
      this.router.navigate(['/login']).then(() =>{
        clearTimeout(timer);
      });
    }, this.redirectTimeout);
  }
}
