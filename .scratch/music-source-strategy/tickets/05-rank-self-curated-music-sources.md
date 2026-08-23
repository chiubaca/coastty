# Rank Self-Curated Music Sources and Services

Label: wayfinder:research
Parent: ../MAP.md
Status: closed
Assignee: opencode
Blocked by: 04-choose-self-curated-playback-model.md

## Question

Without selecting an operator jurisdiction or providing legal advice, which music catalogs, artist-direct or open-license sourcing routes, licensing pathways, and preferably managed playback or broadcast services can support the operator-curated Station and Playlist models defined by [Choose the Self-Curated Playback Model](04-choose-self-curated-playback-model.md) for a public worldwide audience at hobby scale? Evaluate the models separately and rank practical combinations by catalog fit, granted rights and unresolved legal risk, attribution and reporting duties, curation control, metadata, reliability, operational burden, geographic restrictions, listener limits, and current and scaling cost. Clearly flag claims and eligibility that depend on operator or listener location. Create a linked research asset using primary sources, allow either model to have no viable recommendation, and identify any candidate-specific checks still needed.

## Comments

### Resolution - 2026-08-19

The primary-source research is recorded in [Self-Curated Music Sources and Services](../research/05-self-curated-music-sources.md).

No verified turnkey service combines suitable music, worldwide rights, and managed delivery for either model. The ranked paths are therefore conditional:

- **Station:** first investigate a small artist/label-direct catalog delivered through Radio.co Standard; use a rigorously audited CC0 or CC BY 4.0 catalog as the sourcing fallback. Radio.co is the preferred managed playout host at $59/month because it provides scheduling, direct global streaming, region controls, metadata, listener analytics, and track reports, but it grants no music rights. Live365 is the best conventional-catalog managed fallback only for its covered US, Canadian, and Mexican listeners, plus a separately quoted UK add-on; it does not meet the worldwide requirement.
- **Playlist:** first investigate Audius API tracks governed by the Audius Open Music License. The OML expressly grants Music Players broad worldwide streaming rights and includes uploader warranties for masters and compositions, while the API offers free hobby-scale access. This remains conditional because tracks can carry Alternative Licenses, Audius provides no compliance or non-infringement warranty, caching is session-only, access is revocable, and exact catalog fit, controls, metadata, range/resume behavior, geography, and non-waivable local payments remain unverified. Direct artist grants with Cloudflare R2 delivery are the most controllable fallback and can be nearly free at hobby scale, but require a new Playlist runtime and all rights, catalog, reporting, and takedown work.

Jamendo, FMA, ccMixter, and Openverse are useful discovery routes only after track-by-track license and provenance audits. Spotify, SoundCloud, Bandcamp purchases, standard Jamendo Licensing, and infrastructure alone do not grant the required downstream playback rights. Operator and listener location remain release gates; the ranking is not legal advice and does not claim any catalog is worldwide-cleared.

The linked asset contains the full comparison, current costs, attribution and reporting duties, contract fit, rejected alternatives, source-access limitations, and candidate-specific checks. Those checks are launch-validation work rather than another source-ranking decision; [Recommend the Music Source Strategy](06-recommend-the-music-source-strategy.md) can now make the final conditional recommendation.
