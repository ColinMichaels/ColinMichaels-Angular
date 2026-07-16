import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

import {SpaceXComponent} from './space-x.component';

describe('SpaceXComponent', () => {
  let component: SpaceXComponent;
  let fixture: ComponentFixture<SpaceXComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpaceXComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SpaceXComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses native buttons for mission images and launch selection', () => {
    component.selectedLaunch.links.flickr.original = ['https://example.com/mission.jpg'];
    component.launches = [component.selectedLaunch];
    component.showSidebar = true;
    fixture.detectChanges();

    const imageButton = fixture.nativeElement.querySelector(
      'button[aria-label="Open mission image in a new window"]'
    ) as HTMLButtonElement;
    const launchButton = fixture.nativeElement.querySelector(
      'aside button[aria-pressed]'
    ) as HTMLButtonElement;

    expect(imageButton.type).toBe('button');
    expect(launchButton.type).toBe('button');
    expect(launchButton.getAttribute('aria-pressed')).toBe('true');
  });
});
