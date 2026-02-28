import {Component, OnDestroy, OnInit, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import {Setting, SettingsService} from '../../../../services/settings.service';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
export type ThemeOption = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-4  h-full">
      <form *ngIf="formGroup" [formGroup]="formGroup" (ngSubmit)="saveSettings()">
      <div class="space-x-4 flex items-center justify-around">
        <span class="text-sm text-white/70">Theme</span>
        <select formControlName="theme" class="w-1/2 bg-zinc-800 text-white p-2 rounded">
          <ng-container *ngFor="let option of ['light', 'dark', 'system']">
            <option [value]="option">{{option}}</option>
          </ng-container>
        </select>


        <button (click)="setTheme('light')"
                class="hover:opacity-100 hover:grayscale-0 bg-white text-black w-full px-2 py-1 rounded-full">Light</button>
        <button (click)="setTheme('dark')"
                class="hover:opacity-100 hover:grayscale-0 bg-black text-white w-full px-2 py-1 rounded-full">Dark</button>
        <button (click)="setTheme('system')"
                class="hover:opacity-100 hover:grayscale-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white w-full px-2 py-1 rounded-full">System</button>
      </div>

      <div class="mt-4 flex items-center justify-around">
        <label class="flex flex-col">
          <span class="text-sm text-white/70">Accent Color</span>
          <input type="color" formControlName="accentColor"
                 class="w-10 h-10 rounded-full border-none bg-transparent cursor-pointer" />
        </label>
        <label class="flex flex-col">
          <span class="text-sm text-white/70">Auto Hide Menu Bar</span>
          <input type="checkbox" formControlName="autoHideMenuBar" class="accent-blue-500">
        </label>
      </div>
      </form>
    </div>
  `,
  styles: ``
})
export class AppearanceSettingsComponent implements OnInit, OnDestroy {
  private settingsService = inject(SettingsService);
  private readonly settingsSetId = 'appearance';
  private formSyncSub?: Subscription;
  formGroup!: FormGroup;
  accentColor: string = '#4f46e5';
  theme: ThemeOption = 'light';
  autoHideMenuBar = false;

  appearanceOptions: Setting[] = [
      { id: 'theme', value: 'system'},
      { id: 'accentColor', value: '#4f46e5'},
      { id: 'autoHideMenuBar', value: 'true'},
    ];
  settingKeys: string[] = [];


  constructor() {
    this.settingsService.registerSettingSet(this.settingsSetId, this.appearanceOptions);
  }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const formGroup = this.settingsService.createFormGroupForSettings(this.settingsSetId);

    if (formGroup) {
      this.formGroup = formGroup;
      this.settingKeys = Object.keys(this.formGroup.controls);
      console.warn('Form group created:', this.formGroup.value, this.settingKeys, this.settingsSetId);
      this.formSyncSub = this.settingsService.syncFormGroupWithSettingSet(this.formGroup, this.settingsSetId);
    }

  }

  setTheme(theme: ThemeOption): void {
    this.settingsService.updateSettingSetWithSingleValue(this.settingsSetId,'theme', theme);
  }

  saveSettings(): void {
    console.log('Settings saved:', this.formGroup.value);
  }

  ngOnDestroy(): void {
    this.formSyncSub?.unsubscribe();
  }

}
