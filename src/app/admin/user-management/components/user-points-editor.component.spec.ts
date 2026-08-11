import {ComponentFixture, TestBed} from '@angular/core/testing';

import {AdminManagedUser} from '../models/user-management.models';
import {UserManagementService} from '../services/user-management.service';
import {UserPointsEditorComponent} from './user-points-editor.component';

const managedUser: AdminManagedUser = {
  uid: 'reader-uid',
  email: 'reader@example.com',
  displayName: 'Reader Example',
  photoURL: null,
  providerIds: ['password'],
  disabled: false,
  emailVerified: true,
  createdAt: '2026-07-01T12:00:00.000Z',
  lastSignInAt: '2026-07-16T12:00:00.000Z',
  roles: ['viewer'],
  customClaims: {roles: {viewer: true}},
  points: {
    total: 40,
    postReads: 10,
    shares: 10,
    approvedComments: 15,
    dailyDiscoveries: 10,
    manualAdjustments: -5,
  },
};

describe('UserPointsEditorComponent', () => {
  let fixture: ComponentFixture<UserPointsEditorComponent>;
  let userManagement: jasmine.SpyObj<UserManagementService>;

  beforeEach(async () => {
    userManagement = jasmine.createSpyObj<UserManagementService>('UserManagementService', ['adjustUserPoints']);
    userManagement.adjustUserPoints.and.resolveTo({
      user: {
        ...managedUser,
        points: {...managedUser.points, total: 50, manualAdjustments: 5},
      },
      adjustment: {
        id: 'admin-adjustment-reader-uid-1',
        operation: 'add',
        delta: 10,
        previousTotal: 40,
        newTotal: 50,
        reason: 'Contest prize',
        updatedAt: '2026-08-10T12:00:00.000Z',
      },
    });

    await TestBed.configureTestingModule({
      imports: [UserPointsEditorComponent],
      providers: [{provide: UserManagementService, useValue: userManagement}],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPointsEditorComponent);
    fixture.componentRef.setInput('user', managedUser);
    fixture.detectChanges();
  });

  it('shows the current point breakdown and blocks a removal below zero', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Current total');
    expect(element.textContent).toContain('40');
    expect(element.textContent).toContain('Admin adjustments');
    expect(element.textContent).toContain('-5');

    findButton(element, 'Remove')?.click();
    setInputValue(element.querySelector<HTMLInputElement>('input[type="number"]'), '41');
    setTextAreaValue(element.querySelector('textarea'), 'Balance correction');
    fixture.detectChanges();

    expect(element.textContent).toContain('You cannot remove more points than the current balance.');
    expect(findButton(element, 'Save Point Change')?.disabled).toBeTrue();
  });

  it('submits an audited point change and emits the refreshed user', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const pointsAdjusted = jasmine.createSpy('pointsAdjusted');
    fixture.componentInstance.pointsAdjusted.subscribe(pointsAdjusted);

    setInputValue(element.querySelector<HTMLInputElement>('input[type="number"]'), '10');
    setTextAreaValue(element.querySelector('textarea'), 'Contest prize');
    fixture.detectChanges();

    expect(element.textContent).toContain('Balance preview: 40 → 50 (+10)');
    findButton(element, 'Save Point Change')?.click();
    await fixture.whenStable();

    expect(userManagement.adjustUserPoints).toHaveBeenCalledOnceWith({
      uid: managedUser.uid,
      operation: 'add',
      amount: 10,
      reason: 'Contest prize',
    });
    expect(pointsAdjusted).toHaveBeenCalled();
    expect(pointsAdjusted.calls.mostRecent().args[0].user.points.total).toBe(50);
  });
});

function findButton(root: ParentNode | null, label: string): HTMLButtonElement | undefined {
  return Array.from(root?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    .find(button => button.textContent?.trim() === label);
}

function setInputValue(input: HTMLInputElement | null, value: string): void {
  if (!input) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setTextAreaValue(input: HTMLTextAreaElement | null, value: string): void {
  if (!input) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
}
