import {
  CHART_IMPORT_EXAMPLE_CSV,
  CHART_IMPORT_EXAMPLE_JSON,
  parseChartImport,
  parseStatsImport,
  STATS_IMPORT_EXAMPLE_CSV,
  STATS_IMPORT_EXAMPLE_JSON,
} from './tabular-block-import.util';

describe('tabular-block-import.util', () => {
  it('imports headered stats CSV rows with quoted values', () => {
    const result = parseStatsImport([
      'label,value,caption',
      'Horsepower,480 hp,5.0L V8',
      '"Base Price","$43,090",MSRP',
    ].join('\n'));

    expect(result.items).toEqual([
      {label: 'Horsepower', value: '480 hp', caption: '5.0L V8'},
      {label: 'Base Price', value: '$43,090', caption: 'MSRP'},
    ]);
  });

  it('imports pasted chart CSV rows without headers', () => {
    const result = parseChartImport([
      'EcoBoost,315,Turbo four',
      'GT,480 hp,Manual coupe',
    ].join('\n'));

    expect(result.items).toEqual([
      {label: 'EcoBoost', value: 315, note: 'Turbo four'},
      {label: 'GT', value: 480, note: 'Manual coupe'},
    ]);
  });

  it('imports chart JSON from common point keys and row arrays', () => {
    const result = parseChartImport(JSON.stringify({
      points: [
        {name: 'EcoBoost', y: '315', notes: 'Turbo four'},
        ['GT', '480', 'Manual coupe'],
      ],
    }));

    expect(result.items).toEqual([
      {label: 'EcoBoost', value: 315, note: 'Turbo four'},
      {label: 'GT', value: 480, note: 'Manual coupe'},
    ]);
  });

  it('imports Chart.js labels and datasets as grouped chart points', () => {
    const result = parseChartImport(JSON.stringify({
      data: {
        labels: ['1995–2004', '2015–2024'],
        datasets: [
          {label: 'One-word titles', data: [18, 28.2]},
          {label: 'Titles using love', data: [5.3, 3]},
        ],
      },
    }));

    expect(result.items).toEqual([
      {label: '1995–2004', value: 18, series: 'One-word titles'},
      {label: '1995–2004', value: 5.3, series: 'Titles using love'},
      {label: '2015–2024', value: 28.2, series: 'One-word titles'},
      {label: '2015–2024', value: 3, series: 'Titles using love'},
    ]);
  });

  it('imports stats JSON from nested data arrays', () => {
    const result = parseStatsImport(JSON.stringify({
      data: {
        stats: [
          {metric: 'Torque', figure: '415 lb-ft', notes: 'Peak torque'},
        ],
      },
    }));

    expect(result.items).toEqual([
      {label: 'Torque', value: '415 lb-ft', caption: 'Peak torque'},
    ]);
  });

  it('keeps the downloadable stats examples importable', () => {
    expect(parseStatsImport(STATS_IMPORT_EXAMPLE_CSV).items.length).toBe(3);
    expect(parseStatsImport(STATS_IMPORT_EXAMPLE_JSON).items.length).toBe(3);
  });

  it('keeps the downloadable chart examples importable', () => {
    expect(parseChartImport(CHART_IMPORT_EXAMPLE_CSV).items.length).toBe(3);
    expect(parseChartImport(CHART_IMPORT_EXAMPLE_JSON).items.length).toBe(3);
  });
});
