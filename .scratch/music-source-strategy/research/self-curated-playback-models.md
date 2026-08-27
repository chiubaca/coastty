# Self-Curated Playback Models

Research date: 2026-08-19

## Question and scope

This note compares two ways CoasTTY could play an operator-curated music catalog:

- **Shared continuously programmed Station:** one operator-controlled program clock produces a continuous linear stream. Every listener who presses Play joins the same current point.
- **Independent per-listener Playlist:** each listener has a separate playback cursor over operator-curated audio files. A listener ordinarily starts at a track boundary and can retain a position independently of everyone else; track selection, skip, seek, and resume are product choices rather than necessary properties of the transport.

The comparison is a decision aid, not a model selection or legal opinion. The operator jurisdiction remains unresolved, and a public worldwide service has to evaluate both the operator's obligations and rights for the territories it reaches.

## Short comparison

| Dimension | Shared continuously programmed Station | Independent per-listener Playlist |
| --- | --- | --- |
| Listener behavior | Radio-like: everyone hears the same program moment; Play joins live, Pause leaves it, and Play rejoins later. | Session-like: listeners have separate cursors and can start at different tracks or positions. Pause can resume, but skips, seeking, and track choice are optional policy decisions. |
| Rights category | Can fit linear/noninteractive webcasting if the complete service satisfies the applicable territory's conditions. This is eligibility, not automatic permission. | A separate cursor alone does not determine the category. Personalization, foreknowledge, track choice, on-demand access, pause/resume, skip, shuffle, or caching can move the service into customized, interactive, or direct-licence categories. |
| Reporting | One authoritative playout log can be combined with listener connection intervals, but current-track metadata alone is insufficient. | The service can record each listener's actual track events directly, but needs a trustworthy event pipeline and contract-specific usage accounting. |
| Catalog | Needs lawful source copies, complete identifiers, a schedule, enough depth for rotation rules, and rights for linear transmission and required server copies. | Needs the same asset quality plus grants broad enough for the exact per-listener controls, on-demand delivery, territories, and any temporary copies or offline behavior. Direct object URLs do not carry music rights. |
| Current COAST.FM fit | Direct fit with the existing Station language, join-live Pause semantics, direct stream URL integration, ICY metadata, and reconnect lifecycle. | A new playback concept and runtime are required: queue/cursor state, finite-track transitions, end-of-track behavior, and probably progress/resume policy. |
| Managed services | Mature radio-specific SaaS and self-hosted stacks exist, including AutoDJ, scheduling, stream fan-out, listener analytics, and playout reports. Some services bundle limited-territory licensing. | Managed storage/CDN is cheap and mature, but it is infrastructure rather than a turnkey worldwide licensed music service. Consumer music APIs do not provide a drop-in catalog for this product. |
| Metadata | The playout system emits one current artist/title feed, commonly ICY or an Icecast status API. Reporting still needs durable catalog and playout records. | The catalog can supply exact per-track metadata before playback and richer fields, while client/server events identify what each listener received. |
| Reliability | One program clock simplifies clients but creates a station-wide failure domain at the playout/source layer. Relays and managed AutoDJ can reduce origin risk. | Static objects distribute and cache well; one broken object can affect only that track/session. More client and control-plane state creates more transition and accounting failure modes. |
| Bandwidth | Distribution still sends one encoded stream per listener. Sharing saves source generation and origin ingest, not last-mile audience bytes. | Similar audience bytes at the same bitrate. Immutable popular tracks can be edge-cached; long-tail tracks and range requests reduce cache efficiency. |
| Hobby-scale cost | Turnkey hosting starts in the tens of dollars monthly, while direct statutory/collective licensing can impose annual minimums and per-performance royalties. | Storage and egress can be near zero at hobby scale, but direct music rights and the custom service/reporting layer are unpriced and potentially dominant. |

## 1. Listener behavior and product meaning

### Shared Station

Icecast's documented topology is one source client feeding a mountpoint while listeners connect to that mountpoint. The server sends the stream to each listener.[1] That produces one shared program clock even though each listener has a separate network connection.

This is exactly CoasTTY's current behavior and language:

- A Station is identified by musical character, not an individual track.
- Pressing Play joins the Station at its current live point.
- Pausing intentionally stops playback while retaining Station and volume; pressing Play later rejoins live rather than resuming old audio.
- Current artist/title is attribution within the Station, not the primary selectable object.

The listener gets low-attention, communal radio behavior. The trade-off is that they cannot recover a missed passage or choose their starting point without changing the service away from strict linear playback.

### Independent Playlist

