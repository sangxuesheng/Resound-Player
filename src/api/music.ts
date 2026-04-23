import { apiClient } from './client';

export async function searchMusic(
  keywords: string,
  params?: { limit?: number; offset?: number; type?: number },
) {
  const { data } = await apiClient.get('/cloudsearch', {
    params: {
      keywords,
      limit: params?.limit ?? 30,
      offset: params?.offset ?? 0,
      ...(typeof params?.type === 'number' ? { type: params.type } : {}),
    },
  });
  return data;
}

export async function searchMusicSuggest(keywords: string, type: 'mobile' | 'web' = 'web') {
  return apiClient.get('/search/suggest', {
    params: {
      keywords,
      ...(type === 'mobile' ? { type } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function searchMusicHot() {
  return apiClient.get('/search/hot', {
    params: { timestamp: Date.now() },
  });
}

export async function searchMusicHotDetail() {
  return apiClient.get('/search/hot/detail', {
    params: { timestamp: Date.now() },
  });
}

export async function searchMusicDefault() {
  return apiClient.get('/search/default', {
    params: { timestamp: Date.now() },
  });
}

export async function getSongUrl(id: number) {
  return apiClient.get('/song/url', {
    params: { id, timestamp: Date.now() },
  });
}

export async function getSongDetail(id: number) {
  return apiClient.get('/song/detail', {
    params: { ids: id, timestamp: Date.now() },
  });
}

export async function getSongDetailBatch(ids: number[]) {
  if (!ids.length) {
    return { data: { songs: [] } } as any;
  }

  return apiClient.get('/song/detail', {
    params: {
      ids: ids.join(','),
      timestamp: Date.now(),
    },
  });
}

export async function getSongLyric(id: number) {
  return apiClient.get('/lyric', {
    params: { id, timestamp: Date.now() },
  });
}

export async function getCloudLyric(uid: number, sid: string | number) {
  return apiClient.get('/cloud/lyric/get', {
    params: {
      uid,
      sid,
      timestamp: Date.now(),
    },
  });
}

export async function getSongDynamicCover(id: number) {
  return apiClient.get('/song/dynamic/cover', {
    params: { id, timestamp: Date.now() },
  });
}

export async function getPlaylistCatList() {
  return apiClient.get('/playlist/catlist', {
    params: { timestamp: Date.now() },
  });
}

export async function getTopPlaylists(params: { cat?: string; order?: 'hot' | 'new'; limit?: number; offset?: number }) {
  return apiClient.get('/top/playlist', {
    params: {
      order: params.order || 'hot',
      cat: params.cat || '全部',
      limit: params.limit ?? 30,
      offset: params.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getHighQualityPlaylists(params: { cat?: string; limit?: number; before?: number }) {
  return apiClient.get('/top/playlist/highquality', {
    params: {
      cat: params.cat || '全部',
      limit: params.limit ?? 6,
      ...(params.before ? { before: params.before } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getRecommendPlaylists(cookie?: string) {
  return apiClient.get('/recommend/resource', {
    params: {
      ...(cookie ? { cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getRecommendSongs(cookie?: string) {
  return apiClient.get('/recommend/songs', {
    params: {
      ...(cookie ? { cookie } : {}),
      timestamp: Date.now(),
    },
  });
}


export async function getPersonalFm(cookie?: string) {
  return apiClient.get('/personal_fm', {
    params: {
      ...(cookie ? { cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function trashPersonalFm(id: number, cookie?: string) {
  return apiClient.get('/fm_trash', {
    params: {
      id,
      ...(cookie ? { cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getHistoryRecommendSongDates(cookie?: string) {
  return apiClient.get('/history/recommend/songs', {
    params: {
      ...(cookie ? { cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getHistoryRecommendSongDetail(date: string, cookie?: string) {
  return apiClient.get('/history/recommend/songs/detail', {
    params: {
      date,
      ...(cookie ? { cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getPlaylistDetail(id: number, s = 8) {
  return apiClient.get('/playlist/detail', {
    params: {
      id,
      s,
      timestamp: Date.now(),
    },
  });
}

export async function getDjRecommend() {
  return apiClient.get('/dj/recommend', {
    params: {
      timestamp: Date.now(),
    },
  });
}

export async function getToplistDetail() {
  return apiClient.get('/toplist/detail', {
    params: {
      timestamp: Date.now(),
    },
  });
}

export async function getTopSongs(type: 0 | 7 | 96 | 8 | 16 = 0) {
  return apiClient.get('/top/song', {
    params: {
      type,
      timestamp: Date.now(),
    },
  });
}

export async function getTopArtists(params?: { limit?: number; offset?: number }) {
  return apiClient.get('/top/artists', {
    params: {
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getArtistDetail(id: number) {
  return apiClient.get('/artist/detail', {
    params: {
      id,
      timestamp: Date.now(),
    },
  });
}

export async function getArtistTopSongs(id: number) {
  return apiClient.get('/artists', {
    params: {
      id,
      timestamp: Date.now(),
    },
  });
}

export async function getArtistAlbums(id: number, params?: { limit?: number; offset?: number }) {
  return apiClient.get('/artist/album', {
    params: {
      id,
      limit: params?.limit ?? 24,
      offset: params?.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getArtistMvs(id: number, params?: { limit?: number; offset?: number }) {
  return apiClient.get('/artist/mv', {
    params: {
      id,
      limit: params?.limit ?? 24,
      offset: params?.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getArtistDescription(id: number) {
  return apiClient.get('/artist/desc', {
    params: {
      id,
      timestamp: Date.now(),
    },
  });
}

export async function getNewestAlbums() {
  return apiClient.get('/album/newest', {
    params: {
      timestamp: Date.now(),
    },
  });
}

export async function getTopAlbums(params?: {
  area?: 'ALL' | 'ZH' | 'EA' | 'KR' | 'JP';
  type?: 'new' | 'hot';
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}) {
  const now = new Date();
  return apiClient.get('/top/album', {
    params: {
      area: params?.area || 'ALL',
      type: params?.type || 'new',
      year: params?.year ?? now.getFullYear(),
      month: params?.month ?? now.getMonth() + 1,
      limit: params?.limit ?? 12,
      offset: params?.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getPlaylistTrackAll(params: { id: number; limit?: number; offset?: number }) {
  return apiClient.get('/playlist/track/all', {
    params: {
      id: params.id,
      ...(typeof params.limit === 'number' ? { limit: params.limit } : {}),
      ...(typeof params.offset === 'number' ? { offset: params.offset } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getAlbumDetail(id: number) {
  return apiClient.get('/album', {
    params: {
      id,
      timestamp: Date.now(),
    },
  });
}

export async function getAlbumSublist(params?: { limit?: number; offset?: number; cookie?: string }) {
  return apiClient.get('/album/sublist', {
    params: {
      limit: params?.limit ?? 25,
      offset: params?.offset ?? 0,
      ...(params?.cookie ? { cookie: params.cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getAllMvs(params: {
  area?: '全部' | '内地' | '港台' | '欧美' | '日本' | '韩国';
  type?: '全部' | '官方版' | '原生' | '现场版' | '网易出品';
  order?: '上升最快' | '最热' | '最新';
  limit?: number;
  offset?: number;
}) {
  return apiClient.get('/mv/all', {
    params: {
      area: params.area || '全部',
      type: params.type || '全部',
      order: params.order || '上升最快',
      limit: params.limit ?? 30,
      offset: params.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getMvUrl(id: number, r = 1080) {
  return apiClient.get('/mv/url', {
    params: {
      id,
      r,
      timestamp: Date.now(),
    },
  });
}

export async function getMvDetail(mvid: number) {
  return apiClient.get('/mv/detail', {
    params: {
      mvid,
      timestamp: Date.now(),
    },
  });
}

export async function getMvDetailInfo(mvid: number) {
  return apiClient.get('/mv/detail/info', {
    params: {
      mvid,
      timestamp: Date.now(),
    },
  });
}

export async function getVoiceListSearch(params: { keyword: string; limit?: number; offset?: number }) {
  return apiClient.get('/voicelist/search', {
    params: {
      keyword: params.keyword,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getVoiceListDetail(voiceListId: number) {
  return apiClient.get('/voicelist/detail', {
    params: {
      id: voiceListId,
      timestamp: Date.now(),
    },
  });
}

export async function getVoiceListItems(params: { voiceListId: number; limit?: number; offset?: number }) {
  return apiClient.get('/voicelist/list', {
    params: {
      voiceListId: params.voiceListId,
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getVoiceListSearchItems(params: {
  radioId?: number;
  name?: string;
  displayStatus?: string | null;
  type?: 'PUBLIC' | 'PRIVATE' | null;
  voiceFeeType?: number | null;
  limit?: number;
  offset?: number;
}) {
  return apiClient.get('/voicelist/list/search', {
    params: {
      radioId: params.radioId,
      name: params.name,
      displayStatus: params.displayStatus ?? null,
      type: params.type ?? null,
      voiceFeeType: params.voiceFeeType ?? null,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      timestamp: Date.now(),
    },
  });
}

export async function getVoiceDetail(id: number) {
  return apiClient.get('/voice/detail', {
    params: {
      id,
      timestamp: Date.now(),
    },
  });
}

export async function getCloudStorage(params?: { limit?: number; offset?: number; cookie?: string }) {
  return apiClient.get('/user/cloud', {
    params: {
      limit: params?.limit ?? 30,
      offset: params?.offset ?? 0,
      ...(params?.cookie ? { cookie: params.cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getCloudStorageDetail(ids: string | number | Array<string | number>, cookie?: string) {
  const value = Array.isArray(ids) ? ids.join(',') : String(ids);
  return apiClient.get('/user/cloud/detail', {
    params: {
      id: value,
      ...(cookie ? { cookie } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function getRecentSongs(limit = 100) {
  return apiClient.get('/record/recent/song', {
    params: {
      limit,
      timestamp: Date.now(),
    },
  });
}

export async function getRecentPlaylists(limit = 100) {
  return apiClient.get('/record/recent/playlist', {
    params: {
      limit,
      timestamp: Date.now(),
    },
  });
}

export async function getRecentAlbums(limit = 100) {
  return apiClient.get('/record/recent/album', {
    params: {
      limit,
      timestamp: Date.now(),
    },
  });
}

export async function getRecentDj(limit = 100) {
  return apiClient.get('/record/recent/dj', {
    params: {
      limit,
      timestamp: Date.now(),
    },
  });
}

export async function getMvUgcInfo(id: number) {
  return apiClient.get('/ugc/mv/get', {
    params: {
      id,
      timestamp: Date.now(),
    },
  });
}

export async function getMvComments(params: {
  id: number;
  limit?: number;
  offset?: number;
  before?: number;
}) {
  return apiClient.get('/comment/mv', {
    params: {
      id: params.id,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      ...(params.before ? { before: params.before } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function sendMvComment(params: {
  id: number;
  content: string;
  commentId?: number;
}) {
  return apiClient.get('/comment', {
    params: {
      t: params.commentId ? 2 : 1,
      type: 1,
      id: params.id,
      content: params.content,
      ...(params.commentId ? { commentId: params.commentId } : {}),
      timestamp: Date.now(),
    },
  });
}

export async function deleteMvComment(params: { id: number; commentId: number }) {
  return apiClient.get('/comment', {
    params: {
      t: 0,
      type: 1,
      id: params.id,
      commentId: params.commentId,
      timestamp: Date.now(),
    },
  });
}

export async function toggleSongLike(params: { id: number; like: boolean; uid?: number }) {
  return apiClient.get('/song/like', {
    params: {
      id: params.id,
      like: params.like,
      ...(typeof params.uid === 'number' ? { uid: params.uid } : {}),
      timestamp: Date.now(),
    },
  });
}
