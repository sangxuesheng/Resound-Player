import { reactive } from 'vue';
import { getLoginStatus, getUserLikeList, getUserPlaylist } from '../api/auth';

const LOGIN_COOKIE_KEY = 'ncm_login_cookie';

type UserProfile = {
  userId: number;
  nickname: string;
  avatarUrl?: string;
};

type UserPlaylist = {
  id: number;
  name: string;
  trackCount?: number;
};

export const userStore = reactive({
  isLogin: false,
  profile: null as UserProfile | null,
  playlists: [] as UserPlaylist[],
  likedSongIds: [] as number[],
  loading: false,
  loginCookie: '',
  hydrate() {
    this.loginCookie = localStorage.getItem(LOGIN_COOKIE_KEY) || '';
  },
  saveCookie(cookie: string) {
    this.loginCookie = cookie;
    if (cookie) {
      localStorage.setItem(LOGIN_COOKIE_KEY, cookie);
    } else {
      localStorage.removeItem(LOGIN_COOKIE_KEY);
    }
  },
  async refreshLoginStatus() {
    const cookie = this.loginCookie || undefined;
    const { data } = await getLoginStatus(cookie);
    const profile = data?.data?.profile || null;

    this.profile = profile;
    this.isLogin = Boolean(profile?.userId);

    if (this.isLogin && profile?.userId) {
      await Promise.all([this.fetchPlaylists(profile.userId), this.fetchLikedSongs(profile.userId)]);
    } else {
      this.playlists = [];
      this.likedSongIds = [];
    }
  },
  async fetchPlaylists(uid: number) {
    const { data } = await getUserPlaylist(uid);
    this.playlists = data?.playlist || [];
  },
  async fetchLikedSongs(uid: number) {
    const { data } = await getUserLikeList(uid);
    const ids = data?.ids || data?.songs?.map((song: any) => song?.id) || [];
    this.likedSongIds = ids.filter((id: any): id is number => typeof id === 'number');
  },
});
