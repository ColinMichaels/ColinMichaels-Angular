import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SpaceXRocket} from '../models/spacex-models';

import {SpacexRocketComponent} from './spacex-rocket.component';

describe('SpacexRocketComponent', () => {
  let component: SpacexRocketComponent;
  let fixture: ComponentFixture<SpacexRocketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacexRocketComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SpacexRocketComponent);
    component = fixture.componentInstance;
    component.rocket = {
      name: 'Falcon 9',
      active: true,
      flickr_images: [],
      company: 'SpaceX',
      country: 'USA',
      first_flight: '2010-06-04',
      cost_per_launch: 62000000,
      success_rate_pct: 98,
      description: 'Test',
      height: {meters: 70, feet: 229.6},
      diameter: {meters: 3.7, feet: 12},
      mass: {kg: 549054, lb: 1207920},
      engines: {
        number: 9,
        type: 'merlin',
        version: '1D+',
        thrust_vacuum: {kN: 8227, lbf: 1849500},
        propellant_1: 'RP-1',
        propellant_2: 'LOX'
      },
      stages: 2,
      boosters: 0,
      payload_weights: [],
      id: 'falcon9',
      wikipedia: ''
    } as unknown as SpaceXRocket;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
