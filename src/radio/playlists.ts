export type PlaylistId = "upbeat" | "lofi";

export type PlaylistDefinition = {
  readonly id: PlaylistId;
  readonly name: string;
  readonly provider: "Audius";
  readonly genre: string;
  readonly canonicalUrl: string;
};

export const upbeatPlaylist: PlaylistDefinition = Object.freeze({
  id: "upbeat",
  name: "Upbeat",
  provider: "Audius",
  genre: "Upbeat / Electronic",
  canonicalUrl: "https://audius.co/chiubaca/playlist/hacker.fm-74460",
});

export const lofiPlaylist: PlaylistDefinition = Object.freeze({
  id: "lofi",
  name: "Lofi",
  provider: "Audius",
  genre: "Lofi / Chill",
  canonicalUrl: "https://audius.co/chiubaca/playlist/hacker.fm-lo-fi-80501",
});

export const playlistCatalog = Object.freeze([upbeatPlaylist, lofiPlaylist] as const);

export function resolvePlaylist(id: string) {
  return playlistCatalog.find((playlist) => playlist.id === id);
}
