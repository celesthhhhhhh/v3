/**
 * Anti-Slop Extension for SillyTavern — BUNDLED SINGLE FILE
 *
 * All modules are inlined here to prevent the "[object Event]" load failure
 * that occurs when SillyTavern's script loader can't resolve ES sub-module imports.
 */

import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── REGEX FILTER (inlined from modules/regexFilter.js) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const REGEX_RULES = [
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
        label: "Breath held (didn't know she was holding)",
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
    {
        label: 'Heart skipped / leaped / stuttered',
        type: 'romantic',
        pattern: /\b((?:her|his|their|my|your)\s+)?heart\s+(skipped?|leaped?|stuttered?|did\s+a\s+flip|flipped?|hammered?|pounded?|raced?|thudded?|lurched?|clenched?|squeezed?)\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const subj = { her: 'she', his: 'he', their: 'they', my: 'I', your: 'you' };
            const s = subj[p];
            if (!s) return 'felt a jolt';
            const opts = [`${s} felt a flutter`, `${s} felt a sudden warmth`, `${s} paused`];
            return opts[Math.floor(Math.random() * opts.length)];
        },
    },
    {
        label: 'Pulse quickened',
        type: 'romantic',
        pattern: /\b((?:her|his|their|my|your)\s+)?pulse\s+(?:quickened?|raced?|pounded?|sped\s+up)\b/gi,
        replace: '',
    },
    {
        label: 'Cheeks flushed / burned',
        type: 'neutral',
        pattern: /\b((?:her|his|their|my|your)\s+)?cheeks?\s+(?:flushed?|burned?|reddened?|turned?\s+red|grew\s+hot|felt?\s+hot|heated?)\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { her: 'she felt warm', his: 'he felt warm', their: 'they felt warm', my: 'I felt warm', your: 'you felt warm' };
            return map[p] || 'felt a flush';
        },
    },
    {
        label: 'Butterflies in stomach',
        type: 'romantic',
        pattern: /\bbutterflies?\s+(?:in|fluttering\s+in|filled?)\s+((?:her|his|their|my|your)\s+)?stomach\b/gi,
        replace: 'a nervous flutter',
    },
    {
        label: 'Stomach flipped / dropped / knotted',
        type: 'romantic',
        pattern: /\b((?:her|his|their|my|your)\s+)?stomach\s+(?:flipped?|dropped?|knotted?|twisted?|did\s+a\s+flip|sank)\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { her: 'she felt uneasy', his: 'he felt uneasy', their: 'they felt uneasy', my: 'I felt uneasy', your: 'you felt uneasy' };
            return map[p] || 'felt uneasy';
        },
    },
    {
        label: 'Electricity / spark between them',
        type: 'romantic',
        pattern: /\b(?:electricity|sparks?|tension)\s+(?:crackled?|hummed?|danced?|buzzed?|snapped?|coursed?|shot)\s+(?:through|between|across)\s+(?:them|the\s+(?:air|room|space)|(?:her|his|their)\s+(?:skin|body|veins?))\b/gi,
        replace: '',
    },
    {
        label: 'Lips crashed / collided',
        type: 'romantic',
        pattern: /\blips?\s+(?:crashed?|collided?|smashed?)\s+(?:together|against)\b/gi,
        replace: 'kissed',
    },
    {
        label: 'Lips met',
        type: 'romantic',
        pattern: /\b(?:their|(?:his|her)\s+and\s+(?:his|her))\s+lips?\s+met\b/gi,
        replace: 'they kissed',
    },
    {
        label: 'Melted into arms',
        type: 'romantic',
        pattern: /\bmelted?\s+into\s+((?:his|her|their)\s+)?(?:arms?|embrace)\b/gi,
        replace: (m, pronoun) => {
            const p = (pronoun || '').trim().toLowerCase();
            const map = { his: 'leaned into him', her: 'leaned into her', their: 'leaned into them' };
            return map[p] || 'leaned in';
        },
    },
    {
        label: 'Smirk / smirking',
        type: 'neutral',
        pattern: /\bsmirk(?:ed|ing|s)?\b/gi,
        replace: (m) => {
            if (m.endsWith('ed')) return 'smiled';
            if (m.endsWith('ing')) return 'smiling';
            if (m.endsWith('s')) return 'smiles';
            return 'smile';
        },
    },
    {
        label: 'Quirked an eyebrow / lip',
        type: 'neutral',
        pattern: /\bquirked?\s+(?:an?\s+)?(?:eyebrow|brow|lip)\b/gi,
        replace: 'raised an eyebrow',
    },
    {
        label: 'Tension you could cut with a knife',
        type: 'filler',
        pattern: /\btension\s+(?:you\s+could|thick\s+enough\s+to|that\s+(?:you\s+could|could\s+be))\s+(?:cut|slice)\s+(?:with\s+a\s+knife|through)\b/gi,
        replace: 'tension',
    },
    {
        label: 'Thick with tension',
        type: 'filler',
        pattern: /\b(?:thick|heavy|charged)\s+with\s+(?:unspoken\s+)?tension\b/gi,
        replace: 'tense',
    },
    {
        label: 'Time stood still / froze',
        type: 'filler',
        pattern: /\btime\s+(?:stood\s+still|froze?|seemed?\s+to\s+stop|came?\s+to\s+a\s+(?:stand)?still)\b/gi,
        replace: '',
    },
    {
        label: 'World fell away / faded',
        type: 'filler',
        pattern: /\b(?:the\s+)?world\s+(?:fell?|faded?|melted?|dropped?)\s+away\b/gi,
        replace: '',
    },
    {
        label: 'Heaved a sigh / long-suffering sigh',
        type: 'filler',
        pattern: /\b(?:heaved?|let\s+out|gave?|released?)\s+a?\s*(?:long-suffering\s+|heavy\s+|soft\s+|slow\s+)?sigh\b/gi,
        replace: 'sighed',
    },
    {
        label: 'Nodded slowly',
        type: 'filler',
        pattern: /\bnodded?\s+slowly\b/gi,
        replace: 'nodded',
    },
    {
        label: 'Shrugged nonchalantly / casually',
        type: 'filler',
        pattern: /\bshrugged?\s+(?:nonchalantly|casually|indifferently)\b/gi,
        replace: 'shrugged',
    },
    {
        label: 'Chuckled / chuckle',
        type: 'neutral',
        pattern: /\bchuckled?\b/gi,
        replace: 'laughed softly',
    },
    {
        label: 'Let out a laugh',
        type: 'filler',
        pattern: /\blet\s+out\s+a\s+(?:soft\s+|small\s+|short\s+)?(?:laugh|chuckle|giggle)\b/gi,
        replace: 'laughed',
    },
    {
        label: 'For what felt like an eternity',
        type: 'filler',
        pattern: /\bfor\s+what\s+(?:felt?|seemed?)\s+like\s+(?:an?\s+)?eternity\b/gi,
        replace: 'for a long moment',
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

function applyRegexFilter(text, opts = {}) {
    const enabledTypes = opts.enabledTypes || ['neutral', 'romantic', 'filler'];
    const log = [];
    let result = text;
    for (const rule of REGEX_RULES) {
        if (!enabledTypes.includes(rule.type)) continue;
        result = result.replace(rule.pattern, (...args) => {
            const original = args[0];
            const replacement = typeof rule.replace === 'function' ? rule.replace(...args) : rule.replace;
            if (original.toLowerCase() !== replacement.toLowerCase()) {
                log.push({ label: rule.label, type: rule.type, original, replacement });
            }
            return replacement;
        });
    }
    return { text: result, log };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── SENTENCE SPLITTER (inlined from modules/sentenceSplitter.js) ────────────
// ═══════════════════════════════════════════════════════════════════════════════

function splitSentences(text) {
    if (!text || !text.trim()) return [];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
            return [...segmenter.segment(text)]
                .map((seg, i) => ({ text: seg.segment.trim(), delimiter: '', index: i }))
                .filter(s => s.text.length > 0);
        } catch (_) { /* fall through */ }
    }
    const segments = [];
    const raw = text.split(/(?<=[.!?…])\s+(?=[A-Z*"'])/);
    for (let i = 0; i < raw.length; i++) {
        const sentence = raw[i].trim();
        if (sentence.length > 0) {
            segments.push({ text: sentence, delimiter: i < raw.length - 1 ? ' ' : '', index: i });
        }
    }
    if (segments.length === 0 && text.trim().length > 0) {
        segments.push({ text: text.trim(), delimiter: '', index: 0 });
    }
    return segments;
}

function joinSegments(segments) {
    return segments
        .filter(s => s.text.trim().length > 0)
        .map(s => s.text.trim())
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── EMBEDDING ENGINE (inlined from modules/embeddingEngine.js) ──────────────
// ═══════════════════════════════════════════════════════════════════════════════

const NGRAM_SIZE = 3;
const embeddingCache = new Map();

function computeNgramVector(text) {
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const vec = {};
    for (let i = 0; i <= normalized.length - NGRAM_SIZE; i++) {
        const gram = normalized.slice(i, i + NGRAM_SIZE);
        vec[gram] = (vec[gram] || 0) + 1;
    }
    return vec;
}

function vecNorm(vec) {
    let sum = 0;
    for (const v of Object.values(vec)) sum += v * v;
    return Math.sqrt(sum);
}

function cosineSimilarity(a, b) {
    let dot = 0;
    for (const [k, v] of Object.entries(a)) { if (b[k]) dot += v * b[k]; }
    const denom = vecNorm(a) * vecNorm(b);
    return denom === 0 ? 0 : dot / denom;
}

function computeEmbedding(text) {
    if (embeddingCache.has(text)) return embeddingCache.get(text);
    const vec = computeNgramVector(text);
    embeddingCache.set(text, vec);
    return vec;
}

function findSlopSimilarity(sentence, slopPhrases, threshold = 0.82) {
    const sentenceVec = computeEmbedding(sentence);
    let bestScore = 0, bestPhrase = null, bestType = null;
    for (const { text, type, weight } of slopPhrases) {
        const raw = cosineSimilarity(sentenceVec, computeEmbedding(text));
        const weighted = raw * (weight || 1.0);
        if (weighted > bestScore) { bestScore = weighted; bestPhrase = text; bestType = type; }
    }
    return { matched: bestScore >= threshold, phrase: bestPhrase, type: bestType, score: bestScore };
}

function prewarmCache(phrases) {
    for (const { text } of phrases) computeEmbedding(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── VECTOR SEARCH (inlined from modules/vectorSearch.js) ───────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function buildClusterCentroids(clusters) {
    const centroids = new Map();
    for (const cluster of clusters) {
        const centroid = {};
        for (const phrase of cluster.phrases) {
            const vec = computeEmbedding(phrase);
            for (const [k, v] of Object.entries(vec)) centroid[k] = (centroid[k] || 0) + v;
        }
        const n = cluster.phrases.length;
        for (const k in centroid) centroid[k] /= n;
        centroids.set(cluster.id, centroid);
    }
    return centroids;
}

function searchClusters(sentence, clusters, centroids, clusterThreshold = 0.70, memberThreshold = 0.78) {
    const sentVec = computeEmbedding(sentence);
    let bestCluster = null, bestCentroidScore = 0;
    for (const cluster of clusters) {
        const centroid = centroids.get(cluster.id);
        if (!centroid) continue;
        let dot = 0, na = 0, nb = 0;
        for (const [k, v] of Object.entries(sentVec)) { if (centroid[k]) dot += v * centroid[k]; na += v * v; }
        for (const v of Object.values(centroid)) nb += v * v;
        const score = (Math.sqrt(na) * Math.sqrt(nb)) === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
        if (score > bestCentroidScore) { bestCentroidScore = score; bestCluster = cluster; }
    }
    if (bestCentroidScore < clusterThreshold || !bestCluster) {
        return { matched: false, cluster: null, score: bestCentroidScore, matchedPhrase: null };
    }
    const phrasesAsObjects = bestCluster.phrases.map(text => ({ text, type: bestCluster.type, weight: 1.0 }));
    const fine = findSlopSimilarity(sentence, phrasesAsObjects, memberThreshold);
    return { matched: fine.matched, cluster: bestCluster, score: fine.score, matchedPhrase: fine.phrase };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── REWRITE ENGINE (inlined from modules/rewriteEngine.js) ─────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const REWRITE_TEMPLATES = [
    {
        pattern: /^(she|he|they)\s+melted?\s+into\s+(his|her|their)\s+(?:arms?|embrace)\.?$/i,
        rewrite: ([, subj]) => {
            const maps = {
                she: ['she leaned into him', 'she pressed herself against him', 'she let him hold her'],
                he: ['he leaned into her', 'he pressed himself against her', 'he let her hold him'],
                they: ['they leaned into each other', 'they held each other'],
            };
            return cap(pick(maps[subj.toLowerCase()] || maps.she)) + '.';
        },
    },
    {
        pattern: /^(?:their\s+)?lips?\s+(?:crashed|collided|smashed)\s+together\.?$/i,
        rewrite: () => pick(['They kissed.', 'She kissed him.', 'He kissed her.']),
    },
    {
        pattern: /^(?:their|(?:his|her)\s+and\s+(?:his|her))\s+lips?\s+met\b.*$/i,
        rewrite: () => pick(['They kissed.', 'She leaned in and kissed him.', 'He closed the distance between them.']),
    },
    {
        pattern: /\belectricity\s+(?:crackled|hummed|danced)\s+between\s+them\b/i,
        rewrite: () => pick(['Something had shifted between them.', 'The air between them felt different.', 'Neither of them spoke.']),
    },
];

function replaceBySynonym(sentence, matchedPhrase, synonymDb, type) {
    const typeDb = synonymDb[type];
    if (!typeDb) return null;
    const key = matchedPhrase.toLowerCase();
    let options = typeDb[key];
    if (!options) options = typeDb[key.replace(/^(her|his|their|my|your)\s+/, '')];
    if (!options || options.length === 0) return null;
    const replacement = pick(options);
    if (replacement === '') {
        const cleaned = sentence.replace(new RegExp(escapeRegex(matchedPhrase), 'gi'), '').replace(/\s{2,}/g, ' ').trim();
        return cleaned || null;
    }
    const spliced = sentence.replace(new RegExp(escapeRegex(matchedPhrase), 'i'), replacement);
    return spliced.charAt(0) !== sentence.charAt(0) ? cap(spliced) : spliced;
}

function removeFiller(sentence, matchedPhrase) {
    return sentence
        .replace(new RegExp(`[,;\\s]*${escapeRegex(matchedPhrase)}[,;\\s]*`, 'gi'), ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .replace(/^[,;:\s]+|[,;:\s]+$/g, '')
        .trim();
}

function processSentence(sentence, matchedPhrase, slopType, preferredAction, synonymDb) {
    if (slopType === 'romantic' || preferredAction === 'rewrite') {
        for (const { pattern, rewrite } of REWRITE_TEMPLATES) {
            const m = sentence.match(pattern);
            if (m) return rewrite(m);
        }
    }
    const syn = replaceBySynonym(sentence, matchedPhrase, synonymDb, slopType);
    if (syn !== null) return syn;
    if (slopType === 'filler' || preferredAction === 'remove') return removeFiller(sentence, matchedPhrase);
    return sentence;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN EXTENSION ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function detectExtensionName() {
    try {
        const url = new URL(import.meta.url);
        const parts = url.pathname.split('/').filter(Boolean);
        const idx = parts.lastIndexOf('third-party');
        if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    } catch (_) { /* ignore */ }
    return 'AntiSlop';
}

const EXTENSION_NAME = detectExtensionName();
const LOG_PREFIX = '[AntiSlop]';
const EXT_PATH = `scripts/extensions/third-party/${EXTENSION_NAME}`;

const DEFAULT_SETTINGS = {
    enabled: true,
    stageRegex: true,
    stageSimilarity: true,
    stageClusters: true,
    typeNeutral: true,
    typeRomantic: true,
    typeFiller: true,
    defaultAction: 'replace',
    threshold: 82,
    debug: false,
};

let settings = { ...DEFAULT_SETTINGS };
let slopPhrases = [];
let synonymDb = {};
let clusters = [];
let clusterCentroids = new Map();
let dataReady = false;
const stats = { replacements: 0, messages: 0 };

async function loadData() {
    try {
        const [phrasesRes, synonymsRes, clustersRes] = await Promise.all([
            fetch(`/${EXT_PATH}/data/slop_phrases.json`),
            fetch(`/${EXT_PATH}/data/synonyms.json`),
            fetch(`/${EXT_PATH}/data/clusters.json`),
        ]);
        if (!phrasesRes.ok || !synonymsRes.ok || !clustersRes.ok) {
            throw new Error('One or more data files failed to load.');
        }
        slopPhrases = (await phrasesRes.json()).phrases || [];
        synonymDb = await synonymsRes.json();
        clusters = (await clustersRes.json()).clusters || [];
        prewarmCache(slopPhrases);
        clusterCentroids = buildClusterCentroids(clusters);
        dataReady = true;
        const el = document.getElementById('anti-slop-stat-phrases');
        if (el) el.textContent = slopPhrases.length;
        console.log(`${LOG_PREFIX} Loaded ${slopPhrases.length} phrases, ${clusters.length} clusters.`);
    } catch (err) {
        console.error(`${LOG_PREFIX} Failed to load data files:`, err);
    }
}

function runPipeline(text) {
    if (!text || !text.trim()) return { text, changeCount: 0, log: [] };
    const log = [];
    const enabledTypes = [];
    if (settings.typeNeutral) enabledTypes.push('neutral');
    if (settings.typeRomantic) enabledTypes.push('romantic');
    if (settings.typeFiller) enabledTypes.push('filler');
    if (enabledTypes.length === 0) return { text, changeCount: 0, log: [] };

    let working = text;
    let changeCount = 0;
    const threshold = settings.threshold / 100;

    if (settings.stageRegex) {
        const { text: regexed, log: rLog } = applyRegexFilter(working, { enabledTypes });
        if (regexed !== working) {
            changeCount += rLog.length;
            working = regexed;
            if (settings.debug) rLog.forEach(e => log.push(`[Regex/${e.type}] "${e.original}" → "${e.replacement}"`));
        }
    }

    if ((settings.stageSimilarity || settings.stageClusters) && dataReady) {
        const segments = splitSentences(working);
        for (const seg of segments) {
            const sentence = seg.text;
            if (sentence.length < 8) continue;
            let matched = false, phrase = null, slopType = null, action = settings.defaultAction;

            if (settings.stageSimilarity && !matched) {
                const filtered = slopPhrases.filter(p => enabledTypes.includes(p.type));
                if (filtered.length > 0) {
                    const r = findSlopSimilarity(sentence, filtered, threshold);
                    if (r.matched) { matched = true; phrase = r.phrase; slopType = r.type; }
                }
            }
            if (settings.stageClusters && !matched) {
                const fc = clusters.filter(c => enabledTypes.includes(c.type));
                if (fc.length > 0) {
                    const cr = searchClusters(sentence, fc, clusterCentroids, 0.70, threshold);
                    if (cr.matched && cr.cluster) {
                        matched = true;
                        phrase = cr.matchedPhrase || cr.cluster.phrases[0];
                        slopType = cr.cluster.type;
                        action = cr.cluster.action || action;
                    }
                }
            }
            if (matched && phrase && slopType) {
                const rewritten = processSentence(sentence, phrase, slopType, action, synonymDb);
                if (rewritten !== sentence) {
                    seg.text = rewritten;
                    changeCount++;
                    if (settings.debug) log.push(`[Sim/${slopType}] "${sentence}" → "${rewritten}"`);
                }
            }
        }
        working = joinSegments(segments);
    }

    return { text: working, changeCount, log };
}

async function onCharacterMessageRendered(messageId) {
    if (!settings.enabled) return;
    try {
        const context = getContext();
        if (!context?.chat) return;
        const message = context.chat[messageId];
        if (!message || message.is_user || message.is_system) return;
        const original = message.mes;
        if (!original?.trim()) return;

        const { text: cleaned, changeCount, log } = runPipeline(original);
        if (changeCount === 0) return;

        message.mes = cleaned;
        const mesEl = document.querySelector(`.mes[mesid="${messageId}"] .mes_text`);
        if (mesEl) {
            if (typeof context.messageFormatting === 'function') {
                mesEl.innerHTML = context.messageFormatting(cleaned, message.name, false, false, messageId);
            } else {
                mesEl.innerHTML = cleaned.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
            }
        }
        saveSettingsDebounced();
        stats.replacements += changeCount;
        stats.messages++;
        updateStatsUI();
        if (settings.debug) {
            console.group(`${LOG_PREFIX} Msg ${messageId} — ${changeCount} change(s)`);
            log.forEach(l => console.log(l));
            console.groupEnd();
        } else {
            console.log(`${LOG_PREFIX} Cleaned msg ${messageId}: ${changeCount} replacement(s).`);
        }
    } catch (err) {
        console.error(`${LOG_PREFIX} Pipeline error:`, err);
    }
}

function loadSettings() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    settings = Object.assign({}, DEFAULT_SETTINGS, extension_settings[EXTENSION_NAME]);
}

function saveSettings() {
    extension_settings[EXTENSION_NAME] = { ...settings };
    saveSettingsDebounced();
}

function updateStatsUI() {
    const t = document.getElementById('anti-slop-stat-total');
    const m = document.getElementById('anti-slop-stat-messages');
    if (t) t.textContent = stats.replacements;
    if (m) m.textContent = stats.messages;
}

function syncUIFromSettings() {
    const check = (id, val) => { const e = document.getElementById(id); if (e) e.checked = val; };
    const val   = (id, v)   => { const e = document.getElementById(id); if (e) e.value   = String(v); };
    check('anti-slop-enabled',          settings.enabled);
    check('anti-slop-stage-regex',      settings.stageRegex);
    check('anti-slop-stage-similarity', settings.stageSimilarity);
    check('anti-slop-stage-clusters',   settings.stageClusters);
    check('anti-slop-type-neutral',     settings.typeNeutral);
    check('anti-slop-type-romantic',    settings.typeRomantic);
    check('anti-slop-type-filler',      settings.typeFiller);
    check('anti-slop-debug',            settings.debug);
    val('anti-slop-threshold',          settings.threshold);
    const td = document.getElementById('anti-slop-threshold-display');
    if (td) td.textContent = settings.threshold;
    const r = document.querySelector(`input[name="anti-slop-action"][value="${settings.defaultAction}"]`);
    if (r) r.checked = true;
    const body = document.querySelector('.anti-slop-body');
    if (body) body.classList.toggle('is-disabled', !settings.enabled);
}

function bindUIEvents() {
    const onCheck = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            settings[key] = el.checked;
            saveSettings();
            if (key === 'enabled') {
                const body = document.querySelector('.anti-slop-body');
                if (body) body.classList.toggle('is-disabled', !settings.enabled);
            }
        });
    };
    const onRange = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            settings[key] = Number(el.value);
            saveSettings();
            const d = document.getElementById(`${id}-display`);
            if (d) d.textContent = el.value;
        });
    };
    onCheck('anti-slop-enabled',          'enabled');
    onCheck('anti-slop-stage-regex',      'stageRegex');
    onCheck('anti-slop-stage-similarity', 'stageSimilarity');
    onCheck('anti-slop-stage-clusters',   'stageClusters');
    onCheck('anti-slop-type-neutral',     'typeNeutral');
    onCheck('anti-slop-type-romantic',    'typeRomantic');
    onCheck('anti-slop-type-filler',      'typeFiller');
    onCheck('anti-slop-debug',            'debug');
    onRange('anti-slop-threshold',        'threshold');
    document.querySelectorAll('input[name="anti-slop-action"]').forEach(r => {
        r.addEventListener('change', () => { if (r.checked) { settings.defaultAction = r.value; saveSettings(); } });
    });
    const resetBtn = document.getElementById('anti-slop-reset-stats');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => { stats.replacements = 0; stats.messages = 0; updateStatsUI(); });
    }
}

