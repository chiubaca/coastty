# Decide the Playback Lifecycle

Label: wayfinder:grilling
Parent: ../MAP.md
Status: closed
Assignee: opencode
Blocked by: none

## Question

What listener-visible state machine should govern explicit start, play/pause, Station switching, buffering, automatic reconnection, terminal failure, retry, window minimization, window closing, desktop restart, and process exit? Resolve the behavior through a live grilling session and add any resulting domain terms to `CONTEXT.md`.

## Comments

### Resolution - 2026-08-19

Use these listener-facing playback states:

- **Stopped**: Initial process state. The curated default Station and default volume are selected, but no audio or network work starts before explicit Play.
- **Connecting**: A fresh attempt is opening the Selected Station.
- **Buffering**: The Station is connected but audio is not yet ready.
- **Playing**: The Selected Station is audible.
- **Paused**: Playback was intentionally interrupted. The stream is disconnected, the audio output device is released, and the Selected Station and volume remain. Play reconnects at the current live point rather than resuming old content.
- **Reconnecting**: Automatic recovery is active. Show the consecutive attempt number out of five and the delay before the next attempt.
- **Error**: Playback cannot continue without listener action. Show a short friendly category while retaining technical diagnostics outside the compact UI.

Apply these transition rules:

- Station selection and Play intent are separate while inactive: selecting in Stopped, Paused, or Error changes only the Selected Station. Play explicitly starts it.
- Selecting another Station while Connecting, Buffering, Playing, or Reconnecting commits the new selection and switches immediately. Stop the old attempt first, show the new Station as Connecting/Buffering, and never overlap streams or roll back automatically if the new Station fails.
- Pause immediately cancels Connecting, Buffering, Playing, or Reconnecting work without reporting the intentional cancellation as an error. It also releases the audio output device.
- Minimize is view-only and leaves playback unchanged.
- Closing the player window Pauses playback so audio never continues without a player control or indicator.
- Desktop Restart Pauses playback before the boot screen but retains the Selected Station and volume in memory.
- Process exit disposes playback. A new process starts from the default Station and volume; this effort adds no durable preference storage.
- Retryable failures and unexpected clean stream endings reconnect up to five consecutive times with exponential delays starting at 1 second and capped at 15 seconds, honoring `Retry-After`. Successful playback resets the consecutive-attempt count.
- Exhausting automatic recovery enters Error and ends active Play intent. Non-retryable failures enter Error immediately.
- Error retains the failed Selected Station and uses one of four friendly categories: Station unavailable, Unsupported stream, Playback device unavailable, or Audio playback failed. Raw network, decoder, and native details remain available to logs and tests.
- In Error, the primary Play control becomes Retry and uses the same keyboard activation. Retry starts a fresh recovery cycle for the Selected Station.

The compact UI should expose only the agreed playback state, reconnect progress, and friendly terminal reason; raw buffer, underrun, decoder, and native statistics are diagnostics rather than listener-facing state. The exact placement and control bindings remain with [Prototype the Player Controls](04-prototype-player-controls.md). Metadata and provider-attribution behavior remain dependent on the Station sourcing decision.
