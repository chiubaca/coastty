# Ready-Made Station Sources

Research performed on 2026-08-19. This is a product-source assessment, not legal advice.

## Executive answer

**FluxFM ChillHop is the best new ready-made Station lead, but no newly researched source is ready to add without a policy or integration decision.** FluxFM describes the Station as hand-picked instrumentals between lofi and light G-funk and publishes a stable HTTPS MP3 URL specifically for external players. Its general terms nevertheless limit FluxMusic to private consumer use, and its ICY title was only the static value `ChillHop`, not current artist/title. It therefore needs provider clearance and either better metadata or an explicit change to lofi.fm's attribution contract. ([Station page](https://fluxfm.de/channels/chillhop), [external-player URLs](https://www.fluxfm.de/flux-musik-streams), [terms](https://fluxfm.de/nutzungsbedingungen))

**Loca FM Melodic Techno and Nightride FM Chillsynth are the strongest technical alternatives.** Both delivered no-key HTTPS MP3 continuously for a ten-second probe and exposed parseable artist/title ICY metadata. Loca is an exact melodic-techno expansion with an endpoint published in its official player, but its legal notice reserves audio rights and grants no standalone-app use. Nightride is an adjacent chillsynth choice with good metadata, but no provider terms or supported public MP3 integration commitment was found. ([Loca player](https://www.locafm.com/melodic-techno/player.html), [Loca legal notice](https://www.locafm.com/pagina/aviso-legal.html), [Nightride Stations](https://nightride.fm/stations))

**Nightwave Plaza remains the only reviewed source with an affirmative third-party stream grant.** It permits free, ad-free apps to use the stream if they identify Nightwave Plaza and show current artist/title. It is the incumbent vaporwave/future-funk Station, not a new genre expansion. ([Nightwave Plaza legal notice](https://plaza.one/terms/legal.html))

The practical ready-made path is therefore:

1. Keep Nightwave Plaza under its existing conditions.
2. Treat FluxFM ChillHop as the first provider-clearance and metadata investigation for exact lofi coverage.
3. Treat Loca FM Melodic Techno and Nightride FM Chillsynth as the best technically complete alternatives for melodic-techno and chill-electronic range.
4. Use Ambient Sleeping Pill as a lower-risk technical ambient fallback only after its rights and HTTPS expectations are clarified.
5. Do not use SomaFM, Chillhop Music, or laut.fm: their current first-party terms expressly reject the contemplated third-party use.

Public reachability is evidence of technical availability, not a conclusion about copyright, public-performance, communication-to-the-public, trademark, or other obligations in the operator's or listeners' jurisdictions.

## Ranking method

Candidates were ranked for a public, worldwide, free hobby project by:

1. Honest musical fit with lofi.fm's focused and adjacent range.
2. A provider-controlled or empirically stable HTTPS MP3/FLAC endpoint requiring no account or key.
3. Current artist/title metadata and provider attribution quality.
4. Fit with the current `StationIntegration`: direct HTTPS MP3/FLAC, validated content type, stable identity, and current artist/title attribution supplied through stream metadata.
5. First-party terms, stream-use language, rights claims, and business-model conflict.
6. Reliability and worldwide-reach evidence.
7. Listener and operator cost at hobby scale.

The ordering favors practical integration, but it does not convert missing permission into permission. A higher rank means "investigate first," not "legally cleared."

## Incumbent baseline

| Station | Observed facts | Unresolved risk |
|---|---|---|
| **Nightwave Plaza** | Vaporwave/future funk; official terms expressly allow free, ad-free third-party apps with Station plus current artist/title attribution. `https://radio.plaza.one/mp3` returned `200 audio/mpeg`, MP3 128 kb/s, and parseable artist/title ICY metadata. Its no-key [status API](https://api.plaza.one/status) also returned current artist/title. | Adjacent rather than exact lofi or techno. No SLA, geographic-rights promise, worldwide availability statement, or endpoint-longevity promise was found. The conditional grant must be rechecked before release. |

## Ranked expansion candidates

| Rank | Station | Why it ranks here | Endpoint and metadata | Terms, rights, cost, and reach risk | Current contract fit |
|---|---|---|---|---|---|
| **1** | **FluxFM ChillHop** | Best exact lofi/chillhop lead. FluxFM describes hand-picked instrumentals between lofi and light G-funk and explicitly publishes stream URLs for external players. ([Station](https://fluxfm.de/channels/chillhop), [URLs](https://www.fluxfm.de/flux-musik-streams)) | Stable provider URL `https://channels.fluxfm.de/chillhop/externalembedflxhp/stream.mp3` redirected twice to a signed CDN URL, then returned `200 audio/mpeg`; MP3 44.1 kHz stereo, 320 kb/s. ICY was present, but `StreamTitle` was only `ChillHop`. | General terms say use is free and advertising-funded but offered only for private purposes to consumers; unlicensed exploitation requires consent and framing needs permission. This is not an app grant. No SLA, app traffic allowance, fee schedule, or worldwide availability promise was found. ([Terms](https://fluxfm.de/nutzungsbedingungen)) | **Endpoint yes; attribution no.** The stable redirector is suitable, but the observed stream cannot supply required current artist/title. |
| **2** | **Loca FM Melodic Techno** | Exact melodic-techno coverage and the strongest fully observed technical fit. The official player labels the channel and embeds its direct endpoint. ([Player](https://www.locafm.com/melodic-techno/player.html)) | `https://s2.we4stream.com/listen/loca_melodic_techno/live` returned `200 audio/mpeg`; MP3 44.1 kHz stereo, 128 kb/s; ICY genre/name and `Armen Miran & Nicolas Rada - Pull` artist/title observed. | The legal notice reserves audio rights, prohibits commercial reproduction/distribution/public communication without authorization, and only discusses copying/storage for personal private use. It does not authorize a standalone free app. The official player is ad-supported, creating business-model risk. No SLA, fee, traffic, or geographic policy was found. ([Legal notice](https://www.locafm.com/pagina/aviso-legal.html)) | **Technical yes; review no.** A pure delimiter normalizer fits, but provider permission and branding expectations remain unresolved. |
| **3** | **Nightride FM Chillsynth** | Strong chill-electronic expansion. The operator describes Chillsynth/Chillwave/Instrumental and a 320 kb/s electronic platform. ([Stations](https://nightride.fm/stations)) | `https://stream.nightride.fm/chillsynth.mp3` returned `200 audio/mpeg`; MP3 44.1 kHz stereo, 320 kb/s; `Hello Meteor - Device Security` artist/title observed. The ICY Station name was an opaque generated id. | No first-party terms or third-party-client grant was found. The official page did not present this MP3 URL as a supported integration contract. Its [Stream Safe](https://nightride.fm/streamsafe) offering concerns creator use of selected music, not use of the radio stream. No SLA, fee, traffic, or geographic policy was found. | **Technical yes; endpoint commitment no.** App-owned identity avoids the opaque ICY name, and a pure artist/title normalizer fits. |
| **4** | **Ambient Sleeping Pill** | Distinctive ambient expansion with low-attention fit. The operator describes an ad-free, beat-free stream for sleep, meditation, study, and relaxation and publishes direct links for external players. ([Official site and stream links](https://ambientsleepingpill.com/stream-links)) | The published direct URL is plaintext HTTP. The empirically upgraded `https://radio.stereoscenic.com/asp-s` returned `200 audio/mpeg`; MP3 44.1 kHz stereo, 128 kb/s; `Kwajbasket - Freqzcks` artist/title observed. | No terms, downstream app grant, broadcast-rights statement, SLA, traffic policy, fee, or worldwide availability promise was found. The operator says the project began to share obscure music "with the world," but that is not geographic-rights evidence. HTTPS works now but is not the URL the provider publishes. | **Technical yes, with endpoint caveat.** Metadata fits; obtain confirmation that HTTPS and third-party app playback are supported. |
| **5** | **Lofi Cafe Chilling** | Exact lofi hip-hop/downtempo fit. The provider calls it hand-picked, ad-free, no-account lofi and also offers Studying and Japanese Lofi variants. ([Chilling](https://loficafe.net/chilling)) | `https://radio.loficafe.net/listen/chilling/radio.mp3` returned `200 audio/mpeg`; MP3 44.1 kHz stereo, 192 kb/s. ICY title was filename-like: `fashion-chill-hip-hop-fashionably-cool-231558`, not credible artist/title. | No first-party terms, music-rights statement, direct-client grant, SLA, traffic policy, fee, or geographic policy was found. The site offers its own embeddable player, which is narrower than permission for a separate app using the raw URL. | **Endpoint yes; attribution no.** The current stream can at most produce partial title attribution without guessing. |
| **6** | **UZIC** | Useful range from downtempo and deep house through melodic/dark techno. Its team reviews submissions and says selected audio will be broadcast. ([Submission page](https://uzic.ch/submit-music/)) | `https://uzic.ice.infomaniak.ch/uzic-128.mp3` returned `200 audio/mpeg`; MP3 44.1 kHz stereo, 128 kb/s. ICY carried a DJ/set-level title, `JAY CASTELLI - 016 1.Class Boardning Pass by JAY CASTELLI Airlines 1/2`, rather than demonstrated track-level metadata. | Terms say no use of site content is permitted without written consent and availability may change without notice. The submission form gives no visible downstream-app grant. The first-party purpose page describes a 2025 festival period even though the stream remained live in this test, weakening continuity evidence. ([Terms](https://uzic.ch/conditions-en/), [purpose](https://uzic.ch/purpose-of-muzic-radio/)) | **Endpoint yes; attribution variable; consent required.** Scheduling can move across the genre range, so it is not a fixed melodic-techno Station. |
| **7** | **EILO Ambient & Chill Radio** | Broadens ambient/chill coverage and belongs to an international multichannel electronic platform. ([About](https://eilo.org/about.php)) | The official M3U resolved to `http://eilo.org:8000/ambient`, which returned `200 audio/mpeg`; MP3 44.1 kHz stereo, 128 kb/s, with show-level `MDB - Beautiful Voices 008` metadata. HTTPS on port 8000 timed out. ([Official M3U](https://eilo.org/getm3u.php?m3u=ambient)) | The site says its "whole content" is Creative Commons but names no license. Its terms grant no commercial license, its copyright page preserves third-party rights, and contributor terms grant use to EILO rather than downstream clients. Those statements do not establish reusable stream rights. No SLA or geographic policy was found. ([Terms](https://eilo.org/terms.php), [copyright](https://eilo.org/copyright.php), [submission terms](https://eilo.org/content-submission.php)) | **No.** Plaintext-only observed delivery fails the current HTTPS contract; metadata appears show-level rather than per-track. |

## Explicit exclusions

| Provider | Musical value | First-party reason not to use |
|---|---|---|
| **SomaFM** | Fluid, Beat Blender, Groove Salad, Drone Zone, and other channels fit well. | Terms updated 2026-07-30 say SomaFM cannot grant permission for new third-party clients, including noncommercial apps, and forbid app embedding without prior written permission. ([Terms](https://somafm.com/contact/tos.html)) |
| **Chillhop Music** | Exact chillhop/lofi fit. | Terms updated 2026-08-17 restrict the service to personal noncommercial use, prohibit hotlinking media or using content in apps without a separate license, and state that streaming in the service is not a license elsewhere. ([Terms](https://chillhop.com/about/terms-of-service/)) |
| **laut.fm** | Its user-generated directory includes relevant Stations and the provider says it pays streaming fees plus GEMA/GVL licenses. | Terms restrict the service to private use and expressly prohibit embedding provider audio streams on third-party websites. They also disclaim continuous availability. ([Terms, sections 2 and 6](https://laut.fm/pages/terms_and_conditions)) |

Other broadened screens did not outrank the shortlist. Radio Record has an exact [Lo-Fi channel](https://radiorecord.ru/station/lofi), and dinamo.fm has [CAFFE and SLEEP](https://dinamo.fm/content/4/channels), but no stable first-party-published HTTPS MP3 endpoint and downstream app terms were verified for either. Intergalactic FM offers electronic radio and apps, but the reviewed first-party page did not identify a steady lofi, ambient, chillhop, or melodic-techno Station with a qualifying direct endpoint. ([Intergalactic FM](https://www.intergalactic.fm/))

## Empirical endpoint results

### Procedure

Testing ran from the repository environment at approximately 10:44 UTC on 2026-08-19.

1. Requested each candidate with TLS verification enabled, redirects followed, `Icy-MetaData: 1`, and a ten-second cutoff.
2. Recorded redirects, final status, content type, received bytes, and ICY headers.
3. Used FFprobe with a five-second network timeout to identify codec, sample rate, channels, nominal bitrate, and current metadata.
4. Treated a timeout after continuous bytes as the expected end of a bounded live-stream pull, not a failure.

| Endpoint | Result | Ten-second pull | FFprobe and ICY result |
|---|---|---|---|
| Nightwave Plaza | `200 audio/mpeg`, no redirect | 221,656 bytes, continuous to cutoff | MP3 128 kb/s; Station and parseable artist/title |
| FluxFM ChillHop | Two redirects, then `200 audio/mpeg` | 581,114 bytes, continuous to cutoff | MP3 320 kb/s; Station metadata, static title only |
| Lofi Cafe Chilling | `200 audio/mpeg`, no redirect | 298,505 bytes, continuous to cutoff | MP3 192 kb/s; Station metadata, filename-like title |
| Nightride Chillsynth | `200 audio/mpeg`, no redirect | 919,847 bytes, continuous to cutoff | MP3 320 kb/s; opaque Station name, parseable artist/title |
| Loca FM Melodic Techno | `200 audio/mpeg`, no redirect | 220,759 bytes, continuous to cutoff | MP3 128 kb/s; genre, Station, and parseable artist/title |
| Ambient Sleeping Pill HTTPS | `200 audio/mpeg`, no redirect | 409,672 bytes, continuous to cutoff | MP3 128 kb/s; Station, genre, and parseable artist/title |
| UZIC | `200 audio/mpeg`, no redirect | 274,713 bytes, continuous to cutoff | MP3 128 kb/s; opaque Station name and set-level title |
| EILO HTTP | `200 audio/mpeg`, no redirect | 219,861 bytes, continuous to cutoff | MP3 128 kb/s; Station and show-level title |
| EILO HTTPS on port 8000 | Connection timeout | 0 bytes | No supported stream established |

Transfer counts include server buffering and ICY overhead and are not bitrate measurements. A ten-second pull is endpoint evidence, not uptime history.

## Cost, reliability, and worldwide reach

- Every successful endpoint accepted a connection without an account, token, API key, or payment. No candidate published a third-party app price or hobby traffic allowance. This means the observed marginal playback cost to lofi.fm is zero today, not that unlimited use is promised.
- No candidate publishes an SLA for this use. The tests did not include soak, reconnection, concurrency, load, or multi-day uptime sampling. Provider/CDN redirects and hostnames can change.
- No multi-region test was performed. All positive results prove reachability only from this environment. "International," "with the world," or a worldwide artist submission form is not proof that a provider has worldwide listener rights or lacks geoblocking.
- Direct playback makes each listener a connection to the provider, so lofi.fm would not pay relay bandwidth. At scale, the provider bears that traffic and may block, rate-limit, require a commercial agreement, or withdraw an endpoint.
- Except for Nightwave Plaza, no reviewed source states attribution rules for a third-party app. lofi.fm should still show the honest provider/Station identity and only show artist/title that the source actually supplies.

## Decision support

| Goal | Preferred lead | Fallback | Stop condition |
|---|---|---|---|
| Exact lofi/chillhop | FluxFM ChillHop | Lofi Cafe Chilling | Do not integrate if provider use remains limited to private listening or truthful artist/title cannot be supplied under the chosen contract. |
| Melodic or chill techno | Loca FM Melodic Techno | UZIC | Do not integrate without resolving the provider's restrictive or consent-based terms and the operator-jurisdiction obligations. |
| Chill-electronic adjacent | Nightride FM Chillsynth | Nightwave Plaza incumbent | Do not treat the MP3 URL as stable until the provider confirms third-party client use and endpoint expectations. |
| Ambient | Ambient Sleeping Pill | EILO only after HTTPS and rights clarification | Do not ship a plaintext endpoint or infer a downstream license from EILO's unspecified Creative Commons statement. |

No new child ticket is required before the final source-strategy decision: the map explicitly permits public endpoints to be considered while exposing unresolved rights. If the final recommendation selects one of these sources for implementation, provider-specific permission, endpoint, traffic, attribution, and geographic questions become release gates for that selected source.
