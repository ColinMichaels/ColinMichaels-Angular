import {Component, NgIterable, OnDestroy, OnInit} from '@angular/core';
import {NgClass, NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from '@angular/common';
import {ApplicationManagerService} from '../../services/application-manager.service';
import {UserService} from '../../services/user.service';
import {CLIService} from '../../services/cli.service';
import {BaseChartDirective} from 'ng2-charts';
import {
  Chart,
  LineElement,
  PointElement,
  Filler,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend, BarElement, BarController, LineController
} from 'chart.js';

// Register components explicitly
Chart.register(
  LineElement,
  BarController,
  LineController,
  Filler,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

interface Process {
  name: string;
  cpu: number;
  cpuTime: string;
  threads: number;
  idleWakeUps: number;
  gpu: number;
  gpuTime: string;
  pid: number;
  user: string;
}

@Component({
  selector: 'app-activity-monitor',
  imports: [
    NgClass,
    NgForOf,
    BaseChartDirective,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault
  ],
  templateUrl: './activity-monitor.component.html',
  styles: `
  .activity-monitor-stats-row{
    @apply flex w-full justify-between border-b border-white/70 border-spacing-y-2;
  }
  `
})
export class ActivityMonitorComponent implements OnInit, OnDestroy {
  tabs = ['CPU', 'MEMORY', 'ENERGY', 'DISK', 'NETWORK', 'MAGIC'];
  activeTab = 'CPU';
  intervalId: any;

  processes = [
    { name: 'Finder', cpu: 3.2, cpuTime: '18:23:43', threads: 37, idleWakeUps: 206, gpu: 2.6, gpuTime: '4:25:41', pid: 390, user: 'colin' },
    { name: 'Terminal', cpu: 1.8, cpuTime: '1:08:11', threads: 95, idleWakeUps: 140, gpu: 0, gpuTime: '0:00:00', pid: 74945, user: 'colin' },
    { name: 'Spellweaver.exe', cpu: 8.9, cpuTime: '3:14:21', threads: 6, idleWakeUps: 5, gpu: 0, gpuTime: '0:00:00', pid: 77906, user: 'colin' },
  ];

  cpuChartLabels: string[] = ['CPU Load (%)'];
  cpuChartData = [
    {
      data: [] as number[],
      label: 'CPU Load (%)',
      fill: true,
      tension: 0.4,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      pointRadius: 0,
      type:'bar'
    }
  ];

  gpuChartData = [
    {
      data: [] as number[],
      label: 'GPU Load (%)',
      fill: true,
      tension: 0.4,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(246,59,215,0.2)',
      pointRadius: 0,
      type:'line'
    }
  ];

  chartOptions = {
    responsive: true,
    animation: true,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#ccc' },
        grid: { color: '#444' }
      },
      x: {
        ticks: { display: false },
        grid: { display: false }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  chartColors = [{ backgroundColor: 'rgba(59,130,246,0.2)' }];

  systemLoad = {
    system: 6.94,
    user: 6.74,
    idle: 86.31,
    threads: 4048,
    processes: 670
  };

  sortColumn: keyof Process = 'cpu';
  sortDirection: 'asc' | 'desc' = 'desc';

  get sortedProcesses(): Process[] {
    return [...this.processes].sort((a, b) => {
      const valueA = a[this.sortColumn];
      const valueB = b[this.sortColumn];
      const isString = typeof valueA === 'string';

      if (isString) {
        return this.sortDirection === 'asc'
          ? String(valueA).localeCompare(String(valueB))
          : String(valueB).localeCompare(String(valueA));
      }

      return this.sortDirection === 'asc'
        ? Number(valueA) - Number(valueB)
        : Number(valueB) - Number(valueA);
    });
  }

  constructor(
    private windowManager: ApplicationManagerService,
    private userService: UserService,
    private cliService: CLIService
  ) {
  }

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.updateMockData();
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  /** window manager */

  get runningApps() {
    return this.windowManager.openApplications;
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  updateMockData() {
    const rand = () => +(Math.random() * 10).toFixed(2);
    const system = rand();
    const user = rand();
    const idle = +(100 - system - user).toFixed(2);

    this.systemLoad = {
      system,
      user,
      idle,
      threads: 4000 + Math.floor(Math.random() * 200),
      processes: 650 + Math.floor(Math.random() * 30)
    };

    // Append new CPU data point
    const total = +(system + user).toFixed(2);
    const timeLabel = new Date().toLocaleTimeString();

    if (this.cpuChartData[0].data.length >= 30) {
      this.cpuChartData[0].data.shift();
      this.cpuChartLabels.shift();
    }

    if (this.gpuChartData[0].data.length >= 30) {
      this.gpuChartData[0].data.shift();
      this.cpuChartLabels.shift();
    }

    this.cpuChartData[0].data.push(total);
    this.cpuChartLabels.push(timeLabel);
    this.gpuChartData[0].data.push(total);

    this.cpuChartData = [...this.cpuChartData]; // Trigger chart update
    this.gpuChartData = [...this.gpuChartData];
  }

  sortBy(column: keyof Process): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
  }
}
