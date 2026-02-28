import { ComponentFixture, TestBed } from '@angular/core/testing';
import {CONTEXT_MENU_DATA} from '../../services/context-menu.service';

import { ContextMenuComponent } from './context-menu.component';

describe('ContextMenuComponent', () => {
  let component: ContextMenuComponent;
  let fixture: ComponentFixture<ContextMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContextMenuComponent],
      providers: [{
        provide: CONTEXT_MENU_DATA,
        useValue: {menuId: 'test-menu', items: []}
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
