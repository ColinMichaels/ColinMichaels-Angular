import { Pipe, PipeTransform } from '@angular/core';

/**
 * A custom Pipe that obfuscates or de-obfuscates a given string or number using a provided cipher map.
 * This pipe can be used in Angular templates or components to transform data dynamically.
 * Example Usage:
 * <div>
 *   <!-- Using the pipe to encode -->
 *   <p>Original: hello123</p>
 *   <p>Encoded: {{ 'hello123' | obfuscate: cipherKey:'encode' }}</p>
 *
 *   <!-- Using the pipe to decode -->
 *   <p>Encoded: xyz$#1</p>
 *   <p>Decoded: {{ 'xyz$#1' | obfuscate: cipherKey:'decode' }}</p>
 * </div>
 *
 *  // Example cipherKey for encoding/decoding
 *   cipherKey: { [key: string]: string } = {
 *     'a': 'x',
 *     'b': 'y',
 *     'c': 'z',
 *     '1': '@',
 *     '2': '#',
 *     '3': '$',
 *     // You can expand this key map as needed
 *   };
 */
@Pipe({
  name: 'obfuscate'
})
export class ObfuscatePipe implements PipeTransform {

  /**
   * Default cipher if none is provided.
   */
  private defaultCipher: { [key: string]: string } = {
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D'
  };

  /**
   * @param value The input text/number to obfuscate.
   * @param cipher (Optional) The cipher key, an object mapping characters (or numbers) to their replacements.
   * @param mode 'encode' or 'decode', to determine the operation.
   * @returns The transformed value.
   */
  transform(value: string, cipher: { [key: string]: string } = this.defaultCipher, mode: 'encode' | 'decode' = 'encode'): string {
    if (!value || (mode !== 'encode' && mode !== 'decode')) {
      return value; // Return value unchanged if invalid input or mode
    }

    const result: string[] = [];
    const effectiveCipher = cipher || this.defaultCipher;
    const reverseCipher = mode === 'decode'
      ? Object.fromEntries(Object.entries(effectiveCipher).map(([key, val]) => [val, key]))
      : effectiveCipher;

    for (const char of value) {
      result.push(reverseCipher[char] || char); // Replace with ciphered value, or keep the character as is
    }

    return result.join('');
  }
}
