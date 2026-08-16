import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Chart} from 'chart.js';

import {BlogChartComponent} from './blog-chart.component';

describe('BlogChartComponent', () => {
  let fixture: ComponentFixture<BlogChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogChartComponent);
  });

  it('renders every Chart.js dataset with labels, formatting, source, and accessible values', () => {
    fixture.componentRef.setInput('block', {
      id: 'chart-datasets',
      type: 'chart',
      data: {
        title: 'Song titles compressed while love lost share',
        chartType: 'line',
        labels: ['1995–2004', '2005–2014', '2015–2024'],
        datasets: [
          {
            label: 'One-word titles',
            data: [18, 22.6, 28.2],
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.72)',
          },
          {
            label: 'Titles containing love',
            data: [5.3, 4.7, 3],
            borderColor: '#f472b6',
            backgroundColor: 'rgba(244, 114, 182, 0.72)',
          },
        ],
        xAxisTitle: 'Billboard year-end era',
        yAxisTitle: 'Share of titles',
        yMax: 30,
        valueSuffix: '%',
        decimals: 1,
        showLegend: true,
        sourceLabel: 'Billboard Year-End Hot 100 lists',
        sourceUrl: 'https://example.com/billboard',
        accessibilitySummary: 'One-word titles rose while love-title share fell.',
      },
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const canvas = element.querySelector<HTMLCanvasElement>('[data-testid="blog-chart-canvas"]');
    const source = element.querySelector<HTMLAnchorElement>('a[href="https://example.com/billboard"]');
    const chart = canvas ? Chart.getChart(canvas) : undefined;

    expect(canvas).not.toBeNull();
    expect(chart?.data.labels).toEqual(['1995–2004', '2005–2014', '2015–2024']);
    expect(chart?.data.datasets.length).toBe(2);
    expect(chart?.data.datasets[0].data).toEqual([18, 22.6, 28.2]);
    expect(chart?.data.datasets[1].data).toEqual([5.3, 4.7, 3]);
    expect(canvas?.getAttribute('aria-label')).toContain('One-word titles rose');
    expect(element.querySelector('.sr-only table')).not.toBeNull();
    expect(element.textContent).toContain('One-word titles');
    expect(element.textContent).toContain('Titles containing love');
    expect(element.textContent).toContain('28.2%');
    expect(element.textContent).toContain('3.0%');
    expect(source?.textContent).toContain('Billboard Year-End Hot 100 lists');
  });

  it('converts legacy chart points into one Chart.js dataset without manufacturing values', () => {
    fixture.componentRef.setInput('block', {
      id: 'legacy-chart',
      type: 'chart',
      data: {
        title: 'Power by Trim',
        chartType: 'bar',
        unit: 'hp',
        chartPoints: [
          {label: 'EcoBoost', value: 315},
          {label: 'GT', value: 480, note: 'Manual coupe'},
        ],
      },
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const canvas = element.querySelector<HTMLCanvasElement>('[data-testid="blog-chart-canvas"]');
    const chart = canvas ? Chart.getChart(canvas) : undefined;

    expect(chart?.data.labels).toEqual(['EcoBoost', 'GT']);
    expect(chart?.data.datasets.length).toBe(1);
    expect(chart?.data.datasets[0].data).toEqual([315, 480]);
    expect(element.textContent).toContain('315 hp');
    expect(element.textContent).toContain('Manual coupe');
  });
});
