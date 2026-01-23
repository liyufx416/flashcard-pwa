import { Conjugator } from 'https://esm.run/conjugator-es@1.2.0';
const PERSONS = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];
const IMPERATIVE_PERSONS = ['tu', 'usted', 'nosotros', 'vosotros', 'ustedes'];

class LocalConjugatorEs {
  constructor() {
    this.irregular = {
      ser: {
        present: { yo: 'soy', tu: 'eres', el: 'es', nosotros: 'somos', vosotros: 'sois', ellos: 'son' },
        preterite: { yo: 'fui', tu: 'fuiste', el: 'fue', nosotros: 'fuimos', vosotros: 'fuisteis', ellos: 'fueron' },
        imperfect: { yo: 'era', tu: 'eras', el: 'era', nosotros: 'éramos', vosotros: 'erais', ellos: 'eran' },
        subjunctivePresent: { yo: 'sea', tu: 'seas', el: 'sea', nosotros: 'seamos', vosotros: 'seáis', ellos: 'sean' },
        imperativeAffirmative: { tu: 'sé', usted: 'sea', nosotros: 'seamos', vosotros: 'sed', ustedes: 'sean' },
        participle: 'sido',
        gerund: 'siendo'
      },
      estar: {
        present: { yo: 'estoy', tu: 'estás', el: 'está', nosotros: 'estamos', vosotros: 'estáis', ellos: 'están' },
        preterite: { yo: 'estuve', tu: 'estuviste', el: 'estuvo', nosotros: 'estuvimos', vosotros: 'estuvisteis', ellos: 'estuvieron' },
        imperfect: { yo: 'estaba', tu: 'estabas', el: 'estaba', nosotros: 'estábamos', vosotros: 'estabais', ellos: 'estaban' },
        subjunctivePresent: { yo: 'esté', tu: 'estés', el: 'esté', nosotros: 'estemos', vosotros: 'estéis', ellos: 'estén' },
        imperativeAffirmative: { tu: 'está', usted: 'esté', nosotros: 'estemos', vosotros: 'estad', ustedes: 'estén' },
        participle: 'estado',
        gerund: 'estando'
      },
      ir: {
        present: { yo: 'voy', tu: 'vas', el: 'va', nosotros: 'vamos', vosotros: 'vais', ellos: 'van' },
        preterite: { yo: 'fui', tu: 'fuiste', el: 'fue', nosotros: 'fuimos', vosotros: 'fuisteis', ellos: 'fueron' },
        imperfect: { yo: 'iba', tu: 'ibas', el: 'iba', nosotros: 'íbamos', vosotros: 'ibais', ellos: 'iban' },
        subjunctivePresent: { yo: 'vaya', tu: 'vayas', el: 'vaya', nosotros: 'vayamos', vosotros: 'vayáis', ellos: 'vayan' },
        imperativeAffirmative: { tu: 've', usted: 'vaya', nosotros: 'vayamos', vosotros: 'id', ustedes: 'vayan' },
        participle: 'ido',
        gerund: 'yendo'
      },
      haber: {
        present: { yo: 'he', tu: 'has', el: 'ha', nosotros: 'hemos', vosotros: 'habéis', ellos: 'han' },
        imperfect: { yo: 'había', tu: 'habías', el: 'había', nosotros: 'habíamos', vosotros: 'habíais', ellos: 'habían' },
        subjunctivePresent: { yo: 'haya', tu: 'hayas', el: 'haya', nosotros: 'hayamos', vosotros: 'hayáis', ellos: 'hayan' },
        participle: 'habido',
        gerund: 'habiendo'
      },
      dar: {
        present: { yo: 'doy', tu: 'das', el: 'da', nosotros: 'damos', vosotros: 'dais', ellos: 'dan' },
        preterite: { yo: 'di', tu: 'diste', el: 'dio', nosotros: 'dimos', vosotros: 'disteis', ellos: 'dieron' },
        subjunctivePresent: { yo: 'dé', tu: 'des', el: 'dé', nosotros: 'demos', vosotros: 'deis', ellos: 'den' },
        imperativeAffirmative: { tu: 'da', usted: 'dé', nosotros: 'demos', vosotros: 'dad', ustedes: 'den' },
        participle: 'dado',
        gerund: 'dando'
      },
      ver: {
        present: { yo: 'veo', tu: 'ves', el: 've', nosotros: 'vemos', vosotros: 'veis', ellos: 'ven' },
        preterite: { yo: 'vi', tu: 'viste', el: 'vio', nosotros: 'vimos', vosotros: 'visteis', ellos: 'vieron' },
        imperfect: { yo: 'veía', tu: 'veías', el: 'veía', nosotros: 'veíamos', vosotros: 'veíais', ellos: 'veían' },
        imperativeAffirmative: { tu: 've', usted: 'vea', nosotros: 'veamos', vosotros: 'ved', ustedes: 'vean' },
        participle: 'visto',
        gerund: 'viendo'
      }
    };

    this.irregularPreteriteStem = {
      tener: 'tuv',
      estar: 'estuv',
      hacer: 'hic',
      decir: 'dij',
      poder: 'pud',
      poner: 'pus',
      querer: 'quis',
      venir: 'vin',
      saber: 'sup',
      haber: 'hub'
    };

    this.irregularFutureStem = {
      tener: 'tendr',
      poner: 'pondr',
      salir: 'saldr',
      venir: 'vendr',
      poder: 'podr',
      haber: 'habr',
      saber: 'sabr',
      querer: 'querr',
      hacer: 'har',
      decir: 'dir'
    };

    this.irregularParticiples = {
      hacer: 'hecho',
      decir: 'dicho',
      ver: 'visto',
      poner: 'puesto',
      escribir: 'escrito',
      abrir: 'abierto',
      cubrir: 'cubierto',
      morir: 'muerto',
      volver: 'vuelto',
      romper: 'roto'
    };

    this.specialPresent = {
      tener: { yo: 'tengo', tu: 'tienes', el: 'tiene', nosotros: 'tenemos', vosotros: 'tenéis', ellos: 'tienen' },
      hacer: { yo: 'hago', tu: 'haces', el: 'hace', nosotros: 'hacemos', vosotros: 'hacéis', ellos: 'hacen' },
      decir: { yo: 'digo', tu: 'dices', el: 'dice', nosotros: 'decimos', vosotros: 'decís', ellos: 'dicen' },
      poder: { yo: 'puedo', tu: 'puedes', el: 'puede', nosotros: 'podemos', vosotros: 'podéis', ellos: 'pueden' },
      querer: { yo: 'quiero', tu: 'quieres', el: 'quiere', nosotros: 'queremos', vosotros: 'queréis', ellos: 'quieren' },
      venir: { yo: 'vengo', tu: 'vienes', el: 'viene', nosotros: 'venimos', vosotros: 'venís', ellos: 'vienen' },
      poner: { yo: 'pongo', tu: 'pones', el: 'pone', nosotros: 'ponemos', vosotros: 'ponéis', ellos: 'ponen' },
      saber: { yo: 'sé', tu: 'sabes', el: 'sabe', nosotros: 'sabemos', vosotros: 'sabéis', ellos: 'saben' }
    };

    this.specialImperativeTu = {
      tener: 'ten',
      hacer: 'haz',
      decir: 'di',
      venir: 'ven',
      poner: 'pon',
      salir: 'sal',
      ser: 'sé',
      ir: 've'
    };
  }

