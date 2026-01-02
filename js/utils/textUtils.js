/**
 * Text utility functions for accent handling and text processing
 */
class TextUtils {
  /**
   * Remove accents from text using Unicode normalization
   * @param {string} text - The text to remove accents from
   * @returns {string} - Text without accents
   */
  static removeAccents(text) {
    if (!text) return text;
    
    return text.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[\u0300-\u036f]/g, '') // Double-check for any remaining
      .replace(/[\u1DC0-\u1DFF]/g, '') // Combining diacritical marks supplement
      .replace(/[\u20D0-\u20FF]/g, '') // Combining marks for symbols
      .replace(/[\uFE20-\uFE2F]/g, ''); // Combining half marks
  }

  /**
   * Create accent-insensitive search term
   * @param {string} searchTerm - The original search term
   * @returns {string} - Search term without accents
   */
  static createAccentInsensitiveTerm(searchTerm) {
    return this.removeAccents(searchTerm);
  }

  /**
   * Check if text matches search term (accent-insensitive)
   * @param {string} text - The text to check
   * @param {string} searchTerm - The search term
   * @returns {boolean} - Whether text matches (accent-insensitive)
   */
  static accentInsensitiveMatch(text, searchTerm) {
    if (!text || !searchTerm) return false;
    
    const textNoAccents = this.removeAccents(text);
    const searchTermNoAccents = this.removeAccents(searchTerm);
    
    return textNoAccents.toLowerCase().includes(searchTermNoAccents.toLowerCase());
  }

  /**
   * Create accent-insensitive regex for exact matching
   * @param {string} searchTerm - The search term
   * @returns {RegExp} - Regex that matches whole words (accent-insensitive)
   */
  static createAccentInsensitiveRegex(searchTerm) {
    const searchTermNoAccents = this.removeAccents(searchTerm);
    const escapedTerm = searchTermNoAccents.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escapedTerm}\\b`, 'i');
  }
}

export default TextUtils;
