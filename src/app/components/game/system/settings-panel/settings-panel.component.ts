import {Component, ChangeDetectionStrategy} from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {SettingsSubpanelComponent} from './sub-settings-panel/sub-settings-panel.component';
import {OsUserService} from '../../services/os-user.service';
import {faCog, faNetworkWired, faPalette} from '@fortawesome/free-solid-svg-icons';
import {faUserCircle} from '@fortawesome/free-regular-svg-icons';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';

interface SettingsMenuItem {
  key: string;
  label: string;
  icon: IconDefinition;
  description: string;
}

@Component({
  selector: 'app-settings-panel',
  imports: [
    NgClass,
    FaIconComponent,
    NgForOf,
    SettingsSubpanelComponent,
    NgIf
  ],
  templateUrl: './settings-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class SettingsPanelComponent {
  userName = 'Colin Michaels';
  activePanel: SettingsMenuItem = {
    key: 'general',
    label: 'General',
    icon: faCog,
    description: 'Manage general preferences.'
  }

  settingsMenu: SettingsMenuItem[] = [
    { key: 'general', label: 'General', icon: faCog, description: 'Manage general preferences.' },
    { key: 'network', label: 'Network', icon: faNetworkWired, description: 'Configure network settings.' },
    { key: 'appearance', label: 'Appearance', icon: faPalette, description: 'Adjust UI and themes.' },
    // add more
  ];

  constructor(private userService: OsUserService) {
    this.userName = this.userService.user.name;
  }

  selectPanel(item: SettingsMenuItem) {
    this.activePanel = item;
  }

  protected readonly faUserCircle = faUserCircle;
}
