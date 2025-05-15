import { Component } from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {SettingsSubpanelComponent} from './sub-settings-panel/sub-settings-panel.component';
import {UserService} from '../../services/user.service';
import {faCog, faNetworkWired, faPalette} from '@fortawesome/free-solid-svg-icons';
import {faUserCircle} from '@fortawesome/free-regular-svg-icons';

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
  styles: ``
})
export class SettingsPanelComponent {
  userName = 'Colin Michaels';
  activePanel = {
    key: 'general',
    label: 'General',
    icon: faCog,
    description: 'Manage general preferences.'
  }

  settingsMenu = [
    { key: 'general', label: 'General', icon: faCog, description: 'Manage general preferences.' },
    { key: 'network', label: 'Network', icon: faNetworkWired, description: 'Configure network settings.' },
    { key: 'appearance', label: 'Appearance', icon: faPalette, description: 'Adjust UI and themes.' },
    // add more
  ];

  constructor(private userService: UserService) {
    this.userName = this.userService.user.name;
  }

  selectPanel(item: any) {
    this.activePanel = item;
  }

  protected readonly faUserCircle = faUserCircle;
}