async function injectSettingsPanel() {
    try {
        const res = await fetch(`/${EXT_PATH}/settings.html`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const container = document.getElementById('extensions_settings');
        if (!container) { console.warn(`${LOG_PREFIX} #extensions_settings not found.`); return; }
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        container.appendChild(wrapper);
    } catch (err) {
        console.error(`${LOG_PREFIX} Could not load settings.html:`, err);
    }
}

async function init() {
    console.log(`${LOG_PREFIX} Initialising…`);
    loadSettings();
    await injectSettingsPanel();
    syncUIFromSettings();
    bindUIEvents();
    updateStatsUI();
    await loadData();

    if (event_types.CHARACTER_MESSAGE_RENDERED) {
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onCharacterMessageRendered);
        console.log(`${LOG_PREFIX} Listening on CHARACTER_MESSAGE_RENDERED.`);
    } else {
        console.warn(`${LOG_PREFIX} CHARACTER_MESSAGE_RENDERED unavailable, using fallback.`);
        eventSource.on(event_types.USER_MESSAGE_RENDERED, () => {
            setTimeout(async () => {
                const context = getContext();
                if (context?.chat?.length > 0) await onCharacterMessageRendered(context.chat.length - 1);
            }, 600);
        });
    }

    eventSource.on(event_types.CHAT_CHANGED, () => {
        stats.replacements = 0;
        stats.messages = 0;
        updateStatsUI();
    });

    console.log(`${LOG_PREFIX} Ready.`);
}

eventSource.on(event_types.APP_READY, init);
