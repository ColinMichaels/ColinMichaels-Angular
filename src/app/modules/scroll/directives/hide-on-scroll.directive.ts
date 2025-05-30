import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  OnInit,
} from '@angular/core';

@Directive({
  selector: '[appHideOnScroll]',
  standalone: false
})
export class HideOnScrollDirective implements OnInit {
  @Input() scrollThreshold = 100;
  @Input() hideClass = '-translate-y-full opacity-0'; // default class
  @Input() animate = true;

  private isHidden = false;

  constructor(
    private readonly el: ElementRef,
    private readonly renderer: Renderer2) {
  }

  ngOnInit() {
    if (this.animate) {
      this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out');
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const shouldHide = scrollTop > this.scrollThreshold;

    const classList = this.hideClass.split(' ').filter(cls => cls.trim().length > 0);

    if (shouldHide && !this.isHidden) {
      classList.forEach(cls => this.renderer.addClass(this.el.nativeElement, cls));
      this.isHidden = true;
    } else if (!shouldHide && this.isHidden) {
      classList.forEach(cls => this.renderer.removeClass(this.el.nativeElement, cls));
      this.isHidden = false;
    }
  }
}
