
class SpanishVerbConjugation {
  constructor() {
    this.conjugator = new Conjugator();
    this.tenses = this.initializeTenses();
  }

  /**
   * Initialize all available tenses for Spanish verb conjugation
   */
  initializeTenses() {
    return [
      // Indicative Mood
      {
        mood: 'Indicative',
        tenses: [
          { id: 'present', name: 'Presente', description: 'Present tense' },
          { id: 'preterite', name: 'Pretérito Perfecto Simple', description: 'Preterite (simple past)' },
          { id: 'imperfect', name: 'Pretérito Imperfecto', description: 'Imperfect past' },
          { id: 'future', name: 'Futuro Simple', description: 'Simple future' },
          { id: 'conditional', name: 'Condicional Simple', description: 'Conditional' },
          { id: 'presentPerfect', name: 'Pretérito Perfecto Compuesto', description: 'Present perfect' },
          { id: 'pastPerfect', name: 'Pretérito Pluscuamperfecto', description: 'Past perfect (pluperfect)' },
          { id: 'futurePerfect', name: 'Futuro Perfecto', description: 'Future perfect' },
          { id: 'conditionalPerfect', name: 'Condicional Perfecto', description: 'Conditional perfect' }
        ]
      },
      // Subjunctive Mood
      {
        mood: 'Subjunctive',
        tenses: [
          { id: 'subjunctivePresent', name: 'Presente', description: 'Present subjunctive' },
          { id: 'subjunctiveImperfect', name: 'Imperfecto', description: 'Imperfect subjunctive' },
          { id: 'subjunctiveFuture', name: 'Futuro', description: 'Future subjunctive' },
          { id: 'subjunctivePresentPerfect', name: 'Pretérito Perfecto', description: 'Present perfect subjunctive' },
          { id: 'subjunctivePastPerfect', name: 'Pretérito Pluscuamperfecto', description: 'Past perfect subjunctive' },
          { id: 'subjunctiveFuturePerfect', name: 'Futuro Perfecto', description: 'Future perfect subjunctive' }
        ]
      },
      // Imperative Mood
      {
        mood: 'Imperative',
        tenses: [
          { id: 'imperativeAffirmative', name: 'Afirmativo', description: 'Affirmative imperative' },
          { id: 'imperativeNegative', name: 'Negativo', description: 'Negative imperative' }
        ]
      },
      // Progressive Forms
      {
        mood: 'Progressive',
        tenses: [
          { id: 'presentProgressive', name: 'Presente Continuo', description: 'Present progressive' },
          { id: 'pastProgressive', name: 'Pretérito Continuo', description: 'Past progressive' },
          { id: 'futureProgressive', name: 'Futuro Continuo', description: 'Future progressive' },
          { id: 'conditionalProgressive', name: 'Condicional Continuo', description: 'Conditional progressive' }
        ]
      },
      // Perfect Forms
      {
        mood: 'Perfect',
        tenses: [
          { id: 'presentPerfect', name: 'Presente Perfecto', description: 'Present perfect' },
          { id: 'pastPerfect', name: 'Pretérito Pluscuamperfecto', description: 'Past perfect' },
          { id: 'futurePerfect', name: 'Futuro Perfecto', description: 'Future perfect' },
          { id: 'conditionalPerfect', name: 'Condicional Perfecto', description: 'Conditional perfect' }
        ]
      }
    ];
  }

  /**
   * Get all available tenses organized by mood
   * @returns {Array} Array of mood objects with their tenses
   */
  getAllTenses() {
    return this.tenses;
  }

  /**
   * Get all tense IDs for validation
   * @returns {Array} Array of all valid tense IDs
   */
  getAllTenseIds() {
    const allTenseIds = [];
    this.tenses.forEach(mood => {
      mood.tenses.forEach(tense => {
        allTenseIds.push(tense.id);
      });
    });
    return allTenseIds;
  }

  /**
   * Get tense information by ID
   * @param {string} tenseId - The tense ID to look up
   * @returns {Object|null} Tense object or null if not found
   */
  getTenseById(tenseId) {
    for (const mood of this.tenses) {
      const tense = mood.tenses.find(t => t.id === tenseId);
      if (tense) {
        return { ...tense, mood: mood.mood };
      }
    }
    return null;
  }

  /**
   * Conjugate a Spanish verb in a specific tense
   * @param {string} verb - The infinitive verb (e.g., "hablar", "comer", "vivir")
   * @param {string} tenseId - The tense ID to conjugate into
   * @returns {Object} Conjugation result with person-form pairs
   */
  conjugate(verb, tenseId) {
    try {
      // Validate tense ID
      const tenseInfo = this.getTenseById(tenseId);
      if (!tenseInfo) {
        throw new Error(`Invalid tense ID: ${tenseId}`);
      }

      // Clean and validate verb
      const cleanVerb = verb.trim().toLowerCase();
      if (!cleanVerb.endsWith('ar') && !cleanVerb.endsWith('er') && !cleanVerb.endsWith('ir')) {
        throw new Error(`Invalid Spanish verb: ${verb}. Must end with -ar, -er, or -ir`);
      }

      // Get conjugation from conjugator-es
      const conjugation = this.conjugator.conjugate(cleanVerb, tenseId);
      
      // Format the result with Spanish pronouns
      const result = this.formatConjugationResult(conjugation, tenseInfo);
      
      return {
        success: true,
        verb: cleanVerb,
        tense: tenseInfo,
        conjugations: result,
        raw: conjugation
      };

    } catch (error) {
      return {
        success: false,
        verb: verb,
        tenseId: tenseId,
        error: error.message,
        conjugations: this.getEmptyConjugation()
      };
    }
  }

