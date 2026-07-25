import {ChangeDetectionStrategy, Component, Input, OnChanges} from '@angular/core';
import {
  Chart,
  ChartData,
  ChartOptions,
  registerables,
} from 'chart.js';
import {BaseChartDirective} from 'ng2-charts';

import {
  BlogBlockData,
  BlogChartDataset,
  BlogChartType,
  BlogContentBlock,
} from '../../models/blog-post.model';
import {BlogRichTextComponent} from '../rich-text/blog-rich-text.component';

Chart.register(...registerables);

interface RenderableBlogChartTableRow {
  label: string;
  values: readonly string[];
}

interface RenderableBlogChart {
  type: BlogChartType;
  title: string;
  data: ChartData<BlogChartType, (number | null)[], string>;
  options: ChartOptions<BlogChartType>;
  datasetLabels: readonly string[];
  tableRows: readonly RenderableBlogChartTableRow[];
  ariaLabel: string;
  accessibilitySummary: string;
  sourceLabel: string;
  sourceUrl: string | null;
}

@Component({
  selector: 'app-blog-chart',
  imports: [BaseChartDirective, BlogRichTextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chart; as renderedChart) {
      <section
        class="space-y-4"
        data-testid="blog-chart"
        [attr.aria-label]="renderedChart.ariaLabel"
      >
        @if (renderedChart.title) {
          <h3 class="text-lg font-semibold text-slate-950 dark:text-zinc-50">{{ renderedChart.title }}</h3>
        }
        <div
          class="overflow-x-auto rounded border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5 dark:border-zinc-800 dark:bg-zinc-950/60 dark:shadow-none">
          <div class="relative h-72 min-w-[540px] sm:h-80">
            <canvas
              baseChart
              data-testid="blog-chart-canvas"
              role="img"
              [attr.aria-label]="renderedChart.ariaLabel"
              [type]="renderedChart.type"
              [data]="renderedChart.data"
              [options]="renderedChart.options"
            ></canvas>
          </div>
          <table class="sr-only">
            <caption>{{ renderedChart.accessibilitySummary }}</caption>
            <thead>
            <tr>
              <th scope="col">Category</th>
              @for (datasetLabel of renderedChart.datasetLabels; track $index) {
                <th scope="col">{{ datasetLabel }}</th>
              }
            </tr>
            </thead>
            <tbody>
              @for (tableRow of renderedChart.tableRows; track $index) {
                <tr>
                  <th scope="row">{{ tableRow.label }}</th>
                  @for (value of tableRow.values; track $index) {
                    <td>{{ value }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (renderedChart.accessibilitySummary) {
          <p class="text-sm leading-6 text-slate-600 dark:text-zinc-400">{{ renderedChart.accessibilitySummary }}</p>
        }
        @if (renderedChart.sourceLabel) {
          <p class="text-xs leading-5 text-slate-500 dark:text-zinc-500">
            Source:
            @if (renderedChart.sourceUrl) {
              <a
                [href]="renderedChart.sourceUrl"
                target="_blank"
                rel="noreferrer"
                class="underline decoration-slate-400 underline-offset-2 hover:text-cyan-700 dark:hover:text-cyan-300"
              >{{ renderedChart.sourceLabel }}</a>
            } @else {
              {{ renderedChart.sourceLabel }}
            }
          </p>
        }
        @if (block.data.caption) {
          <p class="text-sm leading-6 text-slate-500 dark:text-zinc-500">
            <app-blog-rich-text [html]="block.data.caption"></app-blog-rich-text>
          </p>
        }
      </section>
    }
  `,
})
export class BlogChartComponent implements OnChanges {
  @Input({required: true}) block!: BlogContentBlock;

  protected chart: RenderableBlogChart | null = null;

  ngOnChanges(): void {
    this.chart = this.createChart(this.block);
  }

  private createChart(block: BlogContentBlock): RenderableBlogChart | null {
    if (block.type !== 'chart') {
      return null;
    }

    const type = block.data.chartType ?? 'bar';
    const legacyPoints = (block.data.chartPoints ?? [])
      .filter(point => Number.isFinite(point.value));
    const sourceDatasets = this.normalizeChartDatasets(block.data.datasets);
    const datasets = sourceDatasets.length > 0
      ? sourceDatasets
      : legacyPoints.length > 0
        ? [{
          label: block.data.title?.trim() || 'Values',
          data: legacyPoints.map(point => point.value),
        }]
        : [];

    if (datasets.length === 0) {
      return null;
    }

    const longestDataset = Math.max(...datasets.map(dataset => dataset.data.length));
    const labels = block.data.labels?.length
      ? block.data.labels.map((label, index) => label.trim() || `Label ${index + 1}`)
      : legacyPoints.length > 0
        ? legacyPoints.map((point, index) => point.label.trim() || `Point ${index + 1}`)
        : Array.from({length: longestDataset}, (_, index) => `Label ${index + 1}`);
    const normalizedDatasets = datasets.map(dataset => ({
      ...dataset,
      data: labels.map((_, index) => dataset.data[index] ?? null),
    }));
    const title = block.data.title?.trim() ?? '';
    const accessibilitySummary = block.data.accessibilitySummary?.trim()
      || this.createChartSummary(labels, normalizedDatasets, block.data, legacyPoints);

    return {
      type,
      title,
      data: this.createChartData(type, labels, normalizedDatasets),
      options: this.createChartOptions(block.data, normalizedDatasets.length),
      datasetLabels: normalizedDatasets.map(dataset => dataset.label),
      tableRows: labels.map((label, index) => ({
        label,
        values: normalizedDatasets.map(dataset => {
          const value = dataset.data[index];
          return value === null ? 'No data' : this.formatChartValue(value, block.data);
        }),
      })),
      ariaLabel: `${title || (type === 'line' ? 'Line chart' : 'Bar chart')}. ${accessibilitySummary}`,
      accessibilitySummary,
      sourceLabel: block.data.sourceLabel?.trim() ?? '',
      sourceUrl: this.normalizeChartSourceUrl(block.data.sourceUrl),
    };
  }

  private normalizeChartDatasets(
    datasets: readonly BlogChartDataset[] | undefined
  ): readonly BlogChartDataset[] {
    return (datasets ?? []).flatMap((dataset, index) => {
      const values = Array.isArray(dataset.data)
        ? dataset.data.map(value => typeof value === 'number' && Number.isFinite(value) ? value : null)
        : [];

      if (!values.some(value => value !== null)) {
        return [];
      }

      return [{
        label: dataset.label?.trim() || `Series ${index + 1}`,
        data: values,
        ...(dataset.borderColor?.trim() ? {borderColor: dataset.borderColor.trim()} : {}),
        ...(dataset.backgroundColor?.trim() ? {backgroundColor: dataset.backgroundColor.trim()} : {}),
      }];
    });
  }

  private createChartData(
    type: BlogChartType,
    labels: readonly string[],
    datasets: readonly BlogChartDataset[]
  ): ChartData<BlogChartType, (number | null)[], string> {
    const colors = [
      {border: '#0891b2', background: 'rgba(34, 211, 238, 0.68)'},
      {border: '#db2777', background: 'rgba(244, 114, 182, 0.68)'},
      {border: '#7c3aed', background: 'rgba(167, 139, 250, 0.68)'},
      {border: '#ca8a04', background: 'rgba(250, 204, 21, 0.68)'},
      {border: '#059669', background: 'rgba(52, 211, 153, 0.68)'},
    ];

    return {
      labels: [...labels],
      datasets: datasets.map((dataset, index) => {
        const color = colors[index % colors.length];

        return {
          label: dataset.label,
          data: [...dataset.data],
          borderColor: dataset.borderColor || color.border,
          backgroundColor: dataset.backgroundColor || color.background,
          borderWidth: 2,
          borderRadius: type === 'bar' ? 5 : undefined,
          borderSkipped: false,
          fill: false,
          pointRadius: type === 'line' ? 4 : undefined,
          pointHoverRadius: type === 'line' ? 6 : undefined,
          tension: type === 'line' ? 0.28 : undefined,
          spanGaps: true,
        };
      }),
    };
  }

  private createChartOptions(
    data: BlogBlockData,
    datasetCount: number
  ): ChartOptions<BlogChartType> {
    const xAxisTitle = data.xAxisTitle?.trim() ?? '';
    const yAxisTitle = data.yAxisTitle?.trim() ?? '';
    const yMax = typeof data.yMax === 'number' && Number.isFinite(data.yMax) ? data.yMax : undefined;

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: data.showLegend ?? datasetCount > 1,
          labels: {
            color: '#94a3b8',
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: context => {
              const value = typeof context.parsed.y === 'number' ? context.parsed.y : 0;
              const datasetLabel = context.dataset.label ? `${context.dataset.label}: ` : '';
              return `${datasetLabel}${this.formatChartValue(value, data)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#94a3b8',
            maxRotation: 0,
          },
          title: {
            display: xAxisTitle.length > 0,
            text: xAxisTitle,
            color: '#94a3b8',
          },
        },
        y: {
          beginAtZero: true,
          ...(yMax !== undefined ? {max: yMax} : {}),
          grid: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
          ticks: {
            color: '#94a3b8',
            callback: value => this.formatChartValue(Number(value), data),
          },
          title: {
            display: yAxisTitle.length > 0,
            text: yAxisTitle,
            color: '#94a3b8',
          },
        },
      },
    };
  }

  private formatChartValue(value: number, data: BlogBlockData): string {
    const requestedDecimals = typeof data.decimals === 'number' && Number.isFinite(data.decimals)
      ? Math.max(0, Math.min(6, Math.round(data.decimals)))
      : Math.abs(value) >= 100 ? 0 : 2;
    const formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: requestedDecimals,
      maximumFractionDigits: requestedDecimals,
    }).format(value);
    const valueSuffix = data.valueSuffix ?? '';
    const normalizedUnit = data.unit?.trim();

    if (valueSuffix) {
      return `${formattedValue}${valueSuffix}`;
    }

    return normalizedUnit ? `${formattedValue} ${normalizedUnit}` : formattedValue;
  }

  private createChartSummary(
    labels: readonly string[],
    datasets: readonly BlogChartDataset[],
    data: BlogBlockData,
    legacyPoints: readonly { label: string; value: number; note?: string }[]
  ): string {
    if (legacyPoints.length > 0 && !data.datasets?.length) {
      return legacyPoints.map(point => {
        const note = point.note?.trim() ? ` (${point.note.trim()})` : '';
        return `${point.label}: ${this.formatChartValue(point.value, data)}${note}`;
      }).join(', ');
    }

    return datasets.map(dataset => {
      const values = labels.map((label, index) => {
        const value = dataset.data[index];
        return `${label}: ${value === null ? 'no data' : this.formatChartValue(value, data)}`;
      }).join(', ');

      return `${dataset.label}: ${values}`;
    }).join('. ');
  }

  private normalizeChartSourceUrl(value: string | undefined): string | null {
    try {
      const url = new URL(value ?? '');
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
      return null;
    }
  }
}
