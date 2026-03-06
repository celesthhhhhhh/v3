/**
 * Anti-Slop — Stage 4 + 5: Slop Classification & Rewrite Engine
 *
 * Given a detected slop phrase and its type, decides how to handle it:
 *   neutral  → synonym replacement
 *   filler   → remove or replace with a simpler alternative
 *   romantic → rewrite the whole sentence
 *
 * The engine works at sentence level. For filler/romantic slop it may
 * return an empty string (sentence removed) or a rewritten sentence.
 */

// ── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Capitalise the first character of a string.
 * @param {string} s
 * @returns {string}
 */
function cap(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── SYNONYM REPLACEMENT ───────────────────────────────────────────────────────

/**
 * Try to find a synonym for the matched phrase and splice it into the sentence.
 *
 * @param {string} sentence
 * @param {string} matchedPhrase
 * @param {Record<string, string[][]>} synonymDb   - synonyms.json data
 * @param {string} type
 * @returns {string | null}   null = no synonym found
 */
export function replaceBySynonym(sentence, matchedPhrase, synonymDb, type) {
    const typeDb = synonymDb[type];
    if (!typeDb) return null;

    // Try exact match first
    const key = matchedPhrase.toLowerCase();
    let options = typeDb[key];

    // Fallback: try without pronoun prefix
    if (!options) {
        const stripped = key.replace(/^(her|his|their|my|your)\s+/, '');
        options = typeDb[stripped];
    }

    if (!options || options.length === 0) return null;

    const replacement = pick(options);

    // Empty string = delete the phrase from the sentence
    if (replacement === '') {
        const cleaned = sentence
            .replace(new RegExp(escapeRegex(matchedPhrase), 'gi'), '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        return cleaned || null;
    }

    // Try to splice the replacement into the sentence in place of the matched phrase
    const spliced = sentence.replace(
        new RegExp(escapeRegex(matchedPhrase), 'i'),
        replacement,
    );

    // Preserve original capitalisation of the sentence start
    return spliced.charAt(0) !== sentence.charAt(0)
        ? cap(spliced)
        : spliced;
}

// ── FILLER REMOVAL ────────────────────────────────────────────────────────────

/**
 * Remove a filler phrase from a sentence.
 * If the sentence consists entirely of the filler phrase, returns empty string.
 *
 * @param {string} sentence
 * @param {string} matchedPhrase
 * @returns {string}
 */
export function removeFiller(sentence, matchedPhrase) {
    const stripped = sentence
        .replace(new RegExp(`[,;\\s]*${escapeRegex(matchedPhrase)}[,;\\s]*`, 'gi'), ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Dangling punctuation or just punctuation left over
    const cleaned = stripped.replace(/^[,;:\s]+|[,;:\s]+$/g, '').trim();
    return cleaned;
}

// ── ROMANTIC / NEUTRAL REWRITE TEMPLATES ─────────────────────────────────────

/**
 * Template-based rewrite rules.
 * Each rule matches a sentence pattern and returns a rewritten version.
 *
 * @type {Array<{pattern: RegExp, rewrite: (m: RegExpMatchArray) => string}>}
 */
const REWRITE_TEMPLATES = [
    // "She/He melted into his/her arms/embrace"
    {
        pattern: /^(she|he|they)\s+melted?\s+into\s+(his|her|their)\s+(?:arms?|embrace)\.?$/i,
        rewrite: ([, subj, obj]) => {
            const maps = {
                she: ['she leaned into him', 'she pressed herself against him', 'she let him hold her'],
                he: ['he leaned into her', 'he pressed himself against her', 'he let her hold him'],
                they: ['they leaned into each other', 'they held each other'],
            };
            return cap(pick(maps[subj.toLowerCase()] || maps.she)) + '.';
        },
    },
    // "Their/Her/His lips crashed/collided together"
    {
        pattern: /^(?:their\s+)?lips?\s+(?:crashed|collided|smashed)\s+together\.?$/i,
        rewrite: () => pick(['They kissed.', 'She kissed him.', 'He kissed her.']),
    },
    // "X and Y's lips met / their lips met"
    {
        pattern: /^(?:their|(?:his|her)\s+and\s+(?:his|her))\s+lips?\s+met\b.*$/i,
        rewrite: () => pick(['They kissed.', 'She leaned in and kissed him.', 'He closed the distance between them.']),
    },
    // "Electricity crackled between them"
    {
        pattern: /\belectricity\s+(?:crackled|hummed|danced)\s+between\s+them\b/i,
        rewrite: () => pick([
            'Something had shifted between them.',
            'The air between them felt different.',
            'Neither of them spoke.',
        ]),
    },
];

/**
 * Try template-based rewrite for a sentence.
 * @param {string} sentence
 * @returns {string | null}
 */
export function rewriteByTemplate(sentence) {
    for (const { pattern, rewrite } of REWRITE_TEMPLATES) {
        const m = sentence.match(pattern);
        if (m) return rewrite(m);
    }
    return null;
}

// ── MASTER DISPATCH ───────────────────────────────────────────────────────────

/**
 * Process a single sentence that has been flagged as containing slop.
 *
 * @param {string} sentence
 * @param {string} matchedPhrase   - The specific slop phrase detected
 * @param {string} slopType        - 'neutral' | 'filler' | 'romantic'
 * @param {'replace' | 'remove' | 'rewrite'} preferredAction
 * @param {Record<string, string[][]>} synonymDb
 * @returns {string}  The processed sentence (may be empty string to delete)
 */
export function processSentence(sentence, matchedPhrase, slopType, preferredAction, synonymDb) {
    // 1. Try template rewrite for romantic/known patterns first
    if (slopType === 'romantic' || preferredAction === 'rewrite') {
        const tpl = rewriteByTemplate(sentence);
        if (tpl !== null) return tpl;
    }

    // 2. Try synonym replacement
    const syn = replaceBySynonym(sentence, matchedPhrase, synonymDb, slopType);
    if (syn !== null) return syn;

    // 3. Filler: remove the phrase from the sentence
    if (slopType === 'filler' || preferredAction === 'remove') {
        return removeFiller(sentence, matchedPhrase);
    }

    // 4. Neutral fallback: return as-is (phrase regex pass already handled it)
    return sentence;
}

// ── UTILITY ──────────────────────────────────────────────────────────────────

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
