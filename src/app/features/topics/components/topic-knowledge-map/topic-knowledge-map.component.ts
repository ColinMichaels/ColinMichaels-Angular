import {NgStyle, NgTemplateOutlet} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  inject,
  signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';

import {TopicHub} from '../../topic-hubs.data';

export interface TopicKnowledgeMapItem extends TopicHub {
  count: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

@Component({
  selector: 'app-topic-knowledge-map',
  imports: [
    NgStyle,
    NgTemplateOutlet,
    RouterLink,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="topic-guides" class="topic-map-section" aria-labelledby="topic-guides-heading">
      <div class="topic-map-inner">
        <header class="topic-map-header">
          <h2 id="topic-guides-heading" class="topic-map-title">Topics</h2>
        </header>

        <div
          class="topic-map-field"
          aria-label="Floating topic guide field"
        >
          <svg class="topic-map-orbits" viewBox="0 0 1000 540" aria-hidden="true" focusable="false">
            <path class="topic-map-orbit topic-map-orbit-one" d="M90 275C205 115 430 80 635 160C785 220 875 330 930 458"></path>
            <path class="topic-map-orbit topic-map-orbit-two" d="M80 338C228 220 388 204 520 260C642 312 706 405 824 402"></path>
            <path class="topic-map-orbit topic-map-orbit-three" d="M132 440C275 520 548 498 685 374C800 270 804 154 926 144"></path>
            <circle class="topic-map-orbit-dot topic-map-orbit-dot-one" cx="197" cy="188" r="6"></circle>
            <circle class="topic-map-orbit-dot topic-map-orbit-dot-two" cx="340" cy="318" r="5"></circle>
            <circle class="topic-map-orbit-dot topic-map-orbit-dot-three" cx="835" cy="402" r="7"></circle>
          </svg>

          <span class="topic-map-ghost topic-map-ghost-one" aria-hidden="true"></span>
          <span class="topic-map-ghost topic-map-ghost-two" aria-hidden="true"></span>
          <span class="topic-map-ghost topic-map-ghost-three" aria-hidden="true"></span>
          <span class="topic-map-ghost topic-map-ghost-four" aria-hidden="true"></span>

          @for (topic of topics; track topic.slug) {
            <a
              [routerLink]="['/', topicsPath, topic.slug]"
              class="topic-map-node"
              [class.topic-map-node-dimmed]="activeSlug() && activeSlug() !== topic.slug"
              [ngStyle]="topicStyle(topic)"
              [attr.data-topic-depth]="topic.theme.mapPlacement.depth"
              [attr.aria-label]="topicAriaLabel(topic)"
              (mouseenter)="setActive(topic.slug)"
              (mouseleave)="clearActive()"
              (focus)="setActive(topic.slug)"
              (blur)="clearActive()"
            >
              <span class="topic-map-floater">
                <span class="topic-map-orb" aria-hidden="true">
                  <span class="topic-map-orb-ring"></span>
                  <span class="topic-map-orb-core">
                    <ng-container [ngTemplateOutlet]="topicIcon" [ngTemplateOutletContext]="{$implicit: topic}"></ng-container>
                  </span>
                </span>
                <span class="topic-map-node-copy">
                  <span class="topic-map-node-label">{{ topic.theme.shortLabel }}</span>
                  <span class="topic-map-node-title">{{ topic.title }}</span>
                  <span class="topic-map-node-count">{{ topic.count }} post{{ topic.count === 1 ? '' : 's' }}</span>
                </span>
              </span>
            </a>
          }
        </div>

        <div class="topic-map-mobile" aria-label="Topic guide links">
          @for (topic of topics; track topic.slug) {
            <a
              [routerLink]="['/', topicsPath, topic.slug]"
              class="topic-map-mobile-card"
              [ngStyle]="topicStyle(topic)"
              [attr.aria-label]="topicAriaLabel(topic)"
            >
              <span class="topic-map-mobile-icon" aria-hidden="true">
                <ng-container [ngTemplateOutlet]="topicIcon" [ngTemplateOutletContext]="{$implicit: topic}"></ng-container>
              </span>
              <span class="topic-map-mobile-content">
                <span class="topic-map-mobile-label">{{ topic.theme.shortLabel }}</span>
                <span class="topic-map-mobile-title">{{ topic.title }}</span>
                <span class="topic-map-mobile-meta">
                  {{ topic.count }} post{{ topic.count === 1 ? '' : 's' }}
                  <span aria-hidden="true">/</span>
                  Explore <span aria-hidden="true">-&gt;</span>
                </span>
              </span>
            </a>
          }
        </div>
      </div>
    </section>

    <ng-template #topicIcon let-topic>
      @switch (topic.theme.icon) {
        @case ('spark') {
          <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
            <path d="M24 5l5.2 13.8L43 24l-13.8 5.2L24 43l-5.2-13.8L5 24l13.8-5.2L24 5z"></path>
          </svg>
        }
        @case ('heart') {
          <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
            <path d="M7 24h7l4-8 7 17 5-9h11"></path>
            <path d="M24 40C14 32 8 26 8 18c0-5 4-9 9-9 3 0 5.6 1.4 7 3.7C25.4 10.4 28 9 31 9c5 0 9 4 9 9 0 8-6 14-16 22z"></path>
          </svg>
        }
        @case ('cube') {
          <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
            <path d="M24 5l17 9.5v19L24 43 7 33.5v-19L24 5z"></path>
            <path d="M7 14.5L24 24l17-9.5"></path>
            <path d="M24 24v19"></path>
          </svg>
        }
        @case ('flask') {
          <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
            <path d="M18 6h12"></path>
            <path d="M21 6v12L10 38c-1.5 2.7.4 6 3.5 6h21c3.1 0 5-3.3 3.5-6L27 18V6"></path>
            <path d="M16 34h16"></path>
            <path d="M20 28h8"></path>
          </svg>
        }
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
    }

    .topic-map-section {
      --topic-bg-main-x: 50%;
      --topic-bg-main-y: 46%;
      --topic-bg-left-x: 12%;
      --topic-bg-left-y: 36%;
      --topic-bg-right-x: 76%;
      --topic-bg-right-y: 62%;
      --topic-grid-x: 0px;
      --topic-grid-y: 0px;
      --topic-orbit-x: 0px;
      --topic-orbit-y: 0px;
      --topic-ghost-x: 0px;
      --topic-ghost-y: 0px;
      --topic-field-tilt-x: 0deg;
      --topic-field-tilt-y: 0deg;
      --topic-field-y: 0px;
      position: relative;
      overflow: hidden;
      border-block: 1px solid rgba(148, 163, 184, 0.18);
      background:
        radial-gradient(circle at var(--topic-bg-main-x) var(--topic-bg-main-y), rgba(14, 165, 233, 0.12), transparent 32rem),
        radial-gradient(circle at var(--topic-bg-left-x) var(--topic-bg-left-y), rgba(45, 212, 191, 0.09), transparent 22rem),
        radial-gradient(circle at var(--topic-bg-right-x) var(--topic-bg-right-y), rgba(96, 165, 250, 0.11), transparent 24rem),
        linear-gradient(180deg, #061017 0%, #07131c 48%, #05090f 100%);
      color: #e5edf4;
      padding-block: 4rem 3.25rem;
    }

    .topic-map-section::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
        linear-gradient(rgba(148, 163, 184, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.035) 1px, transparent 1px);
      background-size: 96px 96px, 96px 96px, 24px 24px, 24px 24px;
      mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
      opacity: 0.88;
      transform: translate3d(var(--topic-grid-x), var(--topic-grid-y), 0);
      transition: transform 220ms ease-out;
      will-change: transform;
    }

    .topic-map-section::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(120deg, transparent 0 44%, rgba(255, 255, 255, 0.032) 45%, transparent 46%),
        radial-gradient(circle at var(--topic-bg-main-x) var(--topic-bg-main-y), transparent 0 48%, rgba(0, 0, 0, 0.5) 100%);
      opacity: 0.7;
    }

    .topic-map-inner {
      position: relative;
      z-index: 1;
      margin-inline: auto;
      max-width: 80rem;
      padding-inline: 1rem;
    }

    .topic-map-header {
      display: flex;
      align-items: center;
    }

    .topic-map-title {
      color: #f8fafc;
      font-family: var(--font-heading);
      font-size: clamp(2.2rem, 3vw, 3.1rem);
      font-weight: 600;
      letter-spacing: 0;
      line-height: 1;
    }

    .topic-map-mobile-meta {
      color: #67e8f9;
      font-family: var(--font-accent);
      font-weight: 600;
    }

    .topic-map-field {
      --topic-pan-x: 0px;
      --topic-pan-y: 0px;
      position: relative;
      display: none;
      min-height: 38rem;
      margin-top: 1.25rem;
      perspective: 900px;
      transform-style: preserve-3d;
      transform:
        translate3d(0, var(--topic-field-y), 0)
        rotateX(var(--topic-field-tilt-y))
        rotateY(var(--topic-field-tilt-x));
      transition: transform 220ms ease-out;
      will-change: transform;
    }

    .topic-map-orbits {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      transform: translate3d(var(--topic-orbit-x), var(--topic-orbit-y), -64px);
      transition: transform 220ms ease-out;
      will-change: transform;
    }

    .topic-map-orbit {
      fill: none;
      stroke: rgba(125, 211, 252, 0.2);
      stroke-dasharray: 9 13;
      stroke-linecap: round;
      stroke-width: 2;
      animation: topic-map-line-drift 16s linear infinite;
    }

    .topic-map-orbit-two {
      stroke: rgba(45, 212, 191, 0.2);
      animation-duration: 18s;
      animation-direction: reverse;
    }

    .topic-map-orbit-three {
      stroke: rgba(167, 139, 250, 0.18);
      animation-duration: 22s;
    }

    .topic-map-orbit-dot {
      fill: rgba(125, 211, 252, 0.28);
      filter: drop-shadow(0 0 12px rgba(34, 211, 238, 0.36));
    }

    .topic-map-ghost {
      position: absolute;
      display: grid;
      width: 3rem;
      height: 3rem;
      place-items: center;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 999px;
      opacity: 0.35;
      transform: translate(-50%, -50%) translate3d(var(--topic-ghost-x), var(--topic-ghost-y), -84px);
      transition: transform 240ms ease-out, opacity 180ms ease;
      will-change: transform;
    }

    .topic-map-ghost::before,
    .topic-map-ghost::after {
      content: '';
      position: absolute;
      border: 1px solid currentColor;
      opacity: 0.7;
    }

    .topic-map-ghost::before {
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 0.25rem;
      color: rgba(148, 163, 184, 0.5);
      transform: rotate(45deg);
    }

    .topic-map-ghost::after {
      width: 4.2rem;
      height: 4.2rem;
      border-color: rgba(148, 163, 184, 0.08);
      border-radius: 999px;
    }

    .topic-map-ghost-one {
      left: 10%;
      top: 27%;
    }

    .topic-map-ghost-two {
      left: 86%;
      top: 30%;
    }

    .topic-map-ghost-three {
      left: 33%;
      top: 62%;
    }

    .topic-map-ghost-four {
      left: 88%;
      top: 72%;
    }

    .topic-map-node {
      --topic-hover-y: 0px;
      --topic-hover-scale: 1;
      --topic-node-pan-x: 0px;
      --topic-node-pan-y: 0px;
      --topic-icon-pan-x: 0px;
      --topic-icon-pan-y: 0px;
      position: absolute;
      left: var(--topic-x);
      top: var(--topic-y);
      z-index: var(--topic-z);
      display: block;
      color: #dbeafe;
      opacity: var(--topic-opacity);
      text-decoration: none;
      transform:
        translate(-50%, -50%)
        translate3d(var(--topic-node-pan-x), var(--topic-node-pan-y), var(--topic-z-depth))
        translateY(var(--topic-hover-y))
        scale(var(--topic-scale))
        scale(var(--topic-hover-scale));
      transform-style: preserve-3d;
      transition: opacity 180ms ease, filter 180ms ease, transform 220ms ease;
    }

    .topic-map-node:hover,
    .topic-map-node:focus-visible {
      --topic-hover-y: -0.55rem;
      --topic-hover-scale: 1.035;
      color: #f8fafc;
      filter: drop-shadow(0 0 22px rgb(var(--topic-accent-rgb) / 0.36));
      opacity: 1;
    }

    .topic-map-node:focus-visible {
      border-radius: 0.65rem;
      outline: 2px solid var(--topic-accent-strong);
      outline-offset: 0.6rem;
    }

    .topic-map-node-dimmed {
      opacity: 0.32;
    }

    .topic-map-floater {
      display: flex;
      align-items: center;
      gap: 1rem;
      animation: topic-map-float 7.5s ease-in-out infinite;
      animation-delay: var(--topic-float-delay);
    }

    .topic-map-orb {
      position: relative;
      display: grid;
      width: 7.4rem;
      height: 7.4rem;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 999px;
    }

    .topic-map-orb-ring,
    .topic-map-orb-core {
      position: absolute;
      border-radius: 999px;
    }

    .topic-map-orb-ring {
      inset: 0;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.34);
      background:
        conic-gradient(from 35deg, transparent, rgb(var(--topic-accent-rgb) / 0.9), transparent 34%, transparent),
        radial-gradient(circle, rgb(var(--topic-accent-rgb) / 0.17), transparent 68%);
      animation: topic-map-orbit 16s linear infinite;
      box-shadow: 0 22px 48px rgb(var(--topic-accent-rgb) / 0.14);
    }

    .topic-map-orb-core {
      inset: 1.05rem;
      display: grid;
      place-items: center;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.78);
      background: rgba(3, 7, 18, 0.82);
      box-shadow: inset 0 0 24px rgb(var(--topic-accent-rgb) / 0.18), 0 0 24px rgb(var(--topic-accent-rgb) / 0.18);
    }