An independent cursor means two listeners can receive different tracks from the same catalog at the same wall-clock time. It supports deterministic start-at-beginning behavior and can support real pause/resume. It does **not** inherently require user-selected tracks, skip, seek, shuffle, personalization, or a visible future queue. Those capabilities must be specified separately because they materially affect both product meaning and licensing.

The current canonical term `Station` would become misleading if playback resumes an old position or exposes track-level controls. The already-open [Choose the Self-Curated Playback Model](../tickets/04-choose-self-curated-playback-model.md) ticket is the right place to decide whether this is still a constrained radio-like service or a distinct listener-facing concept.

## 2. Music rights and reporting categories

### The architecture does not by itself choose the legal category

The strongest general conclusion is that legal categories follow the delivered capabilities and licence terms, not the implementation label `Station` or `Playlist`.

In the United States, 17 U.S.C. section 114 treats certain eligible noninteractive digital audio transmissions as candidates for a statutory sound-recording licence. SoundExchange describes noninteractive services as radio-like: listeners do not choose a specific track or artist, and the specific selection and order remain unknown to them. It says interactive or on-demand services need direct sound-recording licences.[2][3] Section 114 also imposes conditions such as the sound-recording performance complement, limits on advance track announcements and repeated programs, use of authorized source recordings, and display of current title/artist information.[3]

Therefore:

- One continuously programmed shared Station is structurally compatible with a noninteractive route, but only if its programming, user controls, source copies, metadata, and operation satisfy all relevant conditions.
- A per-listener sequence with no track choice, personalization, foreknowledge, or interactive controls is not automatically on-demand merely because each listener has a separate connection and cursor. Its exact eligibility still needs jurisdiction-specific review.
- Allowing a listener to request a particular recording, delivering a program specially created for that recipient, or adding on-demand behavior can make the U.S. statutory sound-recording route unavailable.[2][3]

The United Kingdom illustrates that the dividing line can be stricter and more granular. PPL defines a linear webcast as real-time audio where listeners cannot pause or skip. Its 2026 Linear Webcast Licence excludes pause, skip, rewind, fast-forward, personalization, on-demand content, downloads/caching/offline use, and short predetermined loops.[4] PPL separately describes `Customised Radio` as no track choice but up to six skips per hour or pause, assessed case by case. It directs full-track on-demand, shuffle, or unlimited-skip services to obtain direct licences from recording rightsholders.[5]

### Both copyright layers remain

A recording ordinarily contains at least two independently licensed works: the sound recording and the underlying musical composition. SoundExchange administers the U.S. statutory sound-recording licences but says a digital audio transmission will usually also require musical-work licensing. PPL likewise says its recording-rightsholder/performer licence is separate from PRS for Music's songwriter/composer/publisher licence.[3][4]

Owning an audio file, buying a consumer subscription, or obtaining storage/CDN access is not a grant of these public-performance, communication, or reproduction rights. Spotify's developer policy is a useful concrete boundary: it prohibits noninteractive webcasting through Spotify, including playing one source to simultaneous listeners; Spotify streaming is limited to Premium subscribers and carries display and commercial-use conditions.[6] It is not a catalog supply route for either self-curated model.

### Worldwide availability is a separate gate

Neither architecture creates a worldwide licence. SoundExchange states that transmissions reaching U.S. listeners are subject to U.S. law even when the service is based elsewhere.[3] PPL's linear fee and reporting depend in part on targeted territories and require territory reporting for its higher band.[4] Live365's standard bundled coverage names the United States, Canada, and Mexico; UK coverage is a separate add-on, and it asks operators outside those territories to contact sales.[7]

The eventual recommendation must verify the operator jurisdiction, every intended listener territory, catalog repertoire coverage, and whether geofencing is required. A provider's claim of `global streaming` describes delivery infrastructure, not worldwide music rights.

### Reporting differs operationally, not in importance

For a U.S. commercial noninteractive webcaster, SoundExchange currently requires monthly statements and a monthly complete census report. Track records require title, artist, and ISRC or both album and marketing label, plus actual total performances. A performance is any portion of one recording transmitted to one unique listener.[8][9]

For a shared Station, the operator can join:

1. An authoritative catalog and playout timeline.
2. Listener connection intervals from the streaming server.
3. Territory and service-category data required by the applicable licence.

For an independent Playlist, each server-authorized track delivery or client playback event is naturally listener-specific, but the service must handle retries, partial plays, reconnects, duplicate events, abandoned sessions, privacy, and tamper resistance. Direct licences determine their own accounting terms, so statutory report fields cannot be assumed sufficient.

