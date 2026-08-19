# lofi.fm

lofi.fm is a terminal radio experience for listening to a curated set of live lofi and chill-techno broadcasts.

## Language

**Station**:
A curated live radio choice presented to the listener, identified by its musical character rather than an individual track.
_Avoid_: Playlist, channel, track

**Coming Soon Slot**:
A visible, non-interactive directory placeholder for a future Station. It is replaced by an available Station only after that Station has a complete, lawfully reviewed integration; it is not an unavailable Station.
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
