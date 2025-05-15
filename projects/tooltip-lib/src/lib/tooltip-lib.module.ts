import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipOverlayComponent } from './tooltip-overlay/tooltip-overlay.component';
import { TooltipDirective } from './tooltip.directive';

@NgModule({
  declarations: [],
  imports: [CommonModule, TooltipOverlayComponent, TooltipDirective],
  exports: [TooltipOverlayComponent, TooltipDirective]
})
export class TooltipModule {}
