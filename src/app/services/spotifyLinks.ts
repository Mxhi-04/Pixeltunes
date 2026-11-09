export type SpotifyLinkType = 'track' | 'album' | 'playlist';

export function parseSpotifyLink(input: string) {
  const value = input.trim();
  let match = /^spotify:(track|album|playlist):([A-Za-z0-9]{22})$/.exec(value);

  if (!match) {
    let url: URL;
    try { url = new URL(value); } catch { return null; }
    if (url.origin !== 'https://open.spotify.com' || url.username || url.password) return null;
    match = /^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist)\/([A-Za-z0-9]{22})\/?$/i.exec(url.pathname);
  }

  if (!match) return null;
  const type = match[1].toLowerCase() as SpotifyLinkType;
  const id = match[2];
  return {
    type,
    id,
    uri: `spotify:${type}:${id}`,
    url: `https://open.spotify.com/${type}/${id}`,
  };
}

export function getSpotifyItemUrl(uri: string) {
  const episode = /^spotify:episode:([A-Za-z0-9]{22})$/.exec(uri);
  return episode ? `https://open.spotify.com/episode/${episode[1]}` : parseSpotifyLink(uri)?.url;
}
