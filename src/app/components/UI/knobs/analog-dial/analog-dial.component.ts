import {Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-analog-dial',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dial-container" (click)="advancePosition()">
      <div class="dial-body" [style.transform]="'rotate(' + currentRotation + 'deg)'">
        <div class="dial-marker"></div>
      </div>
      <div class="notches">
        <div class="notch"
             *ngFor="let position of positions; let i = index"
             [style.transform]="getNotchPosition(i)">
          <span class="notch-label"
                [style.transform]="'rotate(-' + (i * (360 / numberOfPositions)) + 'deg)'">
            {{ i + 1 }}
          </span>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .dial-container {
      position: relative;
      width: 60px;
      height: 60px;
      cursor: pointer;
    }

    .dial-body {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: conic-gradient(
          from -2deg,
          #efefff88,
          #00000088,
          #efefff88,
          #00000088,
          #efefff88
      );
      border: 4px solid #0005;
      transition: transform 0.2s cubic-bezier(0.4, 2, 0.5, 0.8);
    }

    .dial-marker {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 26px;
      height: 4px;
      background: #000b;
      border-radius: 2px;
      transform: translate(-50%, -50%);
    }

    .notches {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .notch {
      position: absolute;
      width: 8px;
      height: 1px;
      background: #fffc;
      top: 50%;
      left: 50%;
      transform-origin: 50% 50%;
    }

    .notch-label {
      position: absolute;
      color: #fffc;
      font-size: 12px;
      left: 38px;
      transform-origin: 0 50%;
      white-space: nowrap;
    }
  `]
})
export class AnalogDialComponent implements OnInit {
  @Input() numberOfPositions = 6;
  @Input() initialPosition = 0;
  @Output() positionChange = new EventEmitter<number>();

  positions: number[] = [];
  currentPosition = 0;
  currentRotation = 0;

  ngOnInit() {
    this.positions = Array(this.numberOfPositions).fill(0);
    this.currentPosition = this.initialPosition || 0;
    this.updateRotation();
  }

  advancePosition() {
    this.currentPosition = (this.currentPosition + 1) % this.numberOfPositions;
    this.updateRotation();
    this.positionChange.emit(this.currentPosition);
  }

  private updateRotation() {
    this.currentRotation = (this.currentPosition * 360) / this.numberOfPositions;
  }

  getNotchPosition(index: number): string {
    const angle = (index * 360 / this.numberOfPositions);
    return `rotate(${angle}deg) translateX(38px)`;
  }
}
