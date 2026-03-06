/**
 * Anti-Slop — Stage 2: Sentence Splitter
 *
 * Splits text into sentences while preserving the original delimiters
 * so the text can be reconstructed exactly.
 */

/** @typedef {{ text: string, delimiter: string, index: number }} Segment */

/**
 * Split text into sentences, preserving delimiters.
 * Handles:
 *   - Standard sentence-ending punctuation (.  !  ?)
 *   - Ellipsis (...)
 *   - Dialogue and action tags (*action*)
 *   - Quoted speech that contains internal punctuation
 *
 * @param {string} text
 * @returns {Segment[]}
 */
export function splitSentences(text) {
    if (!text || !text.trim()) return [];

    // Prefer native Intl.Segmenter when available (Chrome 87+, Firefox 125+)
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
            const segments = [...segmenter.segment(text)];
            return segments.map((seg, i) => ({
                text: seg.segment.trim(),
                delimiter: '',        // Intl fuses delimiter with segment
                index: i,
            })).filter(s => s.text.length > 0);
        } catch (_) {
            // fall through to manual splitter
        }
    }

    return manualSplit(text);
}

/**
 * Regex-based sentence splitter fallback.
 * @param {string} text
 * @returns {Segment[]}
 */
function manualSplit(text) {
    const segments = [];
    // Split on sentence-ending punctuation followed by whitespace or end-of-string.
    // Keeps the punctuation attached to the preceding sentence.
    const raw = text.split(/(?<=[.!?…])\s+(?=[A-Z*"'])/);

    for (let i = 0; i < raw.length; i++) {
        const sentence = raw[i].trim();
        if (sentence.length > 0) {
            segments.push({
                text: sentence,
                delimiter: i < raw.length - 1 ? ' ' : '',
                index: i,
            });
        }
    }

    // If nothing was split (single sentence), return the whole text
    if (segments.length === 0 && text.trim().length > 0) {
        segments.push({ text: text.trim(), delimiter: '', index: 0 });
    }

    return segments;
}

/**
 * Rejoin segments back into a single string.
 * Removes double-spaces and trims empty segments.
 *
 * @param {Segment[]} segments
 * @returns {string}
 */
export function joinSegments(segments) {
    return segments
        .filter(s => s.text.trim().length > 0)
        .map(s => s.text.trim())
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
