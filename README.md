# Tooltip Examples and Notification Service

This project is an Angular-based application showcasing customized tooltip examples and a notification system. It utilizes various utility libraries and techniques to enhance user interface interactions.

## Features

### Tooltip Examples
- **Default Tooltips**: Position-based tooltips for `top`, `bottom`, `left`, and `right`.
- **Colored Tooltips**: Customizable background and text colors using Tailwind CSS.
- **Randomized Colors**: Dynamic tooltip styles with random text and background color combinations.
- **No Arrow Tooltips**: Tooltips without arrows for a sleek design.

### Notification System
- **Customizable Notifications**: Display notifications with dynamic content, styles, and media assets.
- **Media Support**: Include FontAwesome icons or image assets in the notification modal.
- **Auto-Dismiss and Queued Notifications**: Notifications can auto-dismiss after a set duration while handling multiple notifications in a queue.

## Key Components & Services

### Components
- **TooltipExamplesComponent**: The core feature demo component showcasing tooltip examples and their customizations.
- **MarkdownReaderComponent**: Dynamically reads and renders markdown documents, useful for embedding user guides directly.

### Directives
- **TooltipDirective**: Handles tooltip display logic when a mouse hovers over an element. Enables customization of tooltips' size, position, and more.

### Services
- **NotificationService**: A shared service to manage notifications. It provides:
  - Functions to display, dismiss, and clear notifications.
  - Queue-based notification handling.

- **MediaItem (Helper Class)**: Facilitates the creation of media elements such as icons and images for notifications.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Usage](#usage)
3. [Customization](#customization)
4. [Technology Stack](#technology-stack)
5. [License](#license)

---

## Getting Started

### Prerequisites
Ensure you have the following installed on your system:
- **Node.js**: v14 or higher
- **NPM**: v6 or higher
- **Angular CLI**: v19 or higher

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd <project-directory>
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application
Start the development server:
```bash 
ng serve
```

Open your browser and navigate to `http://localhost:4200`.

---

## Usage

### TooltipExamplesComponent
This component demonstrates various tooltip designs. You can experiment with:
- Changing tooltip text, size, or position.
- Applying different colors via the utility classes in `Tailwind CSS`.
- Using the `TooltipDirective` directly in your Angular templates.

### NotificationService
To trigger a notification from your code, use the `NotificationService`. Example:
```typescript 
    this.notificationService.show({ title: 'New Message', message: 'You have received a new message!', classList: 'bg-green-500 text-white', duration: 5000 });
```


### Random Tailwind Styles
The `randomTailwindColorClasses` property generates random text and background combinations for tooltips.

---

## Customization

### Tooltips
Tooltips can be customized with the following options:
- **Position**: `top`, `bottom`, `left`, or `right`.
- **CSS Classes**: Customize styles such as background color or padding.
- **Size**: `sm`, `md`, or `lg`.

### Notifications
- **Media Content**: Add images or icons using the configurable `MediaItem` class.
- **Persistent or Temporary**: Decide whether notifications should auto-dismiss or stay visible until manually removed.

---

## Technology Stack
- **Angular**: Modern web applications built with components and modules.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI styling.
- **FontAwesome Angular Library**: For using scalable vector icons.
- **RxJS (Reactive Extensions)**: Reactive programming paradigm.

---

## License
This project is licensed under the [MIT License](LICENSE).

---

## Contributors
Feel free to contribute to this project by submitting issues or pull requests.
