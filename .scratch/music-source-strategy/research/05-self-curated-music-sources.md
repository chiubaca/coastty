# Self-Curated Music Sources and Services

Research and source-access date: 2026-08-19

This note is product and technical research, not legal advice. It does not select or assume an operator jurisdiction. Music rights and service eligibility can depend independently on where the operator is established, where infrastructure and copies are located, and where each listener receives the service. Every recommendation below is therefore conditional on later jurisdiction-specific review.

## Executive answer

There is **no verified turnkey service that combines the map's music, worldwide rights, and managed delivery for either playback model**.

For the communal live **Station**, the best practical combination is a small catalog obtained under track-specific, worldwide artist/label agreements and delivered through **Radio.co Standard**. A rigorously audited CC BY 4.0 or CC0 catalog is the lower-cost sourcing alternative. Both are **conditional recommendations**, not cleared catalogs: the operator must confirm that each licensor controls both the recording and composition, identify any non-waivable local remuneration, and preserve source and rights evidence. Radio.co supplies managed storage, scheduling, a direct stream, region controls, metadata, and reports, but expressly supplies no music licensing. ([Radio.co pricing](https://radio.co/pricing), [terms](https://radio.co/terms), [playlists](https://help.radio.co/en/articles/899715-playlists))

For the fixed-order per-device **Playlist**, **Audius API plus the Audius Open Music License (OML)** is the strongest managed candidate. The OML expressly grants a Music Player worldwide, royalty-free rights to reproduce, publicly perform, distribute, digitally transmit, stream, and sublicense the material, and requires uploaders to warrant control of the master and composition. Audius also publishes free API access at 10 requests/second and 500,000 requests/month. This is nevertheless only a **conditional investigation lead**: an uploader can specify an Alternative License; Audius gives no compliance or non-infringement warranty; API caching is session-only; access can be terminated without cause; and no evidence yet confirms that the selected tracks, exact controls, metadata, range/resume behavior, or listener territories pass every required check. ([Audius OML](https://audius.org/open-music-license.pdf), [API Terms](https://audius.co/documents/ApiTerms.pdf), [developer overview](https://docs.audius.co/), [API plans](https://api.audius.co/plans))

The strongest infrastructure-independent Playlist fallback is a directly licensed artist catalog on **Cloudflare R2**. R2 can be effectively free at hobby scale and supports public custom-domain delivery and byte-range `GetObject`, but it grants no music rights and supplies no Playlist state, curation, royalty reporting, or player. ([R2 pricing](https://developers.cloudflare.com/r2/pricing/), [public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/))

**Live365 is the best managed conventional-catalog Station option only after abandoning worldwide availability or accepting geofencing.** Its published coverage is the United States, Canada, and Mexico, with a separately quoted UK add-on; its $59/month entry plan includes 1,500 total listening hours, 30 GB, and $0.05/listening-hour overage. It does not establish rights for the rest of the world. ([Live365 pricing and coverage](https://live365.com/broadcaster/pricing), [licensing overview](https://live365.com/broadcaster/internet-radio-licensing))

## Models and recommendation status

The two inherited product models are evaluated separately:

- **Station:** one operator-curated continuous program. Every listener joins the same live position. Pause leaves the live stream; Play rejoins the current point.
- **Playlist:** one operator-curated finite collection in fixed order. Each device persists its own cursor; the listener may pause, resume, and skip forward; the collection loops; there is no seek, previous, shuffle, reordering, direct selection, account, or cloud sync.

| Model | Status | Best lead | Why it is not ship-ready |
| --- | --- | --- | --- |
| Station | **Conditional recommendation; no turnkey worldwide recommendation** | Direct artist/label catalog + Radio.co Standard; audited CC BY/CC0 + Radio.co is second | No catalog has been cleared. Radio.co is infrastructure only. Worldwide grants may not displace mandatory local payments or rights outside the licensor's control. |
| Playlist | **Conditional investigation lead; no ship-ready worldwide recommendation** | Audius API + OML; direct artist grants + R2 is the controllable fallback | Audius track-level license state, legal scope, stream behavior, geography, and continuity need confirmation. The current lofi.fm runtime does not implement Playlist semantics. |

## How the combinations were ranked

The ordering favors the map's free, ad-free, worldwide hobby service and weighs:

1. Fit with lofi, vaporwave, ambient, chillhop, chill-techno, melodic techno, and compatible low-attention music.
2. The rights actually granted for the recording and underlying composition, separately from delivery infrastructure.
3. Unresolved public-performance, communication/making-available, reproduction or mechanical, neighboring-right, performer, moral-right, and collective-remuneration risk.
4. Attribution, usage reporting, rights provenance, and takedown handling.
5. Operator curation, metadata quality, reliability, and operational work.
6. Operator and listener geography, listener limits, present cost, and scaling cost.
7. Fit with the current Station integration or the distinct Playlist runtime that would be required.

A rank means "investigate this combination first," not "all rights are cleared."

## Rights baseline

### A file, API, catalog label, or host is not a complete rights grant

A musical recording ordinarily contains at least the sound recording and the underlying musical work. SoundExchange explains that its US statutory system covers sound recordings while public performance of the musical work is ordinarily licensed separately; it also says a transmission reaching US listeners is subject to US law regardless of the service's origin. ([SoundExchange Licensing 101](https://www.soundexchange.com/service-provider/licensing-101/))

The exact rights and terminology vary by territory. Depending on the place and design, source-file acquisition, server copies, transcoding, linear transmission, per-device streaming, and pause/resume may engage reproduction or mechanical rights, public performance, communication or making available, sound-recording/neighboring rights, performer rights, or mandatory remuneration. The fact that an infrastructure provider calls its network "global" establishes delivery reach, not territorial music clearance.

Consequently:

- A Bandcamp purchase is not a broadcast or application licence. Bandcamp makes service content available to fans for personal, noncommercial use, while artists grant the much broader service-operating rights to Bandcamp itself. ([Bandcamp Terms, effective 2026-05-07](https://bandcamp.com/terms_of_use))
- A Creative Commons badge grants only the rights in the specifically identified material that the licensor has authority to grant.
- A platform's API licence governs API use; it need not pass the platform's music licences through to the application.
- Radio.co, Airtime Pro, AzuraCast, and R2 are delivery infrastructure. Their terms place music clearance on the operator. ([Radio.co terms](https://radio.co/terms), [Airtime Pro terms, sections 10.2 and 10.4](https://www.airtime.pro/terms-and-conditions/), [AzuraCast requirements](https://www.azuracast.com/docs/getting-started/requirements/))

### What permissive Creative Commons terms do and do not establish

CC BY 4.0 defines `Share` to include reproduction, public performance, distribution, communication, and making material available at a place and time individually chosen by the recipient. It grants worldwide, royalty-free, irrevocable rights to reproduce, share, adapt, and make necessary technical format changes. It requires creator/source/license attribution and modification notices in a manner reasonable for the medium. ([CC BY 4.0 sections 1, 2, and 3](https://creativecommons.org/licenses/by/4.0/legalcode.en))

That is materially stronger than a download permission, but not a warranty of a clean chain of title. CC BY grants only rights the licensor has authority to license, does not license trademarks or third-party personality rights, does not fully license moral rights, disclaims title and non-infringement warranties, and reserves royalties under non-waivable statutory or compulsory schemes. ([CC BY 4.0 sections 2(b) and 5](https://creativecommons.org/licenses/by/4.0/legalcode.en)) CC0 similarly attempts a worldwide waiver with a public-licence fallback, but expressly disclaims title and responsibility for clearing other persons' rights. ([CC0 sections 2-4](https://creativecommons.org/publicdomain/zero/1.0/legalcode.en))

For this project, prefer **CC0 and CC BY 4.0**. Treat earlier versions, BY-SA, NC, and ND as track-specific review cases. NC adds a commercial-purpose boundary; SA adds adaptation obligations; ND complicates edits beyond authorized technical format changes. This ranking does not assume that being free and ad-free automatically resolves NC.

### Location dependency is a release gate, not a footnote

Two current examples show why one collective or one operator-country licence is not "worldwide":

- In the US, an eligible noninteractive service can use the section 112/114 statutory sound-recording route only if it satisfies conditions including unknown selection/order, the performance complement, authorized source recordings, current artist/title/album display, and reporting. A commercial nonsubscription webcaster currently has a $1,000 annual minimum per channel and a 2026 rate of $0.0025 per performance, before musical-work licensing. ([SoundExchange Licensing 101](https://www.soundexchange.com/service-provider/licensing-101/), [2026 Commercial Webcaster](https://www.soundexchange.com/service-provider/commercial-webcaster/))
- PPL's UK linear licence excludes pause, skip, on-demand use, caching, and short predetermined loops. Its 2026 recording fees start at GBP 207 plus VAT up to 150,000 performances; targeting listed overseas territories starts an additional GBP 90 administration fee. Its reciprocal list covers 41 named countries, not the world, and Spain still requires separate performer clearance through AIE. PRS musical-work licensing remains separate. ([PPL Linear Webcast](https://www.ppluk.com/licensing/playing-music-online/linear-webcast-licence/), [2026 territories](https://www.ppluk.com/wp-content/uploads/2025/11/PPL-Linear-Webcaster-Licence-Territories-2026.pdf))

For the Playlist, PPL calls a service with pause or up to six skips per hour `Customised Radio` and assesses it case by case; unlimited skipping, shuffle, and on-demand services require direct recording-rightsholder licences. The selected Playlist model has pause and an uncapped forward skip, so this research does not assume PPL's linear or customized route applies. ([PPL other online licences](https://www.ppluk.com/licensing/playing-music-online/other-online-licences/))

## Catalog and artist-sourcing routes

### 1. Artist/label direct

This is the most controllable rights route and can target the map's exact genres. Bandcamp is useful for discovering and contacting independent lofi, vaporwave, ambient, chillhop, and electronic artists, but its sale or stream supplies no downstream app rights. The operator would need a separate written grant from every relevant master and composition rightsholder. Bandcamp's own artist terms are useful due-diligence evidence, not a pass-through licence: uploaders warrant control of their music while the broad grant runs to Bandcamp and its service users only for personal, noncommercial use. ([Bandcamp Terms](https://bandcamp.com/terms_of_use))

A candidate agreement would need the selected model, worldwide territories, term, master and composition rights, public performance/communication/making available, necessary server and technical copies, transcoding, infrastructure sublicensing, exact listener controls, metadata/artwork, attribution, fees, reporting, samples/covers, CMO/PRO affiliations, warranties, takedowns, and survival for existing copies. A casual email saying "you may play my track" is not equivalent to that evidence.

### 2. Audius and the Open Music License

Audius is the most important newly identified route. Its public site states 40,000+ monthly active artists, millions of tracks, and free 320 kbps streaming, and visibly includes electronic labels/artists such as Anjunadeep, bitbird, Dim Mak, Disclosure, Eli & Fur, and Laxcity. That supports broad electronic and chill-adjacent potential, but it does not establish sufficient exact lofi/ambient catalog depth. ([Audius](https://audius.co/))

The OML, last updated 2025-07-02, applies by default to content published to or accessed on the Audius Protocol. It grants Music Players a worldwide, non-exclusive, royalty-free, perpetual, irrevocable licence, with sublicensing, to reproduce, publicly perform, distribute, digitally transmit, stream, and otherwise use the material in the player's service. The uploader warrants ownership or fully paid-up rights in both master and composition, no third-party fees, and indemnifies Music Players for breach. Commercial uses must retain creator, copyright, OML, and material-URI attribution where practicable. ([Audius OML sections 1.1-1.7](https://audius.org/open-music-license.pdf))

Material cautions remain:

- An uploader can attach an **Alternative License**, which must be evaluated instead of assuming OML.
- The API terms grant a revocable API licence, allow termination at any time, restrict caching to the active session, disclaim non-infringement and legal compliance, and cap Audius's aggregate liability at $50. The uploader's OML warranty is not an Audius-backed catalog warranty. ([Audius API Terms sections 3-10](https://audius.co/documents/ApiTerms.pdf))
- The API terms require the application to provide App Users with Audius's Privacy Policy and API Terms, an unusual product obligation requiring confirmation for a terminal client. ([Audius API Terms section 2](https://audius.co/documents/ApiTerms.pdf))
- Free API access is currently 10 requests/second and 500,000 requests/month; unlimited use requires contacting Audius. ([Audius API plans](https://api.audius.co/plans))
- The published OML cannot be assumed to displace non-waivable collecting-society or statutory payments where listener law imposes them.

### 3. Jamendo Music API

Jamendo's API advertises more than half a million tracks and supports search, tags, instrumental/vocal and speed filters, featured `electronic`, `hiphop`, and `relaxation` selections, track/artist/album metadata, per-track Creative Commons URLs, and direct stream URLs in MP3, Ogg, or FLAC. That gives it strong ambient/electronic/chill discovery potential and useful curation metadata, though exact lofi, vaporwave, chillhop, and melodic-techno depth still needs sampling. ([Jamendo API introduction](https://developer.jamendo.com/v3.0/docs), [tracks API](https://developer.jamendo.com/v3.0/tracks))

The API may be used freely for noncommercial applications, but requires artist and Jamendo attribution plus a direct track-page backlink. Every track has its own CC licence; Jamendo says members are solely responsible for content and gives no non-infringement or availability warranty. Applications cannot be designed for caching or offline access and must reflect removals/changes. ([Jamendo API Terms sections 3-5](https://devportal.jamendo.com/api_terms_of_use)) Read-only access uses a client id; Jamendo asks applications likely to exceed 500,000 hits to contact it for review. ([Jamendo authentication](https://developer.jamendo.com/v3.0/authentication))

The old Jamendo radio-stream API is explicitly marked as non-working, so Jamendo is not a managed Station endpoint. ([Jamendo radio stream API](https://developer.jamendo.com/v3.0/radios/stream)) Jamendo Licensing's paid catalog also does not solve this use: its standard terms prohibit unsynchronized standalone streaming and compilations even though individual international licences are advertised at EUR 289/track and international-full at EUR 1,189/track. ([Jamendo Terms of Sale sections 3-4](https://licensing.jamendo.com/en/legal/termsofsales), [pricing](https://licensing.jamendo.com/en/pricing))

### 4. Free Music Archive, ccMixter, and Openverse

These are discovery/source routes, not managed licensed playback services:

- **Free Music Archive (FMA)** has Electronic, Hip-Hop, Instrumental, and Experimental categories. It says artists select per-track CC licences and that FMA does not own or license the works. Its uploader terms require artists to own necessary recording and composition rights, but FMA gives no warranty. Its API is shut down, hotlinking is prohibited, and apps must self-host files while observing each licence. ([FMA genres](https://freemusicarchive.org/genres), [licence guide](https://freemusicarchive.org/License_Guide), [terms sections 3 and 11](https://freemusicarchive.org/terms_of_use), [app developers](https://freemusicarchive.org/app-developers))
- **ccMixter** reports more than 30,000 tracks and offers an API filterable by tag and licence, including `ambient`, `chill`, and `hip_hop` examples. It requires per-track CC compliance and attribution, says uploaders warrant authority, but expressly cannot guarantee non-infringement. ([ccMixter attribution](https://ccmixter.org/how-to-attribute-ccmixter-tracks), [Query API](https://ccmixter.org/query-api), [terms sections 4-5](https://ccmixter.org/media/viewfile/terms))
- **Openverse** aggregates audio from public repositories and is useful for discovery, but expressly does not verify a work's licence or generated attribution. Every result must be checked at the originating source. ([Openverse About](https://openverse.org/about))

For all three, the operator should acquire an authorized file, capture the source page and licence evidence, independently verify both copyright layers, and host the resulting catalog. A search result or repository badge is not the rights record.

## Station ranking

### Comparison

| Rank | Combination | Catalog and curation | Rights and geography | Attribution/reporting | Reliability, burden, and cost | Current contract fit | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | **Artist/label-direct files + Radio.co Standard** | Best ability to target exact lofi/vaporwave/ambient/chillhop/chill-techno artists; full operator order and scheduling | Bespoke worldwide grant can cover both layers and infrastructure sublicensing; authority, CMOs, samples, and mandatory local payments remain track/territory gates | Contract-specific attribution and reports; Standard includes TTSL/track CSV reporting and listener analytics | Managed AutoDJ. $59/mo: 20 GB, 20,000 concurrent listeners, about 360,000 listening hours at 192 kbps. Radio.co disclaims rights and SLA-like availability commitments. ([pricing](https://radio.co/pricing), [terms](https://radio.co/terms)) | Strong: direct stream links, one communal clock, metadata, region locking; validate stable HTTPS MP3 and ICY on a trial | **Conditional recommendation and first outreach path** |
| **2** | **Audited CC0/CC BY 4.0 files from Jamendo/FMA/ccMixter/Openverse + Radio.co Standard** | Broad electronic/hip-hop/ambient pool; exact-fit quality varies and requires listening | CC terms are worldwide and broad, but only for rights the uploader controls; no title warranty and non-waivable payments remain | CC BY needs creator/source/licence links and modification notices; maintain per-track provenance. Radio.co reports help but do not prove rights | Same $59/mo delivery plus substantial catalog audit. Files remain controllable if repository disappears, subject to takedown response | Strong once files and tags are normalized; current UI may need a durable licence/source attribution surface beyond artist/title | **Conditional second choice** |
| **3** | **Audius OML tracks + bespoke source playout + Radio.co or Airtime Pro distribution** | Millions of electronic-heavy tracks; strong discovery, exact genre depth unverified | OML language is broad and uploader warranty is stronger than ordinary repository terms; Alternative Licenses, collective remuneration, and API retransmission/sublicensing treatment need confirmation | Commercial OML attribution is detailed; no royalty-ready report guarantee from API | API is free at published limits, but a continuously running playout/encoder is custom. Session-only caching and revocable API access are material reliability risks | Final managed stream could fit; the API itself cannot replace one shared live stream | **Promising rights lead, not recommended until Audius confirms this architecture** |
| **4** | **Authorized commercial catalog + Live365 licensing/hosting** | Conventional repertoire and complete operator curation; likely excellent genre supply if lawful source copies and metadata are available | Bundled only for US, Canada, Mexico; UK add-on is separately quoted. Outside coverage is unresolved. Real-time metadata is a condition. ([pricing](https://live365.com/broadcaster/pricing)) | Live365 handles covered-society reporting when metadata is supplied; operator must retain source-copy and uncovered-territory records | $59/mo, 30 GB, 1,500 listening hours, $0.05/hour overage. Low rights administration in covered territories | Likely direct radio stream and current metadata; endpoint/format/ICY must be tested | **Best geofenced fallback; rejected for worldwide requirement today** |
| **5** | **Commercial catalog + direct territorial collectives + Radio.co** | Broadest conventional catalog | US section 112/114 or PPL/PRS-style stacks can cover eligible linear use only in their territories/repertoire; no worldwide one-stop path was verified | Demanding census, identifiers, audience, revenue, and territory reports. US reports require title, artist, ISRC or album+label, and actual performances. ([SoundExchange reporting](https://www.soundexchange.com/service-provider/reporting-requirements/)) | Hosting plus annual minimums and per-performance charges; high legal and reporting overhead | Technically strong, administratively poor | **Not recommended for worldwide hobby scale** |

### Managed delivery choice

**Radio.co Standard is preferred over Lite for a real Station investigation.** Lite is attractive at $35/month with 2 GB, 500 concurrent listeners, and about 18,000 listening hours, but Standard adds 20 GB and exportable TTSL/track reporting. Both offer global delivery, direct links, scheduling, and country blocking; Radio.co explicitly says it supplies no music licensing. ([Radio.co pricing](https://radio.co/pricing), [geo protection](https://help.radio.co/en/articles/899743-managing-listeners), [terms](https://radio.co/terms))

**Airtime Pro is the budget managed alternative**, not the first choice. Hobbyist is $9.95/month for 10 listeners, 2 GB, 1 TB, and only 64 kbps; Starter is $39.95/month for two 128 kbps streams, 400 listeners per stream, 5 GB, and 3 TB. Its terms publish 99% annual availability but are dated May 2018, and make licences and royalties solely the operator's responsibility. A trial must confirm direct HTTPS MP3, ICY metadata, exact listener counting, and current terms. ([Airtime pricing](https://www.airtime.pro/pricing/), [terms sections 3.7 and 10](https://www.airtime.pro/terms-and-conditions/))

**AzuraCast is the control-oriented fallback**, not preferred managed infrastructure. It is free software with AutoDJ, schedules, Liquidsoap, and metadata APIs, but requires a server; its documented minimum is 2 GB RAM/20 GB disk and hobby recommendation is 4 cores/4 GB/40 GB. It explicitly leaves licensing to the operator. ([AzuraCast playlists](https://www.azuracast.com/docs/user-guide/playlists/), [requirements](https://www.azuracast.com/docs/getting-started/requirements/))

### Station recommendation

Proceed only as a **small catalog proof of rights**, not an immediate Station launch:

1. Seek 20-50 exact-fit tracks from a small number of artists/labels under one direct form that covers both works, worldwide Station use, necessary copies, Radio.co sublicensing, metadata, and the chosen schedule.
2. In parallel, audit a CC0/CC BY 4.0 fallback set from FMA, ccMixter, and Jamendo. Do not rely on hotlinks.
3. Trial Radio.co Standard for a stable HTTPS MP3 endpoint, ICY artist/title, fixed-order scheduling, logs, region controls, and failure behavior.
4. Do not call the result worldwide-cleared until operator- and listener-location review resolves mandatory local rights/remuneration.

If direct/open catalog audit fails, the recommendation becomes **no viable worldwide self-curated Station**. Live365 remains the sensible geofenced alternative, not a worldwide substitute.

## Playlist ranking

### Comparison

| Rank | Combination | Catalog and curation | Rights and geography | Attribution/reporting | Reliability, burden, and cost | Current contract fit | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1** | **Audius API streams + OML** | Millions of tracks, strong electronic participation, complete operator fixed-order curation; exact genre shortlist still needed | OML expressly covers worldwide reproduction, public performance, transmission, streaming, and sublicensing and warrants master+composition rights. Alternative Licenses, enforceability, non-waivable payments, and selected-track authority remain | Commercial use requires creator/copyright/OML/material URI; hobby use should still show artist/title/source. No usage reporting is promised; local obligations may remain | Free: 10 req/s and 500k req/mo; hosted streams and mirrors. No SLA, session-only cache, revocable access, $50 Audius liability cap | Requires a new Playlist manifest/cursor runtime. Need range/resume and end-transition tests | **Best managed lead; conditional, not ship-ready** |
| **2** | **Artist-direct files + R2 custom-domain delivery** | Best exact music fit and stable operator-selected catalog | A carefully scoped agreement can cover the precise Playlist controls and both layers worldwide; costly rights-chain work and local mandatory payments remain | Whatever the agreement requires; operator can keep exact title/artist/ISRC/owner data and per-device events | R2 Standard free tier: 10 GB-month, 1M Class A, 10M Class B requests; then $0.015/GB-month and $0.36/M Class B, with no egress fee. Custom API/player/reporting remains substantial | New Playlist runtime; R2 supports HTTPS custom domains, cache, CORS configuration, and range `GetObject` | **Best controllable fallback; conditional recommendation** |
| **3** | **Jamendo API streams + per-track CC terms** | More than 500k tracks and good electronic/hip-hop/relaxation filters; strong curation metadata | Every track is CC-labelled, but licences vary and artists alone are responsible. Select only audited terms suitable for exact controls; non-waivable local rights remain | Must credit artist and Jamendo and backlink each track; changes/removals must propagate | Free for noncommercial use; 500k-hit review threshold; no SLA; no persistent cache/offline. Provider supplies track streams and metadata | New Playlist runtime; test range/resume, URL stability, format support, and removal behavior | **Useful managed fallback, weaker rights assurance than Audius** |
| **4** | **Audited CC0/CC BY files from FMA/ccMixter/Openverse + R2** | Broadest open-source search, but large listening and provenance workload | Broad worldwide grants if valid; no repository title warranty. FMA requires self-hosting; Openverse does not verify licences | Full CC attribution and immutable rights records; custom usage accounting | Raw delivery likely within R2 free tier; operator owns ingestion, encoding, manifest, removals, and reports | New Playlist runtime; technically reliable static objects | **Viable only after track-by-track audit** |

### Why Audius ranks first, narrowly

Audius is the only reviewed candidate that currently joins all three useful layers:

1. A substantial hosted music catalog and search/stream API.
2. A music-specific public licence whose text expressly addresses third-party Music Players and both master and composition authority.
3. Free hobby-scale API limits and hosted playback.

It does **not** join territorial legal compliance, royalty reporting, or durable service guarantees. Its OML also allows an Alternative License, and the API terms prohibit persistent caching while permitting termination at any time. Those conditions prevent an unconditional recommendation. ([Audius OML](https://audius.org/open-music-license.pdf), [API Terms](https://audius.co/documents/ApiTerms.pdf))

The candidate Playlist should fetch or refresh authoritative track availability, then stream rather than retain audio. Persisting only a stable track id, cursor, and elapsed position is product state, but whether resuming via a byte range is permitted and technically supported still needs a provider test. No offline audio should be stored.

### Why direct files plus R2 remain valuable

This route gives the operator the deepest control over availability, bitrate, hashes, attribution, takedowns, and fixed order. R2 supports production custom domains and edge caching, and `GetObject` implements HTTP Range. Its public `r2.dev` address is rate-limited and explicitly non-production, so a custom domain is required. ([R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/))

At hobby scale, a 10 GB compressed catalog can remain in R2's free tier. Delivery egress is free, but reads are per-object Class B operations and cache configuration matters. Infrastructure cost excludes the manifest/API, device persistence, playback transitions, telemetry, privacy handling, rights administration, and any negotiated catalog fee. ([R2 pricing](https://developers.cloudflare.com/r2/pricing/))

### Playlist recommendation

Run an **Audius feasibility and rights confirmation** before acquiring or self-hosting files:

1. Curate a 20-track exact-fit fixed-order sample and record each track's OML or Alternative License, uploader, copyright notice, master/composition metadata, territory, and availability state.
2. Ask Audius in writing whether lofi.fm's free, ad-free fixed-order player with pause/resume and uncapped forward skip is a `Music Player`, whether OML sublicensing covers the terminal client and its dependencies, and whether any platform or local royalties/reporting remain.
3. Test HTTPS codec, 320 kbps claim, range/resume, no-seek playback, stream expiry, mirror fallback, rate accounting, geoblocking, deletion, and API-key architecture.
4. If those checks fail, seek direct artist grants and use R2. Do not substitute a Bandcamp purchase or ordinary royalty-free sync licence.

If neither Audius confirmation nor a direct/open track audit succeeds, the recommendation becomes **no viable worldwide Playlist**.

## Services and routes explicitly not recommended

| Candidate | Why it does not supply the required combination |
| --- | --- |
| **Spotify Platform** | Prohibits noninteractive webcasting, single-source playback to simultaneous listeners, mixing/overlap, and business-targeted services; streaming is Premium-only. It is not a catalog licence for either model. ([Developer Policy](https://developer.spotify.com/policy)) |
| **SoundCloud API** | Grants no User Content rights, expressly prohibits webcasting-radio apps and alternative aggregated streaming services, limits caching to a session, and requires the app to obtain all music licences. ([API Terms](https://developers.soundcloud.com/docs/api/terms-of-use)) |
| **Bandcamp downloads/streams** | Fan use is personal and noncommercial. The artist can separately license a track, but the purchase is only a source copy until that agreement exists. ([Terms](https://bandcamp.com/terms_of_use)) |
| **Jamendo Licensing paid catalog or In-Store** | The standard catalog licence requires synchronization with another project and expressly prohibits standalone streaming and compilations; In-Store is limited to background music in identified physical places. A custom agreement could differ, but published prices/terms do not fit. ([Terms of Sale](https://licensing.jamendo.com/en/legal/termsofsales)) |
| **Pixabay music** | Its Content License prohibits standalone distribution where content remains substantially in its original form and warns that other rights may apply. That conflicts with a music-only Station or Playlist. ([Content License](https://pixabay.com/service/license-summary/)) |
| **FMA hotlinks** | FMA has shut down its API and expressly prohibits apps from playing files hosted on FMA servers; approved music must be self-hosted under its per-track licence. ([App developers](https://freemusicarchive.org/app-developers)) |
| **Openverse results alone** | Openverse does not verify individual licences or generated attribution. It can discover candidates, never clear them. ([About](https://openverse.org/about)) |
| **Radio.co, Airtime, AzuraCast, R2 alone** | They solve storage, playout, or delivery and explicitly or effectively leave music rights to the operator. |

## Cost and scale snapshot

Prices were observed on 2026-08-19 and are not quotes. Taxes, exchange rates, rights advice, direct catalog fees, composition licences, and local mandatory remuneration are excluded.

| Service/path | Hobby entry | Material scale point | Rights included? |
| --- | --- | --- | --- |
| Radio.co Lite | $35/mo; 2 GB; 500 concurrent; 1 TB/~18k listening hours; up to 192 kbps | Standard $59/mo; 20 GB; 20k concurrent; 20 TB/~360k hours; adds track reports | No; terms expressly disclaim licensing ([pricing](https://radio.co/pricing), [terms](https://radio.co/terms)) |
| Airtime Pro Hobbyist | $9.95/mo; 10 listeners; 2 GB; 1 TB; 64 kbps | Starter $39.95/mo; two streams; 400 listeners/stream; 5 GB; 3 TB; 128 kbps | No ([pricing](https://www.airtime.pro/pricing/), [terms](https://www.airtime.pro/terms-and-conditions/)) |
| Live365 Broadcast 1 | $59/mo; 30 GB; 1,500 listening hours | $0.05 per excess listening hour; higher plans $99/$199/$499/$999 | US/Canada/Mexico, real-time metadata dependent; UK separately quoted; not worldwide ([pricing](https://live365.com/broadcaster/pricing)) |
| Audius API Free | $0; 10 requests/s; 500k requests/mo | Unlimited plan requires contact | OML for tracks without Alternative Licenses, subject to its limits and location-dependent rights ([plans](https://api.audius.co/plans), [OML](https://audius.org/open-music-license.pdf)) |
| Jamendo API | $0 for noncommercial API use | Contact Jamendo when likely to exceed 500k hits | Per-track CC terms only; artist responsible ([authentication](https://developer.jamendo.com/v3.0/authentication), [terms](https://devportal.jamendo.com/api_terms_of_use)) |
| Cloudflare R2 Standard | $0 up to 10 GB-month, 1M Class A, 10M Class B; no egress fee | $0.015/GB-month, $4.50/M Class A, $0.36/M Class B | None ([pricing](https://developers.cloudflare.com/r2/pricing/)) |
| US commercial statutory recording licence | $1,000/channel/year minimum | $0.0025 per nonsubscription performance in 2026 | Eligible US noninteractive sound recordings only; composition separate ([SoundExchange](https://www.soundexchange.com/service-provider/commercial-webcaster/)) |
| PPL 2026 Linear Webcast | GBP 207 + VAT/channel/year up to 150k performances | GBP 691 advance recouped at GBP 0.001380/performance for Band 3; overseas admin starts GBP 90 | Eligible linear recordings in 41 listed territories; PRS and gaps separate ([licence](https://www.ppluk.com/licensing/playing-music-online/linear-webcast-licence/), [territories](https://www.ppluk.com/wp-content/uploads/2025/11/PPL-Linear-Webcaster-Licence-Territories-2026.pdf)) |

At 128 kbps, one listener-hour is approximately 57.6 MB decimal. Rights costs and listening-hour plans therefore become more important than file storage quickly; R2's no-egress pricing is unusually favorable for Playlist delivery, while Station hosts price bundled listening capacity.

## Compatibility with lofi.fm

### Station

Radio.co, Live365, Airtime, or AzuraCast can ultimately expose one communal stream, which aligns with the existing `StationIntegration`: stable Station identity, one direct HTTPS MP3 or FLAC URL, honest provider/genre, attribution policy, pure metadata normalizer, and optional failure classifier. The chosen service still needs an empirical trial for:

- Stable provider-supported HTTPS MP3 or FLAC URL rather than an expiring dashboard/player URL.
- Correct content type and codec.
- ICY artist/title timing and malformed/missing behavior.
- Reconnect and concurrent-connection behavior.
- Country controls and authoritative listener/playout exports.

Rights evidence must remain reviewable documentation rather than a `lawful: true` field. CC source/licence information is richer than the current live artist/title display, so an implementation would need a durable way to expose or link required attribution without guessing from ICY.

### Playlist

No candidate is a data-only Station integration. The current runtime treats one URL as an endless live stream, clears attribution during Pause, and treats end-of-stream as failure. The Playlist needs a separate catalog/manifest and runtime for:

- Stable collection and track ids, fixed order, and loop behavior.
- Device cursor and elapsed-position persistence.
- Normal end-of-track advancement and forward skip.
- Pause/resume without adding seek, previous, shuffle, reordering, or direct selection.
- Authoritative per-track artist/title/source/licence metadata.
- Range or restart policy, stale/deleted-track handling, and event accounting.

Audius or Jamendo would add provider/API availability, token, removal, and metadata refresh behavior. R2 would add an app-owned manifest and CORS/cache configuration. None supplies the complete device cursor or royalty-event layer.

## Verified facts versus uncertainty

Verified as of the access date:

- The current published Audius OML contains the broad Music Player grant and uploader warranty described above; the current API Terms impose session-only caching, no legal warranty, revocability, and a $50 liability cap.
- Audius publishes the free 10 requests/second and 500,000 requests/month API tier.
- Jamendo publishes per-track CC and stream metadata, noncommercial API terms, attribution/backlink duties, and a 500,000-hit review threshold; its radio endpoint documentation says the stream does not work.
- Radio.co, Airtime Pro, Live365, R2, FMA, ccMixter, and the collecting-society pages publish the prices, limits, and restrictions quoted above.
- Spotify and SoundCloud expressly prohibit the contemplated webcasting uses.

Not verified:

- That any particular Audius, Jamendo, FMA, ccMixter, Openverse, Bandcamp, or artist-direct track has a complete enforceable worldwide chain of title for either model.
- That Audius OML has no Alternative License on a selected track, or that its uploader warranty eliminates territory-specific statutory or collective obligations.
- That any managed host's stream endpoint and metadata satisfy lofi.fm without a trial.
- Multi-region endpoint availability, soak reliability, takedown frequency, actual genre depth, or a service-level agreement for the API candidates.
- A worldwide composition/recording collective route or a hobby-priced turnkey Playlist-rights service.

Source-access limitations: PRS for Music's current deep links returned a generic licence page rather than stable tariff text, and current SOCAN/Re:Sound deep links were unavailable, so this note does not quote or infer those tariffs. Audius legal text is embedded as official PDFs; it was read from the linked `OpenMusicLicense.pdf` and `ApiTerms.pdf`. No provider or rightsholder was contacted, no account was provisioned, and no audio endpoint was load- or multi-region-tested.

## Checks and unknowns later decisions depend on

### Applies to both models

1. Choose the operator establishment and infrastructure locations, then identify obligations there and in every intended listener territory. Decide whether any geofencing is acceptable; if not, an uncovered material territory stops launch.
2. For every selected recording, retain the source URL, acquisition date, file hash, licence/agreement version, licensor identity, copyright notices, artist/title/album/label, ISRC where available, composition writers/publishers, PRO/CMO affiliations, and territory/term/takedown data.
3. Confirm that the grant covers both master and composition, all contributors and samples/covers, performers and neighboring rights, technical copies/transcoding, the exact transmission/control model, and sublicensing to hosts/CDNs/native playback dependencies.
4. Determine which local royalties or mandatory remuneration cannot be waived by a direct, CC, or OML grant. Do not infer the answer from `royalty-free`, `worldwide`, `open`, or an uploader warranty.
5. Define attribution presentation for creator, title, source, licence, provider, modifications, and any removal request; define durable reports independently of visible now-playing metadata.
6. Establish replacement/takedown handling and an audit cadence for provider terms, per-track licences, territories, prices, and catalog availability.

### Station-specific

7. Obtain sample direct artist/label grants and confirm whether artists will provide worldwide Station rights at hobby cost, including Radio.co/Airtime/Live365/AzuraCast sublicensing and server copies.
8. Ask Radio.co for a current trial confirmation of a stable direct HTTPS MP3 URL, ICY metadata, fixed-order AutoDJ behavior, TTSL fields, listener-country reports, uptime/support expectations, and whether Standard is required for every needed report.
9. Ask Audius whether a server-side communal playout that streams selected API tracks into a Radio.co/Airtime source is a permitted Music Player use, whether OML sublicensing reaches the host/listeners, and how session-only caching applies to buffering and transcoding.
10. If conventional repertoire remains a candidate, obtain Live365's UK add-on price and written statement for an operator outside US/Canada/Mexico, direct stream use in lofi.fm, uncovered listeners, metadata rules, ads, and geofencing. Do not expose uncovered territories.
11. Verify schedules comply with every applicable linear-programming rule, including source-copy, repeat, album/artist, advance-listing, metadata, and minimum-program-length conditions.

### Playlist-specific

12. Ask Audius to confirm in writing that the exact fixed-order, device-resumable, looping, uncapped-forward-skip design is a Music Player under the OML and API Terms, and identify any App User terms, attribution, reporting, territory, or payment obligations.
13. Verify OML versus Alternative License for every Audius track and whether the API exposes a reliable machine-readable licence URI, copyright owner, writers/publishers, ISRC, label, duration, deletion state, and geography.
14. Test Audius and Jamendo direct track URLs for HTTPS codec, byte ranges, elapsed-position resume, URL/token lifetime, API/mirror failover, deletion, rate accounting, listener concurrency, geographic variation, and no-offline-cache compliance.
15. Decide whether resume restarts the track or restores elapsed time when byte ranges are unavailable; preserve the product's prohibition on user seeking.
16. Define trustworthy `selected`, `started`, `completed`, `skipped`, and `failed` events, privacy retention, and contract/territory reports. A client GET is not proof of audible playback.
17. For the R2 fallback, secure direct artist grants before upload; configure a production custom domain, CORS, cache/range behavior, immutable object versions, private origin administration, takedowns, and a manifest that cannot accidentally expose unsupported controls.
18. Sample at least 20 releasable tracks per desired genre before treating Audius, Jamendo, FMA, or ccMixter's broad electronic tags as sufficient musical fit.
