import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {PrivacyPolicyComponent} from './privacy-policy.component';

describe('PrivacyPolicyComponent', () => {
  let fixture: ComponentFixture<PrivacyPolicyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyComponent);
    fixture.detectChanges();
  });

  it('states the no-sale and deletion commitments', () => {
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';

    expect(element.querySelector('.site-layout.site-layout-prose')).not.toBeNull();
    expect(text).toContain('We do not sell, rent, or trade your personal information.');
    expect(text).toContain('You may ask at any time to have personal information associated with you removed.');
    expect(text).toContain('Prospective author details are not published');
  });

  it('provides a direct contact for removal requests', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a[href="mailto:colin@colinmichaels.com"]'
    );

    expect(link).not.toBeNull();
  });
});
