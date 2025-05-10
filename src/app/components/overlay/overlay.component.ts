import {Component, OnDestroy, OnInit} from '@angular/core';
import {NgIf} from '@angular/common';
import {OverlayService, OverlayState} from '../../services/overlay.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-image-overlay',
  styles: `.image-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }`,
  template: `<img
    *ngIf="state.visible"
    [src]="state.imagePath"
    alt="Overlay"
    class="image-overlay"
    [style.z-index]="state.zIndex"
    [style.opacity]="state.opacity"
    [style.transition]="state.transition"
  />
  `,
  imports: [
    NgIf
  ],
})
export class ImageOverlayComponent implements OnInit, OnDestroy {
  state: OverlayState = {
    imagePath: '',
    visible: false,
  };

  private sub!: Subscription;

  constructor(private overlayService: OverlayService) {
  }

  ngOnInit() {
    this.sub = this.overlayService.state$.subscribe((s) => (this.state = s));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
