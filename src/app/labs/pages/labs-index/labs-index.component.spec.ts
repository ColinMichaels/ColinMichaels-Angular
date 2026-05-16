import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {LabsIndexComponent} from './labs-index.component';

describe('LabsIndexComponent', () => {
  let fixture: ComponentFixture<LabsIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LabsIndexComponent,
        RouterTestingModule,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LabsIndexComponent);
  });

  it('renders the current labs directory without mounting component demos by default', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Experimental Systems');
    expect(element.textContent).toContain('Full Screen Backgrounds');
    expect(element.textContent).toContain('SpaceX Launches');
    expect(element.textContent).toContain('MIDI Sequencer');
    expect(element.textContent).toContain('Tailwind Class Generator');
    expect(element.textContent).toContain('Choose a lab to mount its demo.');
    expect(element.querySelector('app-space-x')).toBeNull();
    expect(element.querySelector('app-weather')).toBeNull();
    expect(element.querySelector('app-patch-editor')).toBeNull();
    expect(element.querySelector('app-midi-sequencer')).toBeNull();
    expect(element.textContent).not.toContain('Core OS Experiments');
  });

  it('mounts only the selected component lab', async () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const spaceXButton = Array.from(element.querySelectorAll('button'))
      .find(button => button.textContent?.includes('SpaceX Launches'));

    spaceXButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('app-space-x')).not.toBeNull();
    expect(element.querySelector('app-weather')).toBeNull();
    expect(element.querySelector('app-patch-editor')).toBeNull();
  });
});