  conjugate(infinitive, tenseId) {
    const verb = infinitive.toLowerCase();
    const { stem, type } = this.getVerbParts(verb);

    switch (tenseId) {
      case 'present':
        return this.conjugatePresent(verb, stem, type);
      case 'preterite':
        return this.conjugatePreterite(verb, stem, type);
      case 'imperfect':
        return this.conjugateImperfect(verb, stem, type);
      case 'future':
        return this.conjugateFuture(verb);
      case 'conditional':
        return this.conjugateConditional(verb);
      case 'subjunctivePresent':
        return this.conjugateSubjunctivePresent(verb, stem, type);
      case 'subjunctiveImperfect':
        return this.conjugateSubjunctiveImperfect(verb, stem, type);
      case 'subjunctiveFuture':
        return this.conjugateSubjunctiveFuture(verb, stem, type);
      case 'imperativeAffirmative':
        return this.conjugateImperativeAffirmative(verb, stem, type);
      case 'imperativeNegative':
        return this.conjugateImperativeNegative(verb, stem, type);
      case 'presentPerfect':
        return this.conjugatePerfect(verb, 'present');
      case 'pastPerfect':
        return this.conjugatePerfect(verb, 'imperfect');
      case 'futurePerfect':
        return this.conjugatePerfect(verb, 'future');
      case 'conditionalPerfect':
        return this.conjugatePerfect(verb, 'conditional');
      case 'subjunctivePresentPerfect':
        return this.conjugatePerfect(verb, 'subjunctivePresent');
      case 'subjunctivePastPerfect':
        return this.conjugatePerfect(verb, 'subjunctiveImperfect');
      case 'subjunctiveFuturePerfect':
        return this.conjugatePerfect(verb, 'subjunctiveFuture');
      case 'presentProgressive':
        return this.conjugateProgressive(verb, 'present');
      case 'pastProgressive':
        return this.conjugateProgressive(verb, 'imperfect');
      case 'futureProgressive':
        return this.conjugateProgressive(verb, 'future');
      case 'conditionalProgressive':
        return this.conjugateProgressive(verb, 'conditional');
      default:
        return this.emptyStandard();
    }
  }