ICY `StreamTitle` or a visible current artist/title is valuable attribution but is not a royalty ledger. Icecast exposes current source-set artist/title and listener counters, while SoundExchange requires durable recording identifiers and audience measurement.[8][10]

## 3. Source-catalog requirements

### Shared Station catalog

The operator needs:

- Lawfully sourced audio files from copies authorized for the intended use.
- Territory and rights records for both sound recording and composition, including any noninteractive-only limits.
- Track title, featured artist, album, label, ISRC where available, duration, and rights-owner/source provenance.
- A scheduler or AutoDJ that respects applicable artist/album rotation and repeat rules. For example, the U.S. performance complement and PPL's published UK conditions limit tracks from one artist or album in a three-hour period.[3][11]
- Audio normalization, codec/bitrate preparation, cue/fade behavior, a safe fallback, current-track metadata emission, and durable playout logs.

AzuraCast demonstrates this established operational model: playlists feed an AutoDJ according to rotation or schedule rules, with Liquidsoap composing one final radio stream. Its own requirements explicitly warn that the operator remains responsible for music licensing.[12][13]

### Independent Playlist catalog

The operator needs all of the core metadata and provenance above, plus:

- Rights broad enough for the exact controls and delivery mode, potentially including interactive/on-demand transmission and temporary technical copies.
- Explicit policy for track choice, order visibility, skips, seeking, pause/resume, caching, offline playback, and geographic access.
- Individually addressable encoded files, stable catalog IDs, integrity/version handling, and byte-range support where the player needs seeking or resume. HTTP range requests return partial resource bytes and are a standard basis for resuming media delivery.[14]
- Per-track availability and takedown behavior that cannot strand sessions or leave stale manifests.
- Per-listener authorization and play accounting if rights or reporting cannot rely on public, unmetered object URLs.

This can narrow the usable source pool: a catalog licensed for noninteractive radio is not thereby licensed for user-controlled or on-demand playback. Conversely, a catalog with direct worldwide grants for the precise service could support either transport.

## 4. Compatibility with the current COAST.FM player

### Shared Station: incremental compatibility

The existing `StationIntegration` contract is deliberately narrow: stable Station identity, one direct HTTPS MP3 or FLAC stream URL, attribution policy, metadata normalizer, and optional failure classifier. The runtime opens one stream, maps native stream states into the seven Playback Status values, displays live attribution, reconnects, and treats Pause as leaving the live stream. This is the exact contract a managed AutoDJ/Icecast-compatible endpoint can satisfy.

A self-curated shared stream would still need legal and provider review, but it does not require a new listener-facing playback model.

### Independent Playlist: a new product/runtime seam

The native audio port can open a URL, but the current runtime is not a finite-track queue:

- `StationIntegration` has one stream URL, not a catalog or manifest.
- The only transport commands are Play and Pause; there is no cursor, next-track transition, progress, seek, resume, or track selection.
- Stream end is classified as `Station unavailable`, while a finite file ending normally must advance.
- Current `Paused` semantics discard position and rejoin live, which conflicts with ordinary Playlist resume behavior.
- Attribution is normalized from live stream metadata rather than selected from an authoritative per-track catalog.
- Reconnect policy retries one live stream rather than deciding whether to resume a byte offset or advance a track.

An independent model is feasible, but it is not a data-only Station integration. It requires a separate domain and playback design rather than widening the current deep Station module until it represents two unrelated behaviors.

## 5. Managed-service availability

### Shared Station

Radio-specific options are mature:

- **Radio.co** publishes a $35/month Lite plan with 2 GB media storage, 500 concurrent listeners, 1 TB monthly bandwidth (described as about 18,000 listening hours), AutoDJ/scheduling, direct stream links, and a global delivery network. Its public plan does not claim bundled worldwide music rights; `music & licensing brokering` appears under custom Pro solutions.[15]
- **Live365** publishes a $59/month Broadcast 1 plan with 30 GB storage and 1,500 total listening hours. Its listed bundled licensing covers the United States, Canada, and Mexico and depends on real-time track metadata; UK is a separately quoted add-on. Overage is $0.05 per listening hour.[7]
- **AzuraCast** is free/open-source station software with AutoDJ, scheduling, metadata APIs, and Icecast/Liquidsoap, but it is self-hosted rather than low-maintenance managed SaaS. Its published minimum is 2 GB RAM and 20 GB disk, with 4 CPU cores, 4 GB RAM, and 40 GB disk recommended for hobby use.[12][13]

These products solve playout and distribution to different degrees. Only explicit licensing terms solve rights, and none of the examined public plans establishes turnkey worldwide repertoire coverage.

### Independent Playlist

Managed infrastructure exists, but the integration layer remains custom:

