import SpanishVerbConjugation from './spanishVerbConjugation.js';

// Example usage of SpanishVerbConjugation utility
class ConjugationExample {
  constructor() {
    this.conjugator = new SpanishVerbConjugation();
  }

  demonstrateConjugation() {
    console.log('=== Spanish Verb Conjugation Demo ===');
    
    // Example verbs to conjugate
    const verbs = ['hablar', 'comer', 'vivir', 'ser', 'tener'];
    
    // Example tenses to demonstrate
    const tenses = ['present', 'preterite', 'imperfect', 'future', 'conditional'];
    
    verbs.forEach(verb => {
      console.log(`\n--- Conjugating "${verb}" ---`);
      
      tenses.forEach(tenseId => {
        try {
          const result = this.conjugator.conjugate(verb, tenseId);
          
          if (result.success) {
            console.log(`${result.tense.name} (${result.tense.mood}):`);
            result.conjugations.forEach(person => {
              console.log(`  ${person.pronoun}: ${person.form || '(empty)'}`);
            });
          } else {
            console.log(`Error in ${tenseId}: ${result.error}`);
          }
        } catch (error) {
          console.log(`Exception conjugating "${verb}" in ${tenseId}: ${error.message}`);
        }
      });
    });
  }

  demonstrateTenseListing() {
    console.log('\n=== Available Tenses ===');
    const allTenses = this.conjugator.getAllTenses();
    
    allTenses.forEach(mood => {
      console.log(`\n${mood.mood}:`);
      mood.tenses.forEach(tense => {
        console.log(`  - ${tense.id}: ${tense.name} (${tense.description})`);
      });
    });
  }

  demonstrateVerbAnalysis() {
    console.log('\n=== Verb Analysis Demo ===');
    
    const testVerbs = ['hablar', 'comer', 'vivir', 'ser', 'tener'];
    
    testVerbs.forEach(verb => {
      console.log(`\nAnalyzing "${verb}":`);
      console.log(`  Type: ${this.conjugator.getVerbType(verb)}`);
      console.log(`  Stem: ${this.conjugator.getVerbStem(verb)}`);
      console.log(`  Is irregular: ${this.conjugator.isCommonIrregularVerb(verb)}`);
    });
  }

  demonstrateErrorHandling() {
    console.log('\n=== Error Handling Demo ===');
    
    // Test invalid verb
    console.log('\n1. Testing invalid verb:');
    const invalidResult = this.conjugator.conjugate('invalidverb', 'present');
    console.log(invalidResult);
    
    // Test invalid tense
    console.log('\n2. Testing invalid tense:');
    const invalidTenseResult = this.conjugator.conjugate('hablar', 'invalidTense');
    console.log(invalidTenseResult);
    
    // Test edge cases
    console.log('\n3. Testing edge cases:');
    const edgeCases = [
      { verb: '', tense: 'present' },
      { verb: 'hablar', tense: '' },
      { verb: null, tense: 'present' }
    ];
    
    edgeCases.forEach((testCase, index) => {
      console.log(`Edge case ${index + 1}:`, testCase);
      try {
        const result = this.conjugator.conjugate(testCase.verb, testCase.tense);
        console.log('Result:', result);
      } catch (error) {
        console.log('Error:', error.message);
      }
    });
  }

  runAllDemos() {
    this.demonstrateTenseListing();
    this.demonstrateVerbAnalysis();
    this.demonstrateConjugation();
    this.demonstrateErrorHandling();
  }
}

// Export for easy testing
export { ConjugationExample };

// Auto-run demo if this file is loaded directly
if (typeof window !== 'undefined') {
  const demo = new ConjugationExample();
  demo.runAllDemos();
}