    .topic-map-orb-core svg {
      width: 2.7rem;
      height: 2.7rem;
      fill: none;
      stroke: var(--topic-accent);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.25;
      transform: translate3d(var(--topic-icon-pan-x), var(--topic-icon-pan-y), 0);
      transition: transform 180ms ease-out;
      will-change: transform;
    }

    .topic-map-node-copy {
      display: grid;
      gap: 0.28rem;
      min-width: 8rem;
    }

    .topic-map-node-label {
      color: var(--topic-accent);
      font-family: var(--font-heading);
      font-size: 1.65rem;
      font-weight: 600;
      line-height: 1.05;
    }

    .topic-map-node-title {
      max-width: 15rem;
      color: rgba(226, 232, 240, 0.78);
      font-size: 0.94rem;
      line-height: 1.35;
    }

    .topic-map-node-count {
      color: rgba(226, 232, 240, 0.86);
      font-family: var(--font-accent);
      font-size: 0.94rem;
      font-weight: 600;
    }

    .topic-map-mobile {
      display: grid;
      gap: 1rem;
      margin-top: 2rem;
    }

    .topic-map-mobile-card {
      position: relative;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.9rem;
      width: min(92%, 23rem);
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.4);
      border-radius: 0.6rem;
      background: linear-gradient(135deg, rgb(var(--topic-accent-rgb) / 0.12), rgba(15, 23, 42, 0.68) 44%, rgba(2, 6, 23, 0.8));
      padding: 1rem;
      text-decoration: none;
      box-shadow: 0 22px 42px rgb(var(--topic-accent-rgb) / 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      animation: topic-map-float 7s ease-in-out infinite;
      animation-delay: var(--topic-float-delay);
    }

