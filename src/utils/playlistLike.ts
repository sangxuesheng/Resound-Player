export type PlaylistLikeCreator = {
  nickname?: string;
  avatarUrl?: string;
};

export type PlaylistLike = {
  name: string;
  coverImgUrl: string;
  description?: string;
  creator?: PlaylistLikeCreator;
  trackCount: number;
  tracks: any[];
};

export function createPlaylistLike(input: {
  name?: string;
  coverImgUrl?: string;
  description?: string;
  creator?: PlaylistLikeCreator;
  trackCount?: number;
  tracks?: any[];
}): PlaylistLike {
  return {
    name: input.name || '歌单',
    coverImgUrl: input.coverImgUrl || '',
    description: input.description,
    creator: input.creator,
    trackCount: input.trackCount || input.tracks?.length || 0,
    tracks: Array.isArray(input.tracks) ? input.tracks : [],
  };
}

export function normalizeRecommendSongsPlaylist(songs: any[], nickname = '每日推荐'): PlaylistLike {
  return createPlaylistLike({
    name: '每日推荐',
    coverImgUrl: songs[0]?.al?.picUrl || songs[0]?.album?.picUrl || songs[0]?.album?.blurPicUrl || '',
    description: '根据你的音乐口味生成，每天更新',
    creator: { nickname },
    trackCount: songs.length,
    tracks: songs,
  });
}

export function normalizeCloudPlaylist(songs: any[], profile: { nickname?: string; avatarUrl?: string } = {}): PlaylistLike {
  return createPlaylistLike({
    name: '我的云盘',
    coverImgUrl: songs[0]?.coverImgUrl || songs[0]?.al?.picUrl || songs[0]?.album?.picUrl || profile.avatarUrl || '',
    description: `${profile.nickname || '用户'} 的云盘歌曲`,
    creator: { nickname: profile.nickname, avatarUrl: profile.avatarUrl },
    trackCount: songs.length,
    tracks: songs,
  });
}
