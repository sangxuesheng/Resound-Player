/**
 * 从任意歌曲数据格式中提取歌手列表。
 * 支持网易云音乐的 ar / artists / album.artists 等多种字段。
 */
export function getSongArtists(song: any): any[] {
  const artists = Array.isArray(song?.ar)
    ? song.ar
    : Array.isArray(song?.artists)
      ? song.artists
      : Array.isArray(song?.album?.artists)
        ? song.album.artists
        : [];
  return artists.filter((artist: any) => artist?.id || artist?.name);
}

/**
 * 判断歌曲是否为播放器当前正在播放的那一首。
 */
export function isCurrentTrack(songId: number, currentSongId: number | undefined): boolean {
  return Number(songId) > 0 && Number(songId) === Number(currentSongId || 0);
}