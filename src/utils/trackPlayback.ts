import { getSongUrl } from '../api/music';

export async function resolveTrackUrl(track: any) {
  if (!track) return '';
  if (track.url) return track.url;

  try {
    const res = await getSongUrl(Number(track.id));
    const list = res.data?.data || res.data?.songs || res.data?.url || res.data || [];
    const target = Array.isArray(list) ? list[0] : list;
    return target?.url || target?.data?.[0]?.url || '';
  } catch {
    return '';
  }
}

export async function playTrackWithResolvedUrl(playerStore: any, track: any, index = 0) {
  if (!track) return;
  const url = await resolveTrackUrl(track);
  const nextTrack = url ? { ...track, url } : track;
  playerStore.setPlaylist([nextTrack], index);
  await playerStore.playTrack(nextTrack);
}
