import {
  Component,
  Input,
  ViewContainerRef,
  ViewChild,
  ComponentRef,
  AfterViewInit,
  SimpleChanges, OnChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings-subpanel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ng-container #panelHost></ng-container>
  `,
})
export class SettingsSubpanelComponent implements AfterViewInit, OnChanges {
  @Input() panelKey!: string;
  @ViewChild('panelHost', { read: ViewContainerRef, static: true })
  panelHost!: ViewContainerRef;

  private componentRef?: ComponentRef<any>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['panelKey'] && !changes['panelKey'].isFirstChange()) {
      this.loadPanel();
    }
  }

  async ngAfterViewInit() {
    await this.loadPanel();
  }

  async loadPanel() {
    this.panelHost.clear();

    switch (this.panelKey) {
      case 'general': {
        const { GeneralSettingsComponent } = await import('../../settings-panel/panels/general-settings/general-settings.component');
        this.componentRef = this.panelHost.createComponent(GeneralSettingsComponent);
        break;
      }
      case 'network': {
        const { NetworkSettingsComponent } = await import('../../settings-panel/panels/network-settings/network-settings.component');
        this.componentRef = this.panelHost.createComponent(NetworkSettingsComponent);
        break;
      }
      case 'appearance': {
        const { AppearanceSettingsComponent } = await import('../../settings-panel/panels/appearance-settings/appearance-settings.component');
        this.componentRef = this.panelHost.createComponent(AppearanceSettingsComponent);
        break;
      }
      default:
        // Fallback UI
        this.panelHost.element.nativeElement.innerHTML = '<p class="text-white/60">No settings available.</p>';
    }
  }
}