  /**
   * Format conjugation result with Spanish pronouns
   * @param {Object} conjugation - Raw conjugation from conjugator-es
   * @param {Object} tenseInfo - Information about the tense
   * @returns {Array} Array of person-form pairs
   */
  formatConjugationResult(conjugation, tenseInfo) {
    const persons = [
      { id: 'yo', pronoun: 'yo', english: 'I' },
      { id: 'tu', pronoun: 'tú', english: 'you (informal)' },
      { id: 'el', pronoun: 'él/ella/usted', english: 'he/she/you (formal)' },
      { id: 'nosotros', pronoun: 'nosotros/nosotras', english: 'we' },
      { id: 'vosotros', pronoun: 'vosotros/vosotras', english: 'you all (informal, Spain)' },
      { id: 'ellos', pronoun: 'ellos/ellas/ustedes', english: 'they/you all (formal)' }
    ];

    const result = [];

    // Handle different conjugation structures based on tense
    if (tenseInfo.mood === 'Imperative') {
      // Imperative has different person structure
      const imperativePersons = [
        { id: 'tu', pronoun: 'tú', english: 'you (informal)' },
        { id: 'usted', pronoun: 'usted', english: 'you (formal)' },
        { id: 'nosotros', pronoun: 'nosotros/nosotras', english: 'we' },
        { id: 'vosotros', pronoun: 'vosotros/vosotras', english: 'you all (informal, Spain)' },
        { id: 'ustedes', pronoun: 'ustedes', english: 'you all (formal)' }
      ];

      imperativePersons.forEach(person => {
        const form = this.getConjugationForm(conjugation, person.id, tenseInfo);
        result.push({
          person: person,
          form: form,
          isEmpty: !form || form === ''
        });
      });
    } else {
      // Standard conjugation for all other moods
      persons.forEach(person => {
        const form = this.getConjugationForm(conjugation, person.id, tenseInfo);
        result.push({
          person: person,
          form: form,
          isEmpty: !form || form === ''
        });
      });
    }

    return result;
  }

  /**
   * Get the conjugated form for a specific person
   * @param {Object} conjugation - Raw conjugation object
   * @param {string} personId - Person identifier
   * @param {Object} tenseInfo - Tense information
   * @returns {string} Conjugated form
   */
  getConjugationForm(conjugation, personId, tenseInfo) {
    // Handle different conjugation structures
    if (conjugation[personId]) {
      return conjugation[personId];
    }
    
    // Try alternative person mappings
    const alternativeMappings = {
      'el': ['ella', 'usted'],
      'ellos': ['ellas', 'ustedes'],
      'tu': ['vos']
    };

    if (alternativeMappings[personId]) {
      for (const altPerson of alternativeMappings[personId]) {
        if (conjugation[altPerson]) {
          return conjugation[altPerson];
        }
      }
    }

    // Return empty string if not found
    return '';
  }

  /**
   * Get empty conjugation structure for error cases
   * @returns {Array} Empty conjugation array
   */
  getEmptyConjugation() {
    const persons = [
      { id: 'yo', pronoun: 'yo', english: 'I' },
      { id: 'tu', pronoun: 'tú', english: 'you (informal)' },
      { id: 'el', pronoun: 'él/ella/usted', english: 'he/she/you (formal)' },
      { id: 'nosotros', pronoun: 'nosotros/nosotras', english: 'we' },
      { id: 'vosotros', pronoun: 'vosotros/vosotras', english: 'you all (informal, Spain)' },
      { id: 'ellos', pronoun: 'ellos/ellas/ustedes', english: 'they/you all (formal)' }
    ];

    return persons.map(person => ({
      person: person,
      form: '',
      isEmpty: true
    }));
  }

  /**
   * Get common irregular verbs for quick access
   * @returns {Array} Array of common irregular verbs
   */
  getCommonIrregularVerbs() {
    return [
      'ser', 'estar', 'tener', 'hacer', 'ir', 'decir', 'poder', 'querer',
      'saber', 'poner', 'dar', 'venir', 'ver', 'caber', 'haber', ' deber',
      'salir', 'caer', 'traer', 'oír', 'leer', 'construir', 'atribuir',
      'incluir', 'oír', 'huir', 'concluir', 'distinguir', 'exigir'
    ];
  }

  /**
   * Check if a verb is commonly irregular
   * @param {string} verb - The verb to check
   * @returns {boolean} True if the verb is commonly irregular
   */
  isCommonIrregularVerb(verb) {
    const cleanVerb = verb.trim().toLowerCase();
    return this.getCommonIrregularVerbs().includes(cleanVerb);
  }

  /**
   * Get verb type (-ar, -er, -ir)
   * @param {string} verb - The verb to analyze
   * @returns {string} The verb type
   */
  getVerbType(verb) {
    const cleanVerb = verb.trim().toLowerCase();
    if (cleanVerb.endsWith('ar')) return 'ar';
    if (cleanVerb.endsWith('er')) return 'er';
    if (cleanVerb.endsWith('ir')) return 'ir';
    return 'unknown';
  }

  /**
   * Get verb stem (remove infinitive ending)
   * @param {string} verb - The verb to analyze
   * @returns {string} The verb stem
   */
  getVerbStem(verb) {
    const cleanVerb = verb.trim().toLowerCase();
    const type = this.getVerbType(cleanVerb);
    if (type === 'ar') return cleanVerb.slice(0, -2);
    if (type === 'er') return cleanVerb.slice(0, -2);
    if (type === 'ir') return cleanVerb.slice(0, -2);
    return cleanVerb;
  }
}

export default SpanishVerbConjugation;
