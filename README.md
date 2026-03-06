# Anti-Slop — SillyTavern Extension

Automatically detects and removes AI clichés (*slop*) from character responses.

---

## What is slop?

Slop is the set of overused LLM phrases that appear in nearly every AI-generated story:

| Before | After |
|--------|-------|
| Her breath hitched, eyes widening as she melted into his embrace. | She hesitated for a moment, then leaned into him. |
| Electricity crackled between them as their lips crashed together. | Neither of them spoke. They kissed. |
| A shiver ran down her spine. Her heart skipped a beat. | She shivered. Something shifted in her chest. |

---

## Installation

1. Open SillyTavern.
2. Go to **Extensions → Install extension**.
3. Paste the URL of this repository (or drag the folder into `SillyTavern/public/scripts/extensions/third-party/AntiSlop`).
4. Reload SillyTavern.

The extension panel appears in the **Extensions** drawer under **Anti-Slop**.

---

## How it works

The pipeline runs automatically after every character message:

```
Character response
      │
      ▼
Stage 1 — Regex Filter
  Fast pattern matching for ~30% of common slop.
  Handles pronoun variation (her/his/their/my/your).
      │
      ▼
Stage 2 — Sentence Splitting
  Splits text into individual sentences using Intl.Segmenter
  (with regex fallback for older browsers).
      │
      ▼
Stage 3 — Similarity Search
  For each sentence, compute a character n-gram embedding
  and find the most similar phrase in the slop database
  using cosine similarity. Threshold: configurable (default 0.82).
      │
Stage 3b — Cluster Search
  Each cluster (e.g. "Spine Shiver", "Emotion Flood") has a
  centroid embedding. Sentences close to a centroid get a
  fine-grained search against all cluster members.
      │
      ▼
Stage 4 — Classification
  Detected slop is tagged:
  • neutral  → synonym replacement
  • filler   → remove or simplify
  • romantic → template rewrite
      │
      ▼
Stage 5 — Rewrite Engine
  • Synonym replacement: random alternative from curated list
  • Template rewrite:    hand-crafted natural-sounding alternatives
  • Removal:            phrase deleted, sentence collapsed
      │
      ▼
Cleaned response saved
```

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enabled | ✓ | Master on/off switch |
| Stage 1 — Regex Filter | ✓ | Fast regex pass |
| Stage 3 — Similarity | ✓ | n-gram cosine search |
| Stage 3b — Clusters | ✓ | Cluster centroid search |
| Neutral slop | ✓ | eyes widened, heart skipped… |
| Romantic slop | ✓ | melted into embrace, lips crashed… |
| Filler slop | ✓ | shiver down spine, heat pooled… |
| Default action | replace | replace / remove / rewrite |
| Threshold | 82 | 0–100 (lower = more aggressive) |
| Debug mode | ✗ | Log all changes to browser console |

---

## Slop database

Located in `data/`:

| File | Contents |
|------|----------|
| `slop_phrases.json` | ~200 cliché phrases with type and weight |
| `synonyms.json` | Replacement alternatives for each phrase |
| `clusters.json` | Semantic clusters with centroids |

You can extend any of these files to add your own phrases.

---

## File structure

```
AntiSlop/
├── manifest.json
├── index.js              ← Extension entry point
├── settings.html         ← UI panel
├── styles.css
├── modules/
│   ├── regexFilter.js    ← Stage 1
│   ├── sentenceSplitter.js  ← Stage 2
│   ├── embeddingEngine.js   ← Stage 3 (n-gram cosine)
│   ├── vectorSearch.js      ← Stage 3b (clusters)
│   └── rewriteEngine.js     ← Stages 4+5
└── data/
    ├── slop_phrases.json
    ├── synonyms.json
    └── clusters.json
```

---

## Extending with real embeddings

The `embeddingEngine.js` `computeEmbedding()` function is designed to be
swapped out. To use `@xenova/transformers`:

```js
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

export async function computeEmbedding(text) {
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return output.data; // Float32Array — update cosineSimilarity accordingly
}
```

---

## Performance

| Stage | Typical time (20-sentence message) |
|-------|-----------------------------------|
| Regex filter | < 1 ms |
| Sentence splitting | < 1 ms |
| n-gram embeddings | 2–5 ms |
| Cluster search | 1–3 ms |
| **Total** | **< 10 ms** |

Effectively zero impact on perceived generation speed.