  getVerbParts(verb) {
    if (verb.endsWith('ar')) return { type: 'ar', stem: verb.slice(0, -2) };
    if (verb.endsWith('er')) return { type: 'er', stem: verb.slice(0, -2) };
    if (verb.endsWith('ir')) return { type: 'ir', stem: verb.slice(0, -2) };
    return { type: 'unknown', stem: verb };
  }

  emptyStandard() {
    return PERSONS.reduce((acc, p) => {
      acc[p] = '';
      return acc;
    }, {});
  }

  emptyImperative() {
    return IMPERATIVE_PERSONS.reduce((acc, p) => {
      acc[p] = '';
      return acc;
    }, {});
  }

  getRegularEndings(tenseId, type) {
    const endings = {
      present: {
        ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
        er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
        ir: ['o', 'es', 'e', 'imos', 'ís', 'en']
      },
      preterite: {
        ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
        er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
        ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron']
      },
      imperfect: {
        ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
        er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
        ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían']
      },
      subjunctivePresent: {
        ar: ['e', 'es', 'e', 'emos', 'éis', 'en'],
        er: ['a', 'as', 'a', 'amos', 'áis', 'an'],
        ir: ['a', 'as', 'a', 'amos', 'áis', 'an']
      },
      subjunctiveImperfect: {
        all: ['ra', 'ras', 'ra', 'ramos', 'rais', 'ran']
      },
      subjunctiveFuture: {
        all: ['re', 'res', 're', 'remos', 'reis', 'ren']
      }
    };

    if (!endings[tenseId]) return null;
    if (endings[tenseId][type]) return endings[tenseId][type];
    if (endings[tenseId].all) return endings[tenseId].all;
    return null;
  }

  conjugatePresent(verb, stem, type) {
    if (this.irregular[verb]?.present) return { ...this.irregular[verb].present };
    if (this.specialPresent[verb]) return { ...this.specialPresent[verb] };
    const endings = this.getRegularEndings('present', type);
    if (!endings) return this.emptyStandard();
    return this.applyEndings(stem, endings);
  }

  conjugatePreterite(verb, stem, type) {
    if (this.irregular[verb]?.preterite) return { ...this.irregular[verb].preterite };

    const irregularStem = this.irregularPreteriteStem[verb];
    if (irregularStem) {
      const endings = irregularStem.endsWith('j')
        ? ['e', 'iste', 'o', 'imos', 'isteis', 'eron']
        : ['e', 'iste', 'o', 'imos', 'isteis', 'ieron'];

      const forms = this.applyEndings(irregularStem, endings);
      if (verb === 'hacer') {
        forms.el = 'hizo';
      }
      return forms;
    }

    const endings = this.getRegularEndings('preterite', type);
    if (!endings) return this.emptyStandard();
    return this.applyEndings(stem, endings);
  }

  conjugateImperfect(verb, stem, type) {
    if (this.irregular[verb]?.imperfect) return { ...this.irregular[verb].imperfect };
    const endings = this.getRegularEndings('imperfect', type);
    if (!endings) return this.emptyStandard();
    return this.applyEndings(stem, endings);
  }

  conjugateFuture(verb) {
    const stem = this.irregularFutureStem[verb] || verb;
    const endings = ['é', 'ás', 'á', 'emos', 'éis', 'án'];
    return this.applyEndings(stem, endings);
  }

  conjugateConditional(verb) {
    const stem = this.irregularFutureStem[verb] || verb;
    const endings = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'];
    return this.applyEndings(stem, endings);
  }

  conjugateSubjunctivePresent(verb, stem, type) {
    if (this.irregular[verb]?.subjunctivePresent) return { ...this.irregular[verb].subjunctivePresent };

    const present = this.conjugatePresent(verb, stem, type);
    const yo = present.yo || '';
    const base = yo.endsWith('o') ? yo.slice(0, -1) : stem;

    const endings = this.getRegularEndings('subjunctivePresent', type);
    if (!endings) return this.emptyStandard();
    return this.applyEndings(base, endings);
  }

