import {fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';

import {TooltipService} from './tooltip.service';

describe('TooltipService', () => {
  let hostElement: HTMLButtonElement;
  let service: TooltipService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TooltipService);
    hostElement = document.createElement('button');
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    service.hide();
    hostElement.remove();
  });

  it('renders tooltip copy as text and tears down idempotently', () => {
    const onHidden = jasmine.createSpy('onHidden');
    const tooltipId = service.show({
      hostElement,
      text: 'Email <EMAIL> for help',
      onHidden,
    });
    const tooltip = document.getElementById(tooltipId);

    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    expect(tooltip?.textContent).toContain('Email <EMAIL> for help');
    expect(tooltip?.querySelector('email')).toBeNull();
    expect(() => service.hide(tooltipId)).not.toThrow();
    expect(() => service.hide(tooltipId)).not.toThrow();
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(document.getElementById(tooltipId)).toBeNull();
  });

  it('owns and cancels the current auto-dismiss timer', fakeAsync(() => {
    const firstHidden = jasmine.createSpy('firstHidden');
    const secondHidden = jasmine.createSpy('secondHidden');
    const firstId = service.show({
      hostElement,
      text: 'First',
      autoDismissDelay: 25,
      onHidden: firstHidden,
    });
    const secondId = service.show({
      hostElement,
      text: 'Second',
      autoDismissDelay: 50,
      onHidden: secondHidden,
    });
    flushMicrotasks();

    expect(document.getElementById(firstId)).toBeNull();
    expect(firstHidden).toHaveBeenCalledTimes(1);
    expect(document.getElementById(secondId)).not.toBeNull();

    tick(25);
    expect(document.getElementById(secondId)).not.toBeNull();
    expect(secondHidden).not.toHaveBeenCalled();

    tick(25);
    expect(document.getElementById(secondId)).toBeNull();
    expect(secondHidden).toHaveBeenCalledTimes(1);
  }));

  it('does not orphan a tooltip when a replacement callback shows another one', fakeAsync(() => {
    let reentrantId: string | undefined;
    const firstId = service.show({
      hostElement,
      text: 'First',
      onHidden: () => {
        reentrantId = service.show({hostElement, text: 'Reentrant'});
      },
    });
    const replacementId = service.show({hostElement, text: 'Replacement'});

    expect(document.getElementById(firstId)).toBeNull();
    expect(document.getElementById(replacementId)).not.toBeNull();

    flushMicrotasks();

    expect(document.getElementById(replacementId)).toBeNull();
    expect(document.getElementById(reentrantId!)).not.toBeNull();
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);
  }));
});
