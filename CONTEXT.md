# CoasTTY

CoasTTY is a terminal radio experience for listening to a curated set of live lofi and chill-techno broadcasts.

## Language

**Station**:
A curated live radio choice presented to the listener, identified by its musical character rather than an individual track.
_Avoid_: Channel, track, Playlist when referring to live radio

**Playlist**:
An operator-curated, fixed-order collection played from a listener-specific position that persists on their device by exact Source Collection entry identity and elapsed position. It loops continuously and supports pause, resume, and forward skip, but not track selection, reordering, shuffle, seeking, or backward navigation. If the persisted entry no longer belongs to the Playlist, playback restarts at its first playable entry.
_Avoid_: Station, personal Station, queue

**Source Collection**:
An externally hosted, operator-maintained collection whose membership and order continuously determine a Playlist, subject only to playability filtering.
_Avoid_: Seed, immutable source

**Playable Playlist**:
A Playlist that continuously mirrors a Source Collection while skipping only entries that are deleted, deactivated, unavailable, or currently fail to stream. It preserves the relative order of playable entries. Collection changes take effect at the next track boundary without separate approval; a stream failure skips the affected entry immediately.
_Avoid_: Eligible Playlist, exact mirror, manual import

**Coming Soon Slot**:
A visible, non-interactive directory placeholder for a future Station. It is replaced by an available Station only after that Station has a complete integration; it is not an unavailable Station.
_Avoid_: Disabled Station, unavailable Station

**Selected Station**:
The Station currently chosen by the listener. It may be selected while playback is stopped; selecting a different Station while playback is active switches playback immediately.
_Avoid_: Active Station, current track

**Paused**:
Playback is intentionally inactive while the Selected Station and volume are retained. Returning to Play joins the Station at its current live point rather than resuming an earlier moment.
_Avoid_: Suspended, buffered pause

**Playback Status**:
The listener-facing condition of playback: Stopped before the first explicit Play, Connecting while opening a Station, Buffering while preparing audible playback, Playing while audio is live, Paused after an intentional interruption, Reconnecting during automatic recovery, or Error after playback cannot continue without a listener action.
_Avoid_: Stream state, engine state

**Product Brand**:
The official public name of the terminal-radio product: CoasTTY.
_Avoid_: COAST.FM when referring to the whole product

**App Name**:
The stable label that identifies an app in WAVE OS, independent of any changing document, station, or window title.
_Avoid_: Window title, document title

**Music Player**:
The WAVE OS app that presents CoasTTY's Stations and Playlists. Its App Name is COAST.FM.
_Avoid_: CoasTTY when referring specifically to the player, WAVE OS

**Technical Identifier**:
The lowercase `coastty` name used for code, package metadata, and other machine-facing references to CoasTTY.
_Avoid_: CoasTTY in code, coastty as the App Name

**System App**:
An app launched through WAVE OS itself rather than from a desktop icon; once open, it behaves like any other app window.
_Avoid_: Desktop app, hidden app

**Desktop**:
The WAVE OS workspace and focus state outside app windows; focusing it leaves open windows visible while making desktop controls active.
_Avoid_: No app, empty state

**Menu Owner**:
The focused Desktop or App whose controls are presented in the WAVE OS topbar.
_Avoid_: Global menu, active menu
