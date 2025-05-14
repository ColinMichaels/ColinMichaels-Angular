import { Component } from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {SettingsSubpanelComponent} from './sub-settings-panel/sub-settings-panel.component';
import {UserService} from '../../services/user.service';

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
    icon: 'cog',
    description: 'Manage general preferences.'
  }

  settingsMenu = [
    { key: 'general', label: 'General', icon: 'cog', description: 'Manage general preferences.' },
    { key: 'network', label: 'Network', icon: 'network-wired', description: 'Configure network settings.' },
    { key: 'appearance', label: 'Appearance', icon: 'palette', description: 'Adjust UI and themes.' },
    // add more
  ];

  constructor(private userService: UserService) {
    this.userName = this.userService.user.name;
  }

  selectPanel(item: any) {
    this.activePanel = item;
  }
}
