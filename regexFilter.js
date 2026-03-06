/**
 * Anti-Slop — Stage 1: Regex Filter
 *
 * Fast first-pass filter covering the most common clichés.
 * Handles pronoun variation and case-insensitive matching.
 * Returns both the cleaned text and a log of what was changed.
 */

/** @typedef {{ pattern: RegExp, replace: string | ((m: string, ...args: any[]) => string), type: string, label: string }} RegexRule */

/** @type {RegexRule[]} */
const REGEX_RULES = [
    // ── EYES ────────────────────────────────────────────────────────────────
    {
        label: 'Eyes widened',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?eyes?\s+(widened|went\s+wide|grew\s+wide|flew\s+open|snapped\s+open|popped\s+wide)\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { her: 'she blinked', his: 'he blinked', their: 'they blinked', my: 'I blinked', your: 'you blinked' };
            return map[p] || 'blinked';
        },
    },

    // ── BREATH ──────────────────────────────────────────────────────────────
    {
        label: 'Breath hitched',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?breath\s+hitched\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { her: 'she caught her breath', his: 'he caught his breath', their: 'they caught their breath', my: 'I caught my breath', your: 'you caught your breath' };
            return map[p] || 'breath caught';
        },
    },
    {
        label: 'Breath caught in throat',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?breath\s+caught\s+in\s+(her|his|their|my|your)\s+throat\b/gi,
        replace: (m, p1, p2) => {
            const p = (p1 || p2 || '').trim().toLowerCase();
            const map = { her: 'she inhaled sharply', his: 'he inhaled sharply', their: 'they inhaled sharply', my: 'I inhaled sharply', your: 'you inhaled sharply' };
            return map[p] || 'inhaled sharply';
        },
    },
    {
        label: 'Breath held (didn\'t know she was holding)',
        type: 'filler',
        pattern: /\b(let\s+out\s+a\s+breath|released?\s+(?:a\s+)?breath|exhaled?)\s+(?:she|he|they)\s+(?:hadn['']?t|didn['']?t\s+know\s+(?:she|he|they)['']?d?\s+been)\s+holding\b/gi,
        replace: 'exhaled slowly',
    },
    {
        label: 'Ragged breath',
        type: 'filler',
        pattern: /\bbreath(?:ing)?\s+(?:came\s+in\s+ragged\s+gasps?|became?\s+ragged)\b/gi,
        replace: '',
    },

    // ── HEART / PULSE ────────────────────────────────────────────────────────
    {
        label: 'Heart skipped a beat',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?heart\s+skipped\s+a\s+beat\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { her: 'her stomach dropped', his: 'his stomach dropped', their: 'their stomach dropped', my: 'my stomach dropped', your: 'your stomach dropped' };
            return map[p] || 'stomach dropped';
        },
    },
    {
        label: 'Heart hammered/pounded/raced/stuttered',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?heart\s+(hammered|pounded|raced|stuttered|leaped|clenched|ached|swelled)\b/gi,
        replace: (m, pronoun, verb) => {
            const p = (pronoun || '').trim().toLowerCase();
            const vmap = { hammered: 'knocked hard', pounded: 'beat hard', raced: 'beat fast', stuttered: 'skipped', leaped: 'jumped', clenched: 'ached', ached: 'ached', swelled: 'opened' };
            const pmap = { her: 'her heart', his: 'his heart', their: 'their heart', my: 'my heart', your: 'your heart' };
            return `${pmap[p] || 'her heart'} ${vmap[verb.toLowerCase()] || verb}`;
        },
    },
    {
        label: 'Pulse quickened/raced',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?pulse\s+(quickened|raced|spiked|jumped)\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { her: 'her heartbeat spiked', his: 'his heartbeat spiked', their: 'their heartbeat spiked', my: 'my heartbeat spiked', your: 'your heartbeat spiked' };
            return map[p] || 'heartbeat spiked';
        },
    },

    // ── KNUCKLES ─────────────────────────────────────────────────────────────
    {
        label: 'Knuckles white',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?knuckles?\s+(whitened|went\s+white|turned\s+white)\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { her: 'her grip tightened', his: 'his grip tightened', their: 'their grip tightened', my: 'my grip tightened', your: 'your grip tightened' };
            return map[p] || 'grip tightened';
        },
    },

    // ── SPINE SHIVER ─────────────────────────────────────────────────────────
    {
        label: 'Shiver down spine',
        type: 'filler',
        pattern: /\b(?:a\s+)?(?:shiver|chill)\s+ran\s+(?:down|along|up)\s+(?:her|his|their|my|your)\s+spine\b/gi,
        replace: (m) => {
            // Extract the pronoun from match
            const pronMatch = m.match(/\b(her|his|their|my|your)\b/i);
            const p = pronMatch ? pronMatch[1].toLowerCase() : 'her';
            const map = { her: 'she shivered', his: 'he shivered', their: 'they shivered', my: 'I shivered', your: 'you shivered' };
            return map[p] || 'she shivered';
        },
    },
    {
        label: 'Sent a shiver down spine',
        type: 'filler',
        pattern: /\bsent?\s+a\s+(?:shiver|chill)\s+(?:down|along|up)\s+(?:her|his|their|my|your)\s+spine\b/gi,
        replace: '',
    },

    // ── ROMANTIC EMBRACE / MELT ──────────────────────────────────────────────
    {
        label: 'Melted into embrace',
        type: 'romantic',
        pattern: /\bmelted?\s+into\s+(?:his|her|their)\s+(?:embrace|arms?)\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(his|her|their)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'his';
            const map = { his: 'leaned into him', her: 'leaned into her', their: 'leaned into them' };
            return map[p] || 'leaned into him';
        },
    },

    // ── LIPS CRASH ───────────────────────────────────────────────────────────
    {
        label: 'Lips crashed together',
        type: 'romantic',
        pattern: /\b(?:their\s+)?lips?\s+(?:crashed|collided|smashed)\s+together\b/gi,
        replace: 'they kissed',
    },
    {
        label: 'Crushed lips to',
        type: 'romantic',
        pattern: /\bcrushed?\s+(?:his|her|their)\s+lips?\s+to\s+(?:hers?|his|theirs?)\b/gi,
        replace: 'kissed',
    },
    {
        label: 'Lips met in a passionate kiss',
        type: 'romantic',
        pattern: /\blips?\s+met\s+in\s+a\s+(?:passionate|heated|desperate|hungry)\s+kiss\b/gi,
        replace: 'they kissed',
    },

    // ── HEAT IN STOMACH / BELLY ──────────────────────────────────────────────
    {
        label: 'Heat pooled in stomach/belly',
        type: 'filler',
        pattern: /\bheat\s+pooled\s+(?:low\s+)?in\s+(?:her|his|their|my|your)\s+(?:stomach|belly|core)\b/gi,
        replace: '',
    },
    {
        label: 'Warmth pooled',
        type: 'filler',
        pattern: /\bwarmth\s+pooled\s+(?:low\s+)?in\s+(?:her|his|their|my|your)\s+(?:stomach|belly|core)\b/gi,
        replace: '',
    },

    // ── CHEEKS / FLUSH ────────────────────────────────────────────────────────
    {
        label: 'Heat crept up cheeks',
        type: 'filler',
        pattern: /\bheat\s+(?:crept|rose)\s+(?:up\s+)?(?:to\s+)?(?:her|his|their|my|your)\s+cheeks?\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(her|his|their|my|your)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'her';
            const map = { her: 'her face grew warm', his: 'his face grew warm', their: 'their face grew warm', my: 'my face grew warm', your: 'your face grew warm' };
            return map[p] || 'her face grew warm';
        },
    },

    // ── TEARS ────────────────────────────────────────────────────────────────
    {
        label: 'Tears pricked/stung eyes',
        type: 'filler',
        pattern: /\btears?\s+(?:pricked|stung|burned)\s+(?:her|his|their|my|your)\s+eyes?\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(her|his|their|my|your)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'her';
            const map = { her: 'her eyes stung', his: 'his eyes stung', their: 'their eyes stung', my: 'my eyes stung', your: 'your eyes stung' };
            return map[p] || 'her eyes stung';
        },
    },
    {
        label: 'Tears welled up',
        type: 'filler',
        pattern: /\btears?\s+welled\s+(?:up|in\s+(?:her|his|their|my|your)\s+eyes?)\b/gi,
        replace: '',
    },

    // ── THROAT LUMP ──────────────────────────────────────────────────────────
    {
        label: 'Lump in throat',
        type: 'filler',
        pattern: /\ba\s+lump\s+(?:formed|rose|settled)\s+in\s+(?:her|his|their|my|your)\s+throat\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(her|his|their|my|your)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'her';
            const map = { her: 'she swallowed', his: 'he swallowed', their: 'they swallowed', my: 'I swallowed', your: 'you swallowed' };
            return map[p] || 'she swallowed';
        },
    },

    // ── ELECTRICITY / SPARKS ─────────────────────────────────────────────────
    {
        label: 'Electricity/tension crackled between them',
        type: 'romantic',
        pattern: /\b(?:electricity|tension)\s+(?:crackled|danced|hummed|sparked)\s+between\s+them\b/gi,
        replace: 'the air between them changed',
    },
    {
        label: 'Sparks flew',
        type: 'romantic',
        pattern: /\bsparks?\s+flew\b/gi,
        replace: 'there was something between them',
    },

    // ── SMILE TUGGING ─────────────────────────────────────────────────────────
    {
        label: 'Smile tugged at lips',
        type: 'filler',
        pattern: /\ba?\s*(?:small|slight|faint|ghost\s+of\s+a)?\s*smile\s+tugged?\s+(?:at\s+)?(?:the\s+corners?\s+of\s+)?(?:her|his|their|my|your)\s+lips?\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(her|his|their|my|your)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'her';
            const map = { her: 'she smiled', his: 'he smiled', their: 'they smiled', my: 'I smiled', your: 'you smiled' };
            return map[p] || 'she smiled';
        },
    },
    {
        label: 'Ghost of a smile/smirk',
        type: 'filler',
        pattern: /\ba\s+ghost\s+of\s+a\s+(?:smile|smirk)\s+played?\s+(?:on|across)\s+(?:her|his|their|my|your)\s+lips?\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(her|his|their|my|your)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'her';
            const map = { her: 'she almost smiled', his: 'he almost smiled', their: 'they almost smiled', my: 'I almost smiled', your: 'you almost smiled' };
            return map[p] || 'she almost smiled';
        },
    },

    // ── EMOTION FLOOD ────────────────────────────────────────────────────────
    {
        label: 'Emotion flood/wave/kaleidoscope',
        type: 'filler',
        pattern: /\b(?:a\s+)?(?:wave|flood|rush|swirl|kaleidoscope|tapestry|maelstrom|torrent|surge)\s+of\s+(?:emotions?|feelings?)\b/gi,
        replace: '',
    },
    {
        label: 'Emotions she couldn\'t name',
        type: 'filler',
        pattern: /\bemotions?\s+(?:she|he|they)\s+couldn['']?t\s+(?:quite\s+)?name\b/gi,
        replace: '',
    },

    // ── WORLD FADING ─────────────────────────────────────────────────────────
    {
        label: 'Time stood still / world fell away',
        type: 'filler',
        pattern: /\b(?:time\s+(?:seemed\s+to\s+stop|stood\s+still)|the\s+world\s+fell\s+away|everything\s+else\s+faded\s+away|the\s+rest\s+of\s+the\s+world\s+(?:faded|ceased))\b/gi,
        replace: '',
    },

    // ── HAIR RAKE ────────────────────────────────────────────────────────────
    {
        label: 'Ran/raked hand through hair',
        type: 'filler',
        pattern: /\b(?:ran|raked|dragged|pushed)\s+(?:a\s+)?(?:hand|fingers?)\s+through\s+(?:his|her|their|my|your)\s+hair\b/gi,
        replace: '',
    },

    // ── SOMETHING FLICKERED ──────────────────────────────────────────────────
    {
        label: 'Something flickered/shifted in eyes/expression',
        type: 'filler',
        pattern: /\bsomething\s+(?:flickered|shifted|crossed|passed|moved|stirred)\s+(?:in|across|over)\s+(?:her|his|their|my|your)\s+(?:eyes?|face|expression|features?)\b/gi,
        replace: '',
    },

    // ── WARMTH BLOOMING ──────────────────────────────────────────────────────
    {
        label: 'Warmth/ache bloomed in chest',
        type: 'filler',
        pattern: /\b(?:warmth|heat|ache|something)\s+bloomed\s+(?:in|within|through)\s+(?:her|his|their|my|your)\s+(?:chest|heart|belly|stomach)\b/gi,
        replace: '',
    },

    // ── VEIN ADRENALINE ──────────────────────────────────────────────────────
    {
        label: 'Adrenaline/fire/ice in veins',
        type: 'filler',
        pattern: /\b(?:adrenaline\s+surged?\s+through|(?:fire|ice|heat|cold)\s+(?:flooded?|spread|ran|coursed?|burned?)\s+through)\s+(?:her|his|their|my|your)\s+veins?\b/gi,
        replace: '',
    },
    {
        label: 'Blood ran cold / boiled',
        type: 'neutral',
        pattern: /\b(?:her|his|their|my|your)\s+blood\s+(?:ran|turned|went)\s+(?:cold|to\s+ice)\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(her|his|their|my|your)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'her';
            const map = { her: 'a chill moved through her', his: 'a chill moved through him', their: 'a chill moved through them', my: 'a chill moved through me', your: 'a chill moved through you' };
            return map[p] || 'a chill moved through her';
        },
    },

    // ── MISC FILLER ──────────────────────────────────────────────────────────
    {
        label: 'Couldn\'t help but',
        type: 'filler',
        pattern: /\bcouldn['']?t\s+help\s+but\s+(smile|laugh|stare|grin|cry|gasp)\b/gi,
        replace: (m, verb) => verb,
    },
    {
        label: 'Gasp escaped lips',
        type: 'filler',
        pattern: /\b(?:a\s+)?(?:sharp\s+)?(?:gasp|sigh|moan|whimper)\s+escaped?\s+(?:her|his|their|my|your)\s+lips?\b/gi,
        replace: '',
    },
    {
        label: 'In that moment/instant',
        type: 'filler',
        pattern: /\bin\s+that\s+(?:very\s+)?(?:moment|instant)\b/gi,
        replace: 'then',
    },
    {
        label: 'Intoxicating scent',
        type: 'romantic',
        pattern: /\b(?:his|her|their)\s+intoxicating\s+(?:scent|smell|fragrance|aroma)\b/gi,
        replace: '',
    },
    {
        label: 'Breathed in scent',
        type: 'romantic',
        pattern: /\bbreathed?\s+in\s+(?:his|her|their)\s+(?:scent|smell|fragrance|aroma)\b/gi,
        replace: '',
    },
    {
        label: 'Deafening silence',
        type: 'filler',
        pattern: /\bdeafening\s+silence\b/gi,
        replace: 'the silence',
    },
    {
        label: 'Pregnant pause',
        type: 'filler',
        pattern: /\bpregnant\s+pause\b/gi,
        replace: 'a pause',
    },
    {
        label: 'Drowning in eyes',
        type: 'romantic',
        pattern: /\bdrowning?\s+in\s+(?:his|her|their)\s+eyes?\b/gi,
        replace: (m) => {
            const pMatch = m.match(/\b(his|her|their)\b/i);
            const p = pMatch ? pMatch[1].toLowerCase() : 'his';
            const map = { his: 'looking into his eyes', her: 'looking into her eyes', their: 'looking into their eyes' };
            return map[p] || 'looking into his eyes';
        },
    },
];

/**
 * Apply all regex rules to the text.
 * @param {string} text
 * @param {{ enabledTypes?: string[], dryRun?: boolean }} [opts]
 * @returns {{ text: string, log: Array<{label: string, type: string, original: string, replacement: string}> }}
 */
export function applyRegexFilter(text, opts = {}) {
    const enabledTypes = opts.enabledTypes || ['neutral', 'romantic', 'filler'];
    const log = [];
    let result = text;

    for (const rule of REGEX_RULES) {
        if (!enabledTypes.includes(rule.type)) continue;

        result = result.replace(rule.pattern, (...args) => {
            const original = args[0];
            let replacement;
            if (typeof rule.replace === 'function') {
                replacement = rule.replace(...args);
            } else {
                replacement = rule.replace;
            }
            if (original.toLowerCase() !== replacement.toLowerCase()) {
                log.push({ label: rule.label, type: rule.type, original, replacement });
            }
            return replacement;
        });
    }

    return { text: result, log };
}

export { REGEX_RULES };
