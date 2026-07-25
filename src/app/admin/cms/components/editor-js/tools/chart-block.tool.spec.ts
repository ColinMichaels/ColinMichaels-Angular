import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {ChartBlockData, ChartBlockTool} from './chart-block.tool';

function createTool(data: ChartBlockData = {}, readOnly = false): ChartBlockTool {
  return new ChartBlockTool({
    data,
    readOnly,
  } as BlockToolConstructorOptions<ChartBlockData>);
}

describe('ChartBlockTool', () => {
  it('preserves optional series metadata when editing chart points', () => {
    const tool = createTool({
      chartType: 'line',
      chartPoints: [
        {label: '1995–2004', value: 18, series: 'One-word titles'},
        {label: '1995–2004', value: 5.3, series: 'Titles using love'},
      ],
    });
    const element = tool.render();

    expect(element.querySelectorAll('[data-chart-point-row]').length).toBe(2);
    expect(element.querySelector<HTMLInputElement>('[data-chart-point-series]')?.value)
      .toBe('One-word titles');
    expect(tool.save(element).chartPoints).toEqual([
      {label: '1995–2004', value: 18, note: '', series: 'One-word titles'},
      {label: '1995–2004', value: 5.3, note: '', series: 'Titles using love'},
    ]);
  });

  it('does not convert a blank chart row into Point 1 = 0', () => {
    const tool = createTool();
    const element = tool.render();
    const saved = tool.save(element);

    expect(saved.chartPoints).toEqual([]);
    expect(tool.validate(saved)).toBeFalse();
  });
});