    .topic-map-mobile-card:nth-child(even) {
      justify-self: end;
    }

    .topic-map-mobile-card:focus-visible {
      outline: 2px solid var(--topic-accent-strong);
      outline-offset: 0.25rem;
    }

    .topic-map-mobile-icon {
      display: grid;
      width: 2.75rem;
      height: 2.75rem;
      place-items: center;
      border: 1px solid rgb(var(--topic-accent-rgb) / 0.52);
      border-radius: 999px;
      color: var(--topic-accent);
      box-shadow: 0 0 22px rgb(var(--topic-accent-rgb) / 0.18);
    }

    .topic-map-mobile-icon svg {
      width: 1.55rem;
      height: 1.55rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.2;
    }

    .topic-map-mobile-content {
      display: grid;
      gap: 0.3rem;
      min-width: 0;
    }

    .topic-map-mobile-label {
      color: var(--topic-accent-strong);
      font-family: var(--font-heading);
      font-size: 1.15rem;
      font-weight: 600;
      line-height: 1.15;
    }

    .topic-map-mobile-title {
      color: rgba(226, 232, 240, 0.76);
      font-size: 0.9rem;
      line-height: 1.35;
    }

    .topic-map-mobile-meta {
      color: var(--topic-accent);
      font-size: 0.86rem;
    }

