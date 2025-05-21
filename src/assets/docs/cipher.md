# Documentation for Cipher Implementation and Resume Component

## Cipher Object Documentation

This cipher object is a mapping used for encoding and decoding transformations. Keys map to values and vice versa, allowing reversible operations such as encryption or data obfuscation.

### Cipher Structure
```typescript
private readonly cipher = {
  '1': 'b', '2': 'a', '3': 'd', '4': 'c', '5': 'f', 
  '6': 'e', '7': 'h', '8': 'g', '9': 'j', '10': 'i', 
  'a': '1', 'b': '2', 'c': '3', 'd': '4', 'e': '5',
  'f': '6', 'g': '7', 'h': '8', 'i': '9', 'j': '10',
  'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n', 'o': 'o', 
  'p': 'p', 'q': 'q', 'r': 'r', 's': 's',
};
```


### Purpose
The cipher serves as a bidirectional mapping tool:
1. **Encoding**: Convert alphanumeric keys into their corresponding encoded values (e.g., `1 → b`, `a → 1`).
2. **Decoding**: Reverse the encoding process to restore the original input (e.g., `b → 1`, `1 → a`).

---

### Operations
1. **Encode Text**:
   Use the cipher to replace plain text characters with their encoded counterparts.

2. **Decode Text**:
   Use the cipher to reverse the encoding.

### Example Use
```typescript
encode('123a'); // Encodes input to 'bad1'
decode('bad1'); // Decodes back to '123a'
```


---

## Resume Component Documentation

The `ResumeComponent` dynamically displays a resume's content, leveraging Tailwind CSS for styling and utilizing Angular's reactive programming model for responsive updates.

---

### Template Structure

The `ResumeComponent` is split into semantic sections for better readability and modular design. Each section uses Tailwind classes for styling and modern responsiveness.

### Key Sections
1. **Header**
  - Displays the name, website, and contact details.
  - **Tailwind Classes Used**:
    - `max-w-4xl mx-auto p-6 text-left`: Centers the header and ensures text is properly aligned.
    - `text-3xl sm:text-4xl font-bold`: Controls text size and weight for headings.
    - `hover:underline text-blue-600`: Adds hover effects and highlights links for accessibility.

2. **Summary**
  - Provides a brief overview of skills and experience.
  - **Tailwind Classes Used**:
    - `font-semibold text-gray-700`: Highlights the title.
    - `text-base leading-relaxed`: Improves readability of summary text.

3. **Professional Experience**
  - Lists job history with company names, roles, and achievements.
  - **Tailwind Classes Used**:
    - `space-y-4 mt-2 sm:text-base`: Adds spacing between items and ensures text adjusts for different screen sizes.

4. **Education**
  - Details academic qualifications.
  - **Tailwind Classes Used**:
    - `list-disc ml-5 mt-2`: Formats the section using bulleted lists.

5. **Skills**
  - Highlights relevant programming languages, frameworks, version control, and tools.
  - **Tailwind Classes Used**:
    - `text-base mt-2`: Ensures uniform text size and crisp formatting.

6. **Achievements**
  - Lists notable accomplishments.
  - **Tailwind Classes Used**:
    - `list-disc ml-5 mt-2`: Bulleted lists with spacing for clear reading.

---

### Responsive Design
The Tailwind-based layout ensures proper adjustments for different screen sizes:
- **Small Screens**: Uses `text-sm` for smaller font sizes and adjusts padding.
- **Medium Screens**: Scales up spacing with `sm:text-base` and `gap-x-4`.
- **Large Screens**: Centralizes the layout with `max-w-4xl mx-auto`.

---

### Example Template Code (Header and Summary)
```html
<section class="max-w-4xl mx-auto p-6 text-left text-gray-800">
  <header class="text-center mb-8">
    <h1 class="text-3xl sm:text-4xl font-bold">Colin Michaels</h1>
    <p class="text-sm sm:text-base text-gray-500">
      <a href="https://colinmichaels.com" target="_blank" class="hover:underline text-blue-600">colinmichaels.com</a> |
      <a href="mailto:colin@colinmichaels.com" class="hover:underline text-blue-600">colin&#64;colinmichaels.com</a> |
      954-600-8303
    </p>
  </header>

  <section class="mb-6">
    <h2 class="text-xl font-semibold text-gray-700">Summary</h2>
    <p class="mt-2 text-base leading-relaxed">
      Front End Developer with a proven ability to exceed client requirements. Skilled in evaluating current and future
      technological needs in support of both short and long-term IT initiatives. Experienced in communicating effectively to
      cultivate excellent client expectations.
    </p>
  </section>
</section>
```


---

## Settings Service Documentation

The `SettingsService` is designed to handle application settings and setting sets, supporting CRUD operations, persistence through local storage, and reactivity for automatic updates.

### Core Features
1. **Standalone Settings**:
  - Manage individual settings.
  - Example: Theme preference (`light` or `dark`).

2. **Grouped Settings (Setting Sets)**:
  - Manage grouped settings as arrays.
  - Example: User preferences array.

---

### Key Observables
1. **Standalone Setting Observable**:
```typescript
this.settingsService.getSetting<string>('theme')?.subscribe((theme) => {
     console.log(`Current theme: ${theme}`);
   });
```

- Retrieves a single setting and updates reactively.

2. **Grouped Setting Observable**:
```typescript
this.settingsService.getSettingSet<string>('userPreferences')?.subscribe((preferences) => {
     console.log(`User preferences updated: ${preferences}`);
   });
```

- Watches a setting set for updates.

---

### Example Usage
1. **Registering a New Setting**
```typescript
this.settingsService.registerSetting('theme', 'light');
```


2. **Updating a Setting**
```typescript
this.settingsService.setSetting('theme', 'dark');
```


3. **Manipulating a Setting Set**
```typescript
this.settingsService.registerSettingSet('userPreferences', ['optionA', 'optionB']);
   this.settingsService.addSettingToSet('userPreferences', 'optionC');
   this.settingsService.updateSettingSet('userPreferences', ['optionX', 'optionY']);
```


---

### Example Form Integration
Leverages `FormGroup` and Angular's reactive forms to synchronize UI inputs with settings.

```typescript
const formGroup = this.settingsService.createFormGroupForSettings('userPreferences');
this.settingsService.syncFormGroupWithSettingSet(formGroup, 'userPreferences');
```


---

## Conclusion

- **Cipher Object**: Provides a bidirectional character mapping (encoding/decoding).
- **Resume Component**: Tailwind-powered, modular, and responsive resume template.
- **Settings Service**: Comprehensive service for managing individual and grouped settings with persistence and reactivity.

Each component is structured for modularity, scalability, and ease of maintenance. Let me know if additional clarifications are needed!
