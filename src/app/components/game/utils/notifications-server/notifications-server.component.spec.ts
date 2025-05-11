import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsServerComponent } from './notifications-server.component';

describe('NotificationsServerComponent', () => {
  let component: NotificationsServerComponent;
  let fixture: ComponentFixture<NotificationsServerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsServerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationsServerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
