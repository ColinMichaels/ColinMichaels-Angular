import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {ProjectsOverviewComponent} from './projects-overview.component';

describe('ProjectsOverviewComponent', () => {
  let component: ProjectsOverviewComponent;
  let fixture: ComponentFixture<ProjectsOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsOverviewComponent, RouterTestingModule]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectsOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