    :host-context(.light) .topic-map-section {
      border-block-color: rgba(15, 23, 42, 0.12);
      background:
        radial-gradient(circle at var(--topic-bg-main-x) var(--topic-bg-main-y), rgba(14, 165, 233, 0.13), transparent 31rem),
        radial-gradient(circle at var(--topic-bg-left-x) var(--topic-bg-left-y), rgba(20, 184, 166, 0.1), transparent 22rem),
        radial-gradient(circle at var(--topic-bg-right-x) var(--topic-bg-right-y), rgba(96, 165, 250, 0.12), transparent 24rem),
        linear-gradient(180deg, #f8fafc 0%, #eef7fb 50%, #f8fafc 100%);
      color: #0f172a;
    }

    :host-context(.light) .topic-map-section::before {
      background-image:
        linear-gradient(rgba(14, 116, 144, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(14, 116, 144, 0.1) 1px, transparent 1px),
        linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
      opacity: 0.88;
    }

    :host-context(.light) .topic-map-section::after {
      background:
        linear-gradient(120deg, transparent 0 44%, rgba(14, 116, 144, 0.045) 45%, transparent 46%),
        radial-gradient(circle at 50% 50%, transparent 0 56%, rgba(15, 23, 42, 0.09) 100%);
      opacity: 0.72;
    }

    :host-context(.light) .topic-map-title {
      color: #0f172a;
    }

    :host-context(.light) .topic-map-orbit {
      stroke: rgba(14, 116, 144, 0.18);
    }

    :host-context(.light) .topic-map-orbit-two {
      stroke: rgba(13, 148, 136, 0.18);
    }

    :host-context(.light) .topic-map-orbit-three {
      stroke: rgba(124, 58, 237, 0.16);
    }

    :host-context(.light) .topic-map-ghost {
      border-color: rgba(15, 23, 42, 0.09);
      opacity: 0.26;
    }

    :host-context(.light) .topic-map-ghost::before {
      color: rgba(15, 23, 42, 0.32);
    }

    :host-context(.light) .topic-map-ghost::after {
      border-color: rgba(15, 23, 42, 0.08);
    }

    :host-context(.light) .topic-map-node {
      color: #0f172a;
    }

    :host-context(.light) .topic-map-node:hover,
    :host-context(.light) .topic-map-node:focus-visible {
      color: #0f172a;
    }

    :host-context(.light) .topic-map-orb-core {
      background: rgba(248, 250, 252, 0.9);
      box-shadow: inset 0 0 24px rgb(var(--topic-accent-rgb) / 0.12), 0 14px 34px rgb(var(--topic-accent-rgb) / 0.14);
    }

    :host-context(.light) .topic-map-node-title,
    :host-context(.light) .topic-map-node-count,
    :host-context(.light) .topic-map-mobile-title {
      color: rgba(30, 41, 59, 0.7);
    }

    :host-context(.light) .topic-map-mobile-card {
      border-color: rgb(var(--topic-accent-rgb) / 0.34);
      background: linear-gradient(135deg, rgb(var(--topic-accent-rgb) / 0.12), rgba(255, 255, 255, 0.88) 42%, rgba(248, 250, 252, 0.96));
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.86);
    }

    :host-context(.light) .topic-map-mobile-icon {
      background: rgba(255, 255, 255, 0.72);
    }

    @media (min-width: 900px) {
      .topic-map-inner {
        padding-inline: 1.5rem;
      }

      .topic-map-field {
        display: block;
      }

      .topic-map-mobile {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .topic-map-section {
        padding-block: 3rem;
      }

      .topic-map-header {
        align-items: start;
      }

      .topic-map-title {
        font-size: 2.35rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .topic-map-orbit,
      .topic-map-orb-ring,
      .topic-map-floater,
      .topic-map-mobile-card {
        animation: none;
      }

      .topic-map-field,
      .topic-map-orbits,
      .topic-map-ghost,
      .topic-map-node,
      .topic-map-orb-core svg {
        transition: none;
      }
    }

    @keyframes topic-map-line-drift {
      to {
        stroke-dashoffset: -88;
      }
    }

    @keyframes topic-map-orbit {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes topic-map-float {
      0%,
      100% {
        transform: translateY(0);
      }

      50% {
        transform: translateY(-0.7rem);
      }
    }
  `],
})
export class TopicKnowledgeMapComponent implements AfterViewInit {
  @Input({required: true}) topics: readonly TopicKnowledgeMapItem[] = [];
  @Input() topicsPath = 'topics';

  private readonly hostElement = (inject(ElementRef) as ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  protected readonly activeSlug = signal<string | null>(null);
  private sectionElement: HTMLElement | null = null;
  private fieldElement: HTMLElement | null = null;
  private topicNodeElements: readonly HTMLElement[] = [];
  private pointerX = 0;
  private pointerY = 0;
  private scrollOffset = 0;
  private pointerInside = false;
  private animationFrame = 0;

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.sectionElement = this.hostElement.querySelector<HTMLElement>('.topic-map-section');
    this.fieldElement = this.hostElement.querySelector<HTMLElement>('.topic-map-field');
    this.topicNodeElements = Array.from(this.hostElement.querySelectorAll<HTMLElement>('.topic-map-node'));

    if (!this.sectionElement || !this.fieldElement) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      const section = this.sectionElement;

      if (!section) {
        return;
      }

      const handlePointerMove = (event: PointerEvent) => this.updatePointerPosition(event);
      const handlePointerLeave = () => this.resetPointerPosition();
      const handleViewportChange = () => this.updateScrollPosition();

      section.addEventListener('pointermove', handlePointerMove, {passive: true});
      section.addEventListener('pointerleave', handlePointerLeave);
      window.addEventListener('scroll', handleViewportChange, {passive: true});
      window.addEventListener('resize', handleViewportChange);
      this.updateScrollPosition();

      this.destroyRef.onDestroy(() => {
        section.removeEventListener('pointermove', handlePointerMove);
        section.removeEventListener('pointerleave', handlePointerLeave);
        window.removeEventListener('scroll', handleViewportChange);
        window.removeEventListener('resize', handleViewportChange);

        if (this.animationFrame) {
          window.cancelAnimationFrame(this.animationFrame);
        }
      });
    });
  }

  protected setActive(slug: string): void {
    this.activeSlug.set(slug);
  }

  protected clearActive(): void {
    this.activeSlug.set(null);
  }

  protected topicAriaLabel(topic: TopicKnowledgeMapItem): string {
    return `${topic.title}: ${topic.count} related post${topic.count === 1 ? '' : 's'}`;
  }

  protected topicStyle(topic: TopicKnowledgeMapItem): Record<string, string> {
    const placement = topic.theme.mapPlacement;
    const depth = Math.max(1, placement.depth);
    const opacity = Math.min(1, 0.74 + depth * 0.08);

    return {
      '--topic-accent': topic.theme.accent,
      '--topic-accent-strong': topic.theme.accentStrong,
      '--topic-accent-rgb': topic.theme.accentRgb,
      '--topic-x': `${placement.xPercent}%`,
      '--topic-y': `${placement.yPercent}%`,
      '--topic-scale': String(placement.scale),
      '--topic-float-delay': `${placement.floatDelayMs}ms`,
      '--topic-z': String(10 + depth * 10),
      '--topic-z-depth': `${depth * 16}px`,
      '--topic-opacity': opacity.toFixed(2),
      '--topic-node-pan-x': '0px',
      '--topic-node-pan-y': '0px',
      '--topic-icon-pan-x': '0px',
      '--topic-icon-pan-y': '0px',
    };
  }

  private updatePointerPosition(event: PointerEvent): void {
    if (!this.sectionElement) {
      return;
    }

    const rect = this.sectionElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    this.pointerInside = true;
    this.pointerX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    this.pointerY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    this.scheduleParallaxUpdate();
  }

  private resetPointerPosition(): void {
    this.pointerInside = false;
    this.pointerX = 0;
    this.pointerY = 0;
    this.scheduleParallaxUpdate();
  }

  private updateScrollPosition(): void {
    if (!this.sectionElement || typeof window === 'undefined') {
      return;
    }

    const rect = this.sectionElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const sectionCenter = rect.top + rect.height / 2;
    const viewportCenter = viewportHeight / 2;

    this.scrollOffset = clamp((viewportCenter - sectionCenter) / viewportHeight, -1, 1);
    this.scheduleParallaxUpdate();
  }

  private scheduleParallaxUpdate(): void {
    if (this.animationFrame || typeof window === 'undefined') {
      return;
    }

    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = 0;
      this.applyParallaxStyles();
    });
  }

  private applyParallaxStyles(): void {
    if (!this.sectionElement) {
      return;
    }

    const pointerStrength = this.pointerInside ? 1 : 0;
    const pointerX = this.pointerX * pointerStrength;
    const pointerY = this.pointerY * pointerStrength;
    const scrollOffset = this.scrollOffset;

    this.sectionElement.style.setProperty('--topic-bg-main-x', '50%');
    this.sectionElement.style.setProperty('--topic-bg-main-y', `${46 + scrollOffset * 4}%`);
    this.sectionElement.style.setProperty('--topic-bg-left-x', '12%');
    this.sectionElement.style.setProperty('--topic-bg-left-y', `${36 - scrollOffset * 3}%`);
    this.sectionElement.style.setProperty('--topic-bg-right-x', '76%');
    this.sectionElement.style.setProperty('--topic-bg-right-y', `${62 + scrollOffset * 3}%`);
    this.sectionElement.style.setProperty('--topic-grid-x', '0px');
    this.sectionElement.style.setProperty('--topic-grid-y', `${scrollOffset * -18}px`);
    this.sectionElement.style.setProperty('--topic-orbit-x', `${pointerX * 22}px`);
    this.sectionElement.style.setProperty('--topic-orbit-y', `${pointerY * 14}px`);
    this.sectionElement.style.setProperty('--topic-ghost-x', `${pointerX * -28}px`);
    this.sectionElement.style.setProperty('--topic-ghost-y', `${pointerY * -18}px`);
    this.sectionElement.style.setProperty('--topic-field-tilt-x', `${pointerX * 2.4}deg`);
    this.sectionElement.style.setProperty('--topic-field-tilt-y', `${pointerY * -1.8}deg`);
    this.sectionElement.style.setProperty('--topic-field-y', '0px');
    this.topicNodeElements = Array.from(this.hostElement.querySelectorAll<HTMLElement>('.topic-map-node'));

    for (const node of this.topicNodeElements) {
      const depth = Math.max(1, Number(node.dataset['topicDepth']) || 1);

      node.style.setProperty('--topic-node-pan-x', `${pointerX * (8 + depth * 5)}px`);
      node.style.setProperty('--topic-node-pan-y', `${pointerY * (6 + depth * 4)}px`);
      node.style.setProperty('--topic-icon-pan-x', `${pointerX * (1.6 + depth * 0.8)}px`);
      node.style.setProperty('--topic-icon-pan-y', `${pointerY * (1.4 + depth * 0.7)}px`);
    }
  }
}