  conjugateSubjunctiveImperfect(verb, stem, type) {
    const root = this.getSubjRootFromPreteriteEllos(verb, stem, type);
    const endings = this.getRegularEndings('subjunctiveImperfect', type);
    if (!endings) return this.emptyStandard();
    return this.applyEndings(root, endings);
  }

  conjugateSubjunctiveFuture(verb, stem, type) {
    const root = this.getSubjRootFromPreteriteEllos(verb, stem, type);
    const endings = this.getRegularEndings('subjunctiveFuture', type);
    if (!endings) return this.emptyStandard();
    return this.applyEndings(root, endings);
  }

  getSubjRootFromPreteriteEllos(verb, stem, type) {
    if (verb === 'ser' || verb === 'ir') return 'fue';
    if (this.irregular[verb]?.preterite?.ellos) {
      const ellos = this.irregular[verb].preterite.ellos;
      if (ellos.endsWith('ron')) return ellos.slice(0, -3);
      return ellos;
    }

    const irregularStem = this.irregularPreteriteStem[verb];
    if (irregularStem) {
      const ellos = irregularStem + (irregularStem.endsWith('j') ? 'eron' : 'ieron');
      return ellos.slice(0, -3);
    }

    const preterite = this.conjugatePreterite(verb, stem, type);
    const ellos = preterite.ellos || '';
    if (ellos.endsWith('ron')) return ellos.slice(0, -3);
    if (ellos.endsWith('ieron')) return ellos.slice(0, -4);
    return ellos;
  }

  conjugateImperativeAffirmative(verb, stem, type) {
    if (this.irregular[verb]?.imperativeAffirmative) return { ...this.irregular[verb].imperativeAffirmative };
    const result = this.emptyImperative();

    result.tu = this.specialImperativeTu[verb] || this.conjugatePresent(verb, stem, type).el || '';

    const subj = this.conjugateSubjunctivePresent(verb, stem, type);
    result.usted = subj.el || '';
    result.nosotros = subj.nosotros || '';
    result.ustedes = subj.ellos || '';

    if (verb.endsWith('ar') || verb.endsWith('er') || verb.endsWith('ir')) {
      result.vosotros = verb.slice(0, -1) + 'd';
    }

    return result;
  }

  conjugateImperativeNegative(verb, stem, type) {
    const subj = this.conjugateSubjunctivePresent(verb, stem, type);
    return {
      tu: subj.tu || '',
      usted: subj.el || '',
      nosotros: subj.nosotros || '',
      vosotros: subj.vosotros || '',
      ustedes: subj.ellos || ''
    };
  }

  getParticiple(verb, stem, type) {
    if (this.irregular[verb]?.participle) return this.irregular[verb].participle;
    if (this.irregularParticiples[verb]) return this.irregularParticiples[verb];
    if (type === 'ar') return stem + 'ado';
    if (type === 'er' || type === 'ir') return stem + 'ido';
    return '';
  }

  getGerund(verb, stem, type) {
    if (this.irregular[verb]?.gerund) return this.irregular[verb].gerund;
    if (type === 'ar') return stem + 'ando';
    if (type === 'er' || type === 'ir') {
      const last = stem.slice(-1);
      const vowels = ['a', 'e', 'i', 'o', 'u'];
      if (vowels.includes(last)) return stem + 'yendo';
      return stem + 'iendo';
    }
    return '';
  }

  conjugatePerfect(verb, haberTenseId) {
    const haber = this.conjugate('haber', haberTenseId);
    const { stem, type } = this.getVerbParts(verb);
    const participle = this.getParticiple(verb, stem, type);
    return PERSONS.reduce((acc, p) => {
      acc[p] = (haber[p] && participle) ? `${haber[p]} ${participle}` : '';
      return acc;
    }, {});
  }

  conjugateProgressive(verb, estarTenseId) {
    const estar = this.conjugate('estar', estarTenseId);
    const { stem, type } = this.getVerbParts(verb);
    const gerund = this.getGerund(verb, stem, type);
    return PERSONS.reduce((acc, p) => {
      acc[p] = (estar[p] && gerund) ? `${estar[p]} ${gerund}` : '';
      return acc;
    }, {});
  }

  applyEndings(base, endings) {
    const result = {};
    PERSONS.forEach((p, idx) => {
      result[p] = `${base}${endings[idx]}`;
    });
    return result;
  }
}

class SpanishVerbConjugation {
  constructor() {
    // this.conjugator = new Conjugator();    
    this.conjugator = new LocalConjugatorEs();
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
