import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  // Store a single key-value pair or an array of values
  setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  }

  // Retrieve a single item or an array of values
  getItem<T>(key: string): T | null {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return null;

    try {
      return JSON.parse(storedValue) as T;
    } catch (error) {
      console.error('Error parsing item from storage:', error);
      return null;
    }
  }

  // Store multiple values as a collection (e.g., a "set")
  setItems(key: string, values: any[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(values));
    } catch (error) {
      console.error('Error setting items in storage:', error);
    }
  }

  // Retrieve a collection (array) of values
  getItems<T>(key: string): T[] | null {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return null;

    try {
      return JSON.parse(storedValue) as T[];
    } catch (error) {
      console.error('Error parsing array from storage:', error);
      return null;
    }
  }

  // Remove a specific item or set from storage
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }

  // Clear all stored data
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}
