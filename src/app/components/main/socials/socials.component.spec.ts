import { ComponentFixture, TestBed } from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import { SocialsComponent } from './socials.component';

describe('SocialsComponent', () => {
  let component: SocialsComponent;
  let fixture: ComponentFixture<SocialsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialsComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not duplicate the OS launch entry in the footer links', () => {
    expect(component.links.some(link => link.title === 'game')).toBeFalse();
  });

  it('keeps informational links out of the fixed social bar', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="/privacy"]')).toBeNull();
    expect(element.textContent).not.toContain('Contact');
  });
});