- Cloudflare R2 offers S3-compatible object storage, public custom-domain delivery, cache integration, byte-range `GetObject`, and no Internet egress charge. Its standard free tier includes 10 GB-month storage and 10 million Class B reads per month.[16][17][18]
- General object storage and CDNs reliably serve immutable media, but they do not schedule tracks, maintain per-listener playback state, provide a music catalog licence, enforce product-control restrictions, or generate royalty-ready reports.
- Spotify cannot fill this gap: its policy prohibits building a noninteractive webcaster and restricts streaming applications to Spotify Premium users under Spotify's experience and commercial terms.[6]

No primary source reviewed showed a hobby-priced, bring-your-own-catalog service that bundles a custom independent player, broad worldwide interactive music rights, and reporting. That is not proof none exists; it means the later source-ranking ticket must treat any such claim as a candidate-specific verification item.

## 6. Metadata and observability

### Shared Station

One playout authority knows the current track and can insert ICY metadata or expose a side API. Icecast documents current `artist` and `title` as source-client-set metadata and exposes listener counts plus cumulative connections and bytes.[10] This aligns with CoasTTY's current `Known`, `Partial`, or `Unavailable` attribution normalization.

The weaknesses are timing and completeness: metadata can arrive late, be malformed, disappear across reconnects, or omit reporting identifiers such as ISRC and label. The playout database, not the public ICY string, should remain authoritative.

### Independent Playlist

The service selects a catalog record before requesting its file, so artist, title, album, artwork/attribution, duration, and rights identifiers can be exact and immediately available. It can also distinguish selected, requested, started, audible, completed, skipped, and failed events.

The cost is synchronization: catalog metadata, signed URLs, object versions, client state, and accounting events must refer to the same recording. A client-only log is easier to lose or manipulate than server-observed stream connections, while a server GET does not prove how much audio became audible.

## 7. Reliability, bandwidth, and scaling

### Reliability shape

**Shared Station:** The source client/AutoDJ and its program clock are a common failure domain. If playout stops, every listener is affected. Managed services can keep AutoDJ near the distribution tier, and Icecast supports relays that mirror a mountpoint across physical servers for large broadcasts. On-demand relays can avoid pulling the source when nobody is listening.[19] Clients are simple because they only reconnect to one current live stream.

**Independent Playlist:** Static catalog objects have no continuously running encoder and cache well. An unavailable file normally affects one track and the sessions that select it rather than every listener simultaneously. However, availability also depends on catalog/manifest lookup, URL authorization, client queue transitions, object CORS/range behavior, and event ingestion. Gapless transitions and resume after a partial request are additional client responsibilities.

Neither model is automatically more reliable. The Station concentrates failure in fewer managed components; the Playlist distributes delivery while adding stateful edges.

### Bandwidth

At a constant 128 kbit/s, one listening hour transfers approximately:

`128,000 bits/s / 8 * 3,600 s = 57,600,000 bytes`, or 57.6 MB decimal.

That is about 41.5 GB per average continuously connected listener over a 30-day month, or about 4.15 TB for 100 average concurrent listeners. The audience term is essentially the same for both models at the same bitrate.

The architectural difference is upstream:

- A shared Station encodes/ingests one stream, then the distribution server or relays fan it out. Icecast explicitly describes listeners connecting individually to the mountpoint.[1]
- A Playlist serves per-track objects. Popular immutable tracks can be cached close to listeners; AWS documents CDN caching as reducing storage-origin requests and latency for repeated objects.[20] Personalized long-tail access and fragmented range requests can lower cache reuse.

Thus `one shared stream` does not mean one copy of the bytes for the whole audience. It reduces playout and origin-ingest duplication, while each listener still consumes delivery bandwidth.

## 8. Hobby-scale cost

Prices below were observed on 2026-08-19 and are examples, not quotes or complete rights budgets.

### Shared Station examples

- Radio.co Lite is $35/month for managed playout/distribution with the limits above, excluding an established bundled worldwide licence.[15]
- Live365 Broadcast 1 is $59/month for 1,500 listening hours and 30 GB storage, with stated licensing only for named territories and $0.05 per excess listening hour.[7]
- Direct U.S. commercial-webcaster statutory sound-recording licensing has a 2026 $1,000 annual minimum per station/channel, recoupable against usage, plus $0.0025 per nonsubscription performance. At 12 tracks per listening hour, the usage rate alone is about $0.03 per listening hour, before musical-composition licensing and administration.[9]
- PPL's 2026 UK linear sound-recording licence starts at GBP 207 plus VAT per channel/year for up to 150,000 performances. Its higher band has a GBP 691 advance recouped against GBP 0.001380 per performance, with separate composition licensing still required.[4]

