import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-piano-settings',
  imports: [
    NgForOf
  ],
  templateUrl: './piano-settings.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `/* settings-sidebar.component.css */
  .settings-sidebar {
    position: fixed;
    top: 0;
    right: -320px;
    width: 300px;
    height: 100vh;
    background-color: #2d3748;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
    padding: 1rem;
    overflow-y: auto;
    transition: right 0.3s ease;
    z-index: 1000;
    color: white;
  }

  .settings-sidebar.visible {
    right: 0;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #4a5568;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #cbd5e0;
    cursor: pointer;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: white;
  }

  .control-group {
    margin-bottom: 1.5rem;
  }

  .patch-btn {
    background-color: #4a5568;
    border: none;
    color: white;
    transition: all 0.2s;
  }

  .patch-btn:hover {
    background-color: #718096;
  }

  .patch-btn.selected {
    background-color: #4299e1;
  }

  /* Customize slider styling */
  input[type="range"] {
    -webkit-appearance: none;
    background: #4a5568;
    height: 6px;
    border-radius: 3px;
    margin: 0.5rem 0;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4299e1;
    cursor: pointer;
  }`
})
export class PianoSettingsComponent {
  @Input() isVisible: boolean = false;
  @Input() startingOctave: number = 4;
  @Input() patches: any[] = []; // Adjust the type based on your patch structure
  @Input() selectedPatch: any; // Current selected patch

  @Output() octaveChange = new EventEmitter<number>();
  @Output() patchChange = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  onOctaveChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.octaveChange.emit(value);
  }

  onPatchChange(patch: any) {
    this.patchChange.emit(patch);
  }

  closeSidebar() {
    this.close.emit();
  }

}
