import {ComponentFixture, TestBed} from '@angular/core/testing';

import {KeyboardControllerComponent, KeyboardNoteEvent} from './keyboard-controller.component';

describe('KeyboardControllerComponent', () => {
  let component: KeyboardControllerComponent;
  let fixture: ComponentFixture<KeyboardControllerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyboardControllerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyboardControllerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generates a responsive octave range', () => {
    component.startingOctave = 2;
    component.visibleOctaves = 3;

    component.generateKeyMap();

    expect(component.keyMap.length).toBe(36);
    expect(component.keyMap[0]?.label).toBe('C2');
    expect(component.keyMap[component.keyMap.length - 1]?.label).toBe('B4');
  });

  it('emits normalized note events when a key is triggered', () => {
    const emittedNotes: KeyboardNoteEvent[] = [];
    component.noteTriggered.subscribe(event => emittedNotes.push(event));

    component.triggerNote('D#', 4, 0.5);

    expect(emittedNotes).toEqual([{note: 'D#4', duration: 0.5}]);
    expect(component.pressedKeys.has('D#4')).toBeTrue();
  });
});
