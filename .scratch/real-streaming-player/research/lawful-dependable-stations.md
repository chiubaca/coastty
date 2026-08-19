# Lawful and Dependable Stations

## Executive answer

**The required set of 4-6 Stations cannot be verified to the stated legal standard.** This research found only **one conditional recommendation**, Nightwave Plaza. Its operator explicitly permits third-party apps to use the stream without special permission, provided the app is free, contains no ads, identifies Nightwave Plaza, and shows the current artist and track title. The same first-party legal notice says the broadcast music was submitted by authors or right holders. ([Nightwave Plaza legal notice](https://plaza.one/terms/legal.html))

Nightwave Plaza is technically strong but only **chill-adjacent**, not an exact lofi hip-hop or melodic-techno Station: the operator describes it as vaporwave and future funk, and the stream advertises `icy-genre: Vaporwave`. ([Official Nightwave Plaza repository](https://github.com/nightwaveplaza/plaza#readme)) It therefore cannot, by itself, satisfy the requested genre span.

Several much closer genre matches were publicly reachable and technically compatible, including Lofi Cafe, Nightride FM Chillsynth, UZIC, and Loca FM Melodic Techno. They are not defensible defaults because their first-party terms either do not authorize a standalone third-party player, authorize only the provider's iframe, reserve content use, or are silent. SomaFM and Chillhop are explicit rejections: their current terms forbid the contemplated third-party app use. Public reachability is not treated as permission.

**Decision:** retain Nightwave Plaza as a conditional candidate, but do not resolve the product's 4-6 Station requirement from this list. Obtain written permission from enough backup providers, identify additional providers with Nightwave-like stream-use grants, or revisit the destination constraint. This is an evidence-based product recommendation, not legal advice.

## Selection criteria

A Station had to pass every mandatory gate:

1. **No account, token, or API key:** playback must work from a clean direct URL.
2. **OpenTUI-compatible audio:** a direct MP3 or FLAC stream, not AAC/M4A, Ogg/Opus, or HLS-only delivery.
3. **Provider authorization:** first-party evidence must cover third-party app playback or stream use. A public URL, an official web player, a playlist file, directory inclusion, or permission to embed an official iframe is not by itself permission to build a standalone client.
4. **Lawful-provider evidence:** the operator must make a credible first-party rights/licensing statement or otherwise expressly take responsibility for the broadcast. This does not independently prove rights in every recording.
5. **Required musical fit:** the set must span lofi hip-hop and chill or melodic techno. Adjacent genres are identified as such rather than relabeled.
6. **Endpoint fitness:** HTTPS, successful direct GET, credible content type and codec signature, supported codec, and no account challenge or mixed-content redirect.
7. **Basic dependability:** a continuous short pull without premature disconnect, useful metadata where available, and no immediately visible endpoint or policy instability. A 15-second probe is not an uptime history or SLA.

## Recommended Stations

This table intentionally has one row. Adding technically playable but unauthorized streams would conceal the central research result.

| Station | Genre and fit | Official page | Direct endpoint | Observed format, content type, and status | Metadata | Provider permission / terms evidence | Required attribution | Risks |
|---|---|---|---|---|---|---|---|---|
| **Nightwave Plaza** | Vaporwave / future funk according to the operator; chill-adjacent, but not exact lofi hip-hop or melodic techno. ([Official repository](https://github.com/nightwaveplaza/plaza#readme)) | [plaza.one](https://plaza.one/) | `https://radio.plaza.one/mp3` | Direct HTTPS GET, no redirect, `200`, `audio/mpeg`; FFprobe identified MP3, 44.1 kHz stereo, 128 kb/s; bytes began `ff fb`, an MPEG audio frame sync. Two 15-second pulls received 300,460 and 302,654 bytes at about 20 KB/s without premature closure. | ICY is present: `icy-metaint: 16000`, `icy-name: Nightwave Plaza`, and artist/title `StreamTitle` (observed `desert sand feels warm at night - 返答待ち`). The no-key [official status endpoint](https://api.plaza.one/status) also returns current artist/title. | **Explicit, conditional permission.** “Anyone can use our online stream” and resources without special permission; an app must be free and ad-free. The notice also says all broadcast music was submitted by authors or right holders. ([Legal notice](https://plaza.one/terms/legal.html)) | Show **Nightwave Plaza** and the current **artist name and track title**. ([Legal notice](https://plaza.one/terms/legal.html)) | The app must remain free and ad-free. Genre is adjacent rather than exact. The official [M3U](https://plaza.one/plaza.m3u) still publishes plaintext `http://radio.plaza.one/mp3`; that HTTP endpoint did **not** redirect to HTTPS in this environment, so use the empirically verified HTTPS form. No SLA, geographic-rights promise, or endpoint-longevity promise was found. Terms have no visible revision date. One Station/provider is not a resilient set. |

### Recommendation conditions

- Confirm before release that lofi.fm is free to use and has no advertising. Otherwise Nightwave Plaza's grant does not apply. ([Legal notice](https://plaza.one/terms/legal.html))
- Render the provider's name and live artist/title whenever playback is active. ICY supplies both in one `StreamTitle`; the official status API is a fallback, not required for playback.
- Use `https://radio.plaza.one/mp3`, not the plaintext URL in the official playlist.
- Recheck the legal notice and endpoint before each release because neither permission nor availability is irrevocable.
- Treat Nightwave Plaza as a chill-electronic fallback, not as evidence that the lofi-hip-hop and melodic-techno span has been met.

## Rejected and backup candidates

“Backup” means worth contacting for written permission, not safe to ship now.

| Candidate | Genre fit and first-party source | Endpoint / empirical result | Permission evidence | Disposition and operational risks |
|---|---|---|---|---|
| **Lofi Cafe - Chilling** | Exact lofi hip-hop / downtempo fit. The [official Station page](https://loficafe.net/chilling) calls it mellow lofi hip-hop, downtempo beats, and jazz-influenced instrumentals. | `https://radio.loficafe.net/listen/chilling/radio.mp3`: no-key HTTPS `200 audio/mpeg`; MP3 44.1 kHz stereo, 192 kb/s; `ff fb` MPEG frame sync; `icy-metaint: 16000`; title metadata present. A 15-second pull received 413,852 bytes without premature closure. The URL pattern is published in [Lofi Cafe's own deployed client code](https://loficafe.net/_next/static/chunks/09lt1e-o1xyzn.js). | The homepage says each Station has an [embeddable provider player](https://loficafe.net/embed/chilling), but no terms or statement authorizing a different app to hotlink and play the raw stream was found. Permission to embed an iframe is narrower than direct playback. No first-party music-rights or licensing statement was found. | **Backup pending written permission and rights confirmation.** Technically excellent. Metadata was filename-like (`liosound lofi-soul-vlog main`), which may not reliably provide artist/title. No SLA or rate-limit policy found. |
| **Lofi Cafe - Studying** | Exact lofi focus fit. ([Official Station page](https://loficafe.net/studying)) | `https://radio.loficafe.net/listen/studying/radio.mp3`: FFprobe identified no-key HTTPS MP3, 44.1 kHz stereo, 192 kb/s, with ICY title metadata. | Same iframe-only evidence and missing direct-client/rights policy as Chilling. | **Backup pending written permission.** Not given a full 15-second stability pull; observed title was filename-like (`lofi-study-beat-22-255267`). |
| **Lofi Cafe - Japanese Lofi** | Exact lofi hip-hop / jazz-hop fit. ([Official Station page](https://loficafe.net/japanese-lofi)) | `https://radio.loficafe.net/listen/japanese-lofi/radio.mp3`: FFprobe identified no-key HTTPS MP3, 44.1 kHz stereo, 192 kb/s, with ICY title metadata. | Same iframe-only evidence and missing direct-client/rights policy as Chilling. | **Backup pending written permission.** Not given a full 15-second stability pull; observed title was filename-like (`china asia japan lofi full version`). |
| **Nightride FM - Chillsynth** | Chillsynth / chillwave / instrumental; useful chill-electronic fit. ([Official Stations page](https://nightride.fm/stations)) | `https://stream.nightride.fm/chillsynth.mp3`: no-key HTTPS `200 audio/mpeg`; MP3 44.1 kHz stereo, 320 kb/s; `icy-metaint: 16000`; `StreamTitle` present. A 15-second pull received 1,103,231 bytes without premature closure. | No terms or first-party third-party-client grant was found. The official page's no-script audio element currently points to `https://stream.nightride.fm/nightride.m4a`, an unsupported M4A/AAC variant; the MP3 URL worked but was not presented as a stable public integration contract. The [Stream Safe page](https://nightride.fm/streamsafe) concerns music for creators, not permission to distribute a radio client. | **Backup pending written permission and a stable MP3 commitment.** Station header was an opaque generated name rather than the brand. No SLA or rate-limit/geography policy found. |
| **UZIC** | Strong chill-techno range: the operator solicits downtempo, deep house, minimal, tech-house, and melodic/dark techno. ([Official submission page](https://uzic.ch/submit-music/)) | `https://uzic.ice.infomaniak.ch/uzic-128.mp3`: this MP3 source is published in the [official page HTML](https://uzic.ch/); no-key HTTPS `200 audio/mpeg`; MP3 44.1 kHz stereo, 128 kb/s; `icy-metaint: 16000`; `StreamTitle` present. A 15-second pull received 352,442 bytes without premature closure. | The operator is a Swiss non-profit that says UZIC broadcasts 24/7 and exists to expose alternative creators. ([Purpose page](https://uzic.ch/purpose-of-muzic-radio/)) However, its terms state that no use of site content is permitted without written consent; no exception for third-party stream clients was found. ([Terms](https://uzic.ch/conditions-en/)) Artist submission for possible broadcast is evidence of curation, not a clear downstream app grant. | **Reject unless written consent is obtained.** Exact scheduling varies from downtempo through techno rather than a fixed melodic-techno sound. The stream is hosted by Infomaniak and sets a listener cookie. No SLA found. |
| **Loca FM Melodic Techno** | Exact melodic-techno fit. The official player labels it “Canal Melodic Techno.” ([Official player](https://www.locafm.com/melodic-techno/player.html)) | `https://s2.we4stream.com/listen/loca_melodic_techno/live`: source published in official player HTML; no-key HTTPS `200 audio/mpeg`; MP3 44.1 kHz stereo, 128 kb/s; `icy-metaint: 16000`; `icy-genre: Melodic Techno`; artist/title present. A 15-second pull received 298,489 bytes without premature closure; bytes began `ff fb`. | The legal notice reserves audio rights, prohibits reproduction/distribution/public communication for commercial purposes without authorization, and limits copying/storage language to personal and private use. It does not grant standalone noncommercial app playback. ([Loca FM legal notice](https://www.locafm.com/pagina/aviso-legal.html)) | **Reject unless written permission is obtained.** Third-party host URL can churn; no SLA, geography policy, or attribution scheme found. The official player is advertising-supported, so a separate client may affect its business model. |
| **SomaFM Fluid** | Instrumental hip-hop, future soul, chilled trap, and electronica; a good lofi-adjacent fit. ([Official Station page](https://somafm.com/fluid/)) | Official playlist points to `https://ice6.somafm.com/fluid-128-mp3` and alternates. ([Official PLS](https://somafm.com/fluid.pls)) FFprobe reached the alternate `ice2` endpoint and identified MP3, 44.1 kHz stereo, 128 kb/s. Direct curl GETs to `ice6` and `ice2` returned an empty reply in this environment, showing client/server sensitivity. | **Explicitly disallowed.** Current terms say SomaFM cannot grant permission for new third-party clients, even noncommercial ones, and prohibit embedding in an application without prior written permission. ([Terms of Service](https://somafm.com/contact/tos.html)) The API is also [closed to third parties](https://somafm.com/linktous/api.html). | **Reject.** Legal prohibition is decisive. Direct server URLs can change; SomaFM says playlists are permanent but direct servers are not, and direct links are for individual personal use. ([Direct-link policy](https://somafm.com/groovesalad/directstreamlinks.html)) |
| **SomaFM Beat Blender** | Deep house and downtempo chill; the stream identifies genre as `Downtempo House Techno`. ([Official Station page](https://somafm.com/beatblender/)) | Official playlist publishes MP3 alternates. ([Official PLS](https://somafm.com/beatblender.pls)) FFprobe reached `https://ice2.somafm.com/beatblender-128-mp3` and identified MP3, 44.1 kHz stereo, 128 kb/s. A direct curl GET returned an empty reply. | Same explicit third-party-client refusal as Fluid. ([Terms of Service](https://somafm.com/contact/tos.html)) | **Reject.** Legal prohibition is decisive; same endpoint-churn and client-sensitivity risks as Fluid. |
| **Chillhop Radio** | Exact chillhop / lofi hip-hop fit. ([Official livestream](https://chillhop.com/radio/)) | Not endpoint-tested after failing the policy gate. | **Explicitly unsuitable.** Terms limit the service to personal, noncommercial use; prohibit hotlinking media URLs or using content in apps without a separate licence; and say access through the service is not permission to use content elsewhere. ([Terms of Service](https://chillhop.com/about/terms-of-service/)) The creator FAQ separately says the website livestream may not be used as a source and requires a signed-in programme for designated tracks. ([Creators FAQ](https://chillhop.com/creators/)) | **Reject.** Even the creator licence is account-based and does not license the livestream as a Station source. |
| **laut.fm Stations** | Its directory includes potentially relevant user-generated Stations. | Not endpoint-tested after failing the policy gate. Public MP3 reachability would not cure the terms issue. | Provider terms say laut.fm pays streaming fees and GEMA/GVL licences, but also say users may use the service only privately and expressly prohibit embedding provider audio streams on third-party websites. Only links that leave the third-party site for laut.fm are allowed. ([laut.fm terms, §§2 and 6](https://laut.fm/pages/terms_and_conditions)) | **Reject for in-app playback.** User-generated Station content creates additional quality/churn risk, and the provider disclaims continuous availability. |

## Why public endpoints were not enough

- **Public and playable:** Lofi Cafe, Nightride, UZIC, Loca FM, SomaFM, and Nightwave Plaza all exposed or operated endpoints that a client could reach at least through FFprobe.
- **Explicit app permission:** only Nightwave Plaza published a first-party grant broad enough for this free, ad-free standalone app. ([Legal notice](https://plaza.one/terms/legal.html))
- **Explicit refusal:** SomaFM and Chillhop directly foreclose the contemplated use. laut.fm forecloses embedded playback.
- **Policy silence or narrower permission:** Lofi Cafe permits embedding its own iframe; Nightride publishes a player; UZIC and Loca publish stream URLs in their players. None of those facts independently grants this app permission to play the raw stream.

## Empirical method and observations

### Date and environment

Testing was performed from the repository environment on **2026-08-19, approximately 08:18-08:20 UTC**. Results establish reachability from this environment only. They do not establish worldwide availability, absence of geoblocking, or long-term uptime.

### Procedure

1. Located genres, stream URLs, rights statements, and terms in station/provider first-party pages, deployed first-party client source, official playlists, and direct APIs.
2. Requested each promising endpoint with `curl -L`, certificate verification enabled, a 15-second maximum, and `Icy-MetaData: 1`.
3. Recorded redirect chain, final URL, HTTP status, content type, headers, byte count, transfer duration, and whether the server ended the connection early.
4. Used FFprobe with a five-second read timeout to identify codec, sample rate, channels, nominal bitrate, ICY tags, and current `StreamTitle`.
5. Sampled initial bytes without requesting ICY metadata for selected endpoints and checked for an MPEG audio frame sync (`ff fb`).
6. Probed the recommended endpoint twice for 15 seconds. A curl timeout after continuously receiving bytes is the expected end condition for a live stream; it is not a stream failure.

Representative commands:

```sh
curl -L --max-time 15 -H "Icy-MetaData: 1" -o /dev/null -D - \
  "https://radio.plaza.one/mp3"

ffprobe -v error -rw_timeout 5000000 \
  -show_entries stream=codec_name,sample_rate,channels,bit_rate:format=format_name:format_tags \
  -of json "https://radio.plaza.one/mp3"
```

### Endpoint summary

| Endpoint | Redirect / status / type | 15-second behavior | Codec and metadata result |
|---|---|---|---|
| Nightwave Plaza HTTPS | 0 redirects; `200`; `audio/mpeg` | 300,460 bytes, then 302,654 bytes on repeat; continuous to test cutoff | MP3 128 kb/s; ICY interval and artist/title present; MPEG frame signature confirmed |
| Nightwave Plaza HTTP from official M3U | 0 redirects; `200`; `audio/mpeg` over plaintext HTTP | 301,908 bytes; continuous to cutoff | Same stream, but mixed-content/integrity risk; do not use |
| Lofi Cafe Chilling | 0 redirects; `200`; `audio/mpeg` | 413,852 bytes; continuous to cutoff | MP3 192 kb/s; ICY interval/title present; MPEG frame signature confirmed |
| Nightride Chillsynth | 0 redirects; `200`; `audio/mpeg` | 1,103,231 bytes; continuous to cutoff | MP3 320 kb/s; ICY interval/title present |
| UZIC MP3 | 0 redirects; `200`; `audio/mpeg` | 352,442 bytes; continuous to cutoff | MP3 128 kb/s; ICY interval/title present |
| Loca FM Melodic Techno | 0 redirects; `200`; `audio/mpeg` | 298,489 bytes; continuous to cutoff | MP3 128 kb/s; ICY interval/title present; MPEG frame signature confirmed |
| SomaFM Fluid / Beat Blender alternates | No usable curl response (`000`, empty reply) in direct tests | Failed in under one second with curl | FFprobe nevertheless connected and identified MP3 128 kb/s, demonstrating client-sensitive behavior |

Transfer byte counts include buffering and ICY overhead and should not be interpreted as exact encoded bitrates. All tested HTTPS endpoints passed curl's default certificate and hostname verification. The recommended endpoint additionally presented a certificate for `radio.plaza.one`, issued by Sectigo and valid from 2026-05-18 through 2026-12-02 at test time.

### What was not proven

- No multi-hour soak, multi-day uptime sampling, reconnection test, concurrent-listener test, or load test was performed.
- No VPN or multi-region testing was performed, so geoblocking remains unknown.
- No rate-limit headers appeared on the direct streams, but this does not prove rate limits are absent.
- ICY metadata was sampled at one point in time. It may be missing or malformed for individual tracks.
- A provider's claim that submitters hold rights is evidence about its process, not an independent audit of every recording or every listener jurisdiction.
- Streaming licences and provider terms can change. Revalidation is required before release and periodically afterward.

## Defensible path to 4-6 Stations

1. Keep Nightwave Plaza only if the product remains free/ad-free and implements its attribution exactly.
2. Ask Lofi Cafe for written permission covering direct MP3 playback in a distributed terminal app, use of Station names, required attribution, traffic expectations, and confirmation that it controls the necessary broadcast rights. Its Chilling, Studying, and Japanese Lofi Stations could fill three exact lofi slots if granted.
3. Ask UZIC or Loca FM for written permission for one melodic-techno slot. UZIC's current terms require written consent; Loca FM's legal notice does not grant app distribution.
4. Ask Nightride whether its MP3 endpoint is a supported public integration and whether a free third-party client may ship it, including branding and attribution rules.
5. Do not approach SomaFM or Chillhop as defaults unless their published policies change; their present answer is already adverse.
6. Require any permission response to name the direct endpoint or supported discovery mechanism and to cover the app's distribution model, not merely personal listening or iframe embedding.

## Proposed resolution comment for the ticket

> Research asset: `../research/lawful-dependable-stations.md`. Only Nightwave Plaza passed both the technical and explicit-permission gates, conditionally for a free/ad-free app with Station plus artist/title attribution; it is vaporwave/future-funk and therefore only chill-adjacent. Exact lofi and melodic-techno candidates were technically reachable but were rejected because terms prohibit third-party use or do not grant direct app playback. Close this investigation and resolve the now-sharp sourcing-strategy decision in a follow-up ticket.
