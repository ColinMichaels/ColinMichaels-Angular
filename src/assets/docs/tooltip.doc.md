# Documentation: Tooltip Directive

## Overview

This guide offers an in-depth look at an Angular directive used to implement HTML tooltips. These tooltips can be seamlessly added to any element in an Angular application thanks to a dedicated tooltip service and display template.

## Components and Inputs

The tooltip component provides various configurable inputs for easy customization of behavior and style:

1. **text**:
   ```typescript
   @Input() text: string = '';
   ```
  - **Details:** Defines the tooltip's content. This is a mandatory input to inform users effectively.

2. **toolTipClass**:
   ```typescript
   @Input() toolTipClass: string = '';
   ```
  - **Details:** Custom CSS classes can be applied to the tooltip for tailored styling.

3. **position**:
   ```typescript
   @Input() position: TooltipPosition = 'top';
   ```
  - **Details:** Configures the tooltip's position relative to its host element. Default is 'top', with options including 'bottom', 'left', and 'right', as per the TooltipPosition enum.

4. **size**:
   ```typescript
   @Input() size: TooltipSize = 'md';
   ```
  - **Details:** Sets the tooltip's size. Options are 'small', 'medium' (default), or 'large', per the TooltipSize enum.

5. **hostElement**:
   ```typescript
   @Input() hostElement!: HTMLElement;
   ```
  - **Details:** References the host element for proper tooltip positioning.

6. **autoDismissDelay**:
   ```typescript
   @Input() autoDismissDelay: number | null = null;
   ```
  - **Details:** Sets the auto-dismiss delay in milliseconds. A null value requires manual dismissal.

7. **showArrow**:
   ```typescript
   @Input() showArrow: boolean = false;
   ```
  - **Details:** Controls tooltip arrow visibility, which is off by default.

8. **tooltipRef**:
   ```typescript
   @ViewChild('tooltipRef') tooltipRef!: ElementRef;
   ```
  - **Details:** Directly references the tooltip for manipulation within the component.

## Conclusion

The Angular tooltip directive enhances web applications by delivering informative and customizable tips. Developers can adjust and fine-tune according to design needs, fostering a better user experience by providing contextual information efficiently.

For further customization and detailed usage, consult the project's codebase and supporting documentation.
