import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'app-site-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="site-logo-svg"
      xmlns="http://www.w3.org/2000/svg"
      width="760"
      height="180"
      viewBox="0 0 760 180"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="siteLogoWaveGradient" x1="0" y1="0" x2="170" y2="0" gradientUnits="userSpaceOnUse">
          <stop class="site-logo-wave-start" offset="0"/>
          <stop class="site-logo-wave-mid" offset="0.35"/>
          <stop class="site-logo-wave-end" offset="1"/>
        </linearGradient>

        <filter id="siteLogoSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow class="site-logo-shadow" dx="0" dy="4" stdDeviation="4"/>
        </filter>
      </defs>

      <g class="site-logo-mark" transform="translate(34 34)" filter="url(#siteLogoSoftShadow)">
        <path
          class="site-logo-wave"
          d="M0 91
             C22 91, 37 88, 51 76
             C64 65, 76 45, 91 45
             C107 45, 116 66, 130 69
             C143 72, 151 55, 164 54
             C181 53, 195 72, 214 78
             C232 84, 248 88, 270 88"
          fill="none"
          stroke="url(#siteLogoWaveGradient)"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <path
          class="site-logo-mountain"
          d="M78 80
             L118 30
             L147 62
             L172 39
             L220 84"
          fill="none"
          stroke-width="7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <path
          class="site-logo-ridges"
          d="M99 58 L116 74 L129 48
             M145 64 L156 74 L170 52
             M190 69 L202 82"
          fill="none"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <path
          class="site-logo-base"
          d="M52 91 C96 86, 129 83, 174 88 C210 92, 238 91, 270 88"
          fill="none"
          stroke-width="3"
          stroke-linecap="round"
        />
      </g>

      <g transform="translate(330 58)">
        <text class="site-logo-wordmark" x="0" y="48">COLIN MICHAELS</text>
        <text class="site-logo-tagline" x="2" y="84">EXPLORE. LEARN. CREATE.</text>
      </g>
    </svg>
  `,
  styles: [`
    :host {
      --logo-heading: var(--site-heading);
      --logo-accent: var(--site-accent);
      --logo-accent-strong: var(--site-accent-strong);
      --logo-muted: var(--site-muted);
      --logo-bg: var(--site-bg);
      --logo-wave-start-opacity: 0.18;
      --logo-base-opacity: 0.32;

      display: block;
      width: 100%;
      color: var(--logo-heading);
    }

    :host(:hover),
    :host(:focus-within) {
      --logo-heading: var(--site-accent-strong);
      --logo-accent: var(--site-heading);
      --logo-muted: var(--site-accent);
      --logo-wave-start-opacity: 0.42;
      --logo-base-opacity: 0.48;
    }

    .site-logo-svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
      text-rendering: optimizeLegibility;
    }

    .site-logo-wave-start,
    .site-logo-wave-mid {
      stop-color: var(--logo-accent);
    }

    .site-logo-wave-start {
      stop-opacity: var(--logo-wave-start-opacity);
    }

    .site-logo-wave-end {
      stop-color: var(--logo-muted);
    }

    .site-logo-shadow {
      flood-color: var(--logo-bg);
      flood-opacity: 0.25;
    }

    .site-logo-mountain {
      stroke: var(--logo-heading);
    }

    .site-logo-ridges {
      stroke: var(--logo-muted);
    }

    .site-logo-base {
      stroke: var(--logo-bg);
      stroke-opacity: var(--logo-base-opacity);
    }

    .site-logo-wordmark,
    .site-logo-tagline {
      transition: fill 180ms ease;
    }

    .site-logo-wordmark {
      fill: var(--logo-heading);
      font-family: var(--font-heading);
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 7px;
    }

    .site-logo-tagline {
      fill: var(--logo-accent);
      font-family: var(--font-accent);
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 6px;
    }

    @media (prefers-reduced-motion: no-preference) {
      .site-logo-wave-start,
      .site-logo-wave-mid,
      .site-logo-wave-end,
      .site-logo-mountain,
      .site-logo-ridges,
      .site-logo-base {
        transition: stop-color 180ms ease, stop-opacity 180ms ease, stroke 180ms ease, stroke-opacity 180ms ease;
      }
    }
  `],
})
export class SiteLogoComponent {
}
