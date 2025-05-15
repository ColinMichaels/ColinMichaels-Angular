// context-menu.component.ts
import {Component, Inject, HostListener, Input} from '@angular/core';
import {CONTEXT_MENU_DATA, ContextMenuConfig, ContextMenuItem} from '../../services/context-menu.service';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-context-menu',
  template: `
    <div class="bg-zinc-900/50 text-white text-xs shadow-md border rounded min-w-[200px]" tabindex="0">
      <ng-container *ngFor="let item of injectedConfig.items; let i = index">
        <div *ngIf="item.separator" class="border-t my-1"></div>
        <div *ngIf="!item.separator" [class.bg-gray-900]="i === focusedIndex" class="relative group">
          <button
            class="w-full text-left px-4 py-2 hover:bg-zinc-700 disabled:opacity-50"
            [disabled]="item.disabled"
            (click)="onSelect(item)"
          >
            <span *ngIf="item.icon" class="mr-2">{{ item.icon }}</span>{{ item.label }}
          </button>
          <div *ngIf="item.submenu?.length"
               class="absolute top-0 left-full mt-[-0.25rem] z-10 hidden group-hover:block">
            <app-context-menu
              *ngIf="inputConfig && item.submenu?.length"
              [inputConfig]="{
                menuId: item.id || 'submenu',
                items: item.submenu,
                userRoles: inputConfig.userRoles || []}">
            </app-context-menu>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  imports: [
    NgIf,
    NgForOf
  ],
  styles: [':host { outline: none; display: block; }']
})
export class ContextMenuComponent {
  focusedIndex = 0;
  @Input() inputConfig!: { menuId: any; items: any; userRoles: string[] | undefined };

  constructor(@Inject(CONTEXT_MENU_DATA) public injectedConfig: ContextMenuConfig) {
  }

  onSelect(item: ContextMenuItem): void {
    if (!item.disabled) item.action();
  }

  @HostListener('keydown', ['$event'])
  handleKey(event: KeyboardEvent): void {
    const items = this.injectedConfig.items.filter(i => !i.separator && !i.disabled);
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
      this.focusedIndex = (this.focusedIndex + 1) % items.length;
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      this.focusedIndex = (this.focusedIndex - 1 + items.length) % items.length;
      event.preventDefault();
    } else if (event.key === 'Enter') {
      this.onSelect(items[this.focusedIndex]);
      event.preventDefault();
    }
  }
}