These examples are not directly additive because eligibility, operator status, repertoire, and territory differ. They show that rights minimums can exceed stream-hosting cost at hobby scale, while a licensing intermediary can bundle some territories more cheaply than assembling each relationship independently.

### Independent Playlist examples

- R2 standard storage is $0.015/GB-month after its 10 GB free tier, Class B reads are $0.36/million after 10 million free reads, and Internet egress is free.[16] A small compressed catalog can therefore have negligible raw delivery cost.
- Raw infrastructure cost excludes the catalog/control API, URL protection, analytics and reporting, client development, operational support, and music rights.
- The examined U.S. statutory and PPL linear routes do not publish a full-track on-demand hobby tariff applicable to this model. SoundExchange and PPL direct interactive/on-demand services toward direct rightsholder licensing.[3][5] Price, advances, minimum guarantees, repertoire, territory, and reporting would therefore be negotiated or inherited from the specific catalog grant.

Low object-storage cost should not be treated as evidence that the complete Playlist service is cheaper. Equally, direct artist or open-licence grants might make a small Playlist catalog affordable if they expressly cover the intended worldwide service. The later source-ranking work must evaluate the actual grants rather than assume either outcome.

## Consequential choices for the human

The model decision turns on these product and risk preferences:

1. Is `Play` meant to join a communal current moment, or begin/resume a personal session?
2. Must listeners be able to pause and resume, skip, seek, see upcoming tracks, shuffle, or choose a track? Each capability should be decided explicitly before licensing research.
3. Is preserving the current Station language and narrow direct-stream integration a priority, or is a second playback domain acceptable?
4. Is the operator willing to run a playout/reporting service continuously, or to build and maintain per-listener catalog, state, authorization, and accounting?
5. Which operator and listener territories must be licensed at launch, and is geofencing acceptable when worldwide rights are unavailable?
6. Will the source catalog offer only linear/noninteractive rights, or direct grants broad enough for independent playback?
7. Is a predictable managed monthly station fee preferable to cheap commodity delivery with unknown direct-licensing and product-development cost?

Neither model dominates every dimension. The shared Station minimizes product change and has mature managed operations, but concentrates availability and remains bound by linear-programming constraints. The independent Playlist offers deterministic personal playback and cheap static delivery, but can trigger broader rights, introduces a new CoasTTY concept/runtime, and lacks an identified turnkey worldwide licensed service.

## Sources

Primary and authoritative sources were preferred. Prices and licence terms are time-sensitive.

1. [Icecast, Basic Setup](https://www.icecast.org/docs/icecast-latest/basic_setup/)
2. [17 U.S.C. section 114, especially subsections (d) and (j)](https://www.law.cornell.edu/uscode/text/17/114)
3. [SoundExchange, Licensing 101](https://www.soundexchange.com/service-provider/licensing-101/)
4. [PPL, Linear Webcast Licence](https://www.ppluk.com/licensing/playing-music-online/linear-webcast-licence/)
5. [PPL, Other online licences](https://www.ppluk.com/licensing/playing-music-online/other-online-licences/)
6. [Spotify for Developers, Developer Policy](https://developer.spotify.com/policy)
7. [Live365, Broadcaster Pricing](https://live365.com/broadcaster/pricing)
8. [SoundExchange, Reporting Requirements](https://www.soundexchange.com/service-provider/reporting-requirements/)
9. [SoundExchange, Commercial Webcaster (CRB)](https://www.soundexchange.com/service-provider/commercial-webcaster/)
10. [Icecast, Server Statistics](https://www.icecast.org/docs/icecast-latest/server_stats/)
11. [PPL, Restrictions on recorded music in online radio](https://www.ppluk.com/help-centre/faq/are-there-any-restrictions-on-the-use-of-recorded-music-in-an-online-radio-service/)
12. [AzuraCast, Playlists](https://www.azuracast.com/docs/user-guide/playlists/)
13. [AzuraCast, Requirements](https://www.azuracast.com/docs/getting-started/requirements/)
14. [HTTP Semantics, Range](https://httpwg.org/specs/rfc9110.html#field.range)
15. [Radio.co, Plans and Pricing](https://radio.co/pricing)
16. [Cloudflare R2, Pricing](https://developers.cloudflare.com/r2/pricing/)
17. [Cloudflare R2, Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
18. [Cloudflare R2, S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
19. [Icecast, Relaying](https://www.icecast.org/docs/icecast-latest/relaying/)
20. [Amazon S3, Performance design patterns](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-design-patterns.html)
