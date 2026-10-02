import {ComponentFixture, TestBed} from '@angular/core/testing';

import {HOLIDAY_CALENDAR_TODAY, UpcomingHolidayScheduleComponent} from './upcoming-holiday-schedule.component';

describe('UpcomingHolidayScheduleComponent', () => {
  let today = '2026-09-30';
  let fixture: ComponentFixture<UpcomingHolidayScheduleComponent>;
  beforeEach(async () => {
    today = '2026-09-30';
    await TestBed.configureTestingModule({imports: [UpcomingHolidayScheduleComponent],
      providers: [{provide: HOLIDAY_CALENDAR_TODAY, useValue: () => today}]}).compileComponents();
    fixture = TestBed.createComponent(UpcomingHolidayScheduleComponent);
    fixture.detectChanges();
  });

  it('shows celebration plans without premature edition or article links', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('article').length).toBe(7);
    expect(element.querySelectorAll('a').length).toBe(0);
    expect(element.textContent).toContain('Planned celebration');
    expect(element.textContent).toContain('Article release dates');
    const button = element.querySelector<HTMLButtonElement>('button')!;
    button.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('article').length).toBe(42);
    expect(element.querySelectorAll('a').length).toBe(0);
  });

  it('does not invent a publication or celebration date for an unresolved observance', () => {
    const element: HTMLElement = fixture.nativeElement;
    const search = element.querySelector<HTMLInputElement>('input')!;
    search.value = 'Vesak';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelectorAll('article').length).toBe(1);
    expect(element.textContent).toContain('Dates to be confirmed');
    expect(element.querySelectorAll('a').length).toBe(0);
  });

  it('moves completed holiday windows out of the initial upcoming view while retaining the full calendar', () => {
    fixture.destroy();
    today = '2030-01-01';
    fixture = TestBed.createComponent(UpcomingHolidayScheduleComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('article').length).toBe(6);
    expect(element.querySelector('[data-holiday-id="scary-christmas-2026"]')).toBeNull();
    element.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('article').length).toBe(42);
  });

  it('offers a clear search recovery without leaving unrelated links visible', () => {
    const element: HTMLElement = fixture.nativeElement;
    const search = element.querySelector<HTMLInputElement>('input')!;
    search.value = 'not-a-celebration';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelectorAll('article').length).toBe(0);
    expect(element.textContent).toContain('No holidays found');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelectorAll('article').length).toBe(7);
  });
});
