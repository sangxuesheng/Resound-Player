import { reactive } from 'vue';
import { getLoginStatus, getUserAccount, getUserDetail, getUserLikeList, getUserPlaylist, logout as logoutRequest } from '../api/auth';

const LOGIN_COOKIE_KEY = 'ncm_login_cookie';
const LOGIN_MODE_KEY = 'ncm_login_mode';
const UID_LOGIN_PREFIX = 'uid=';

type LoginMode = 'none' | 'cookie' | 'qr' | 'uid';

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

function maskCookie(cookie: string) {
  const normalized = String(cookie || '').trim();
  if (!normalized) return '(empty)';
  if (normalized.length <= 16) return normalized;
  return `${normalized.slice(0, 8)}...${normalized.slice(-8)}`;
}

function logAuthDebug(event: string, payload?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.debug('[auth-debug]', event, payload || {});
}

export const userStore = reactive({
  isLogin: false,
  profile: null as UserProfile | null,
  playlists: [] as UserPlaylist[],
  likedSongIds: [] as number[],
  loading: false,
  loginCookie: '',
  loginMode: 'none' as LoginMode,
  authRequestSeq: 0,
  hydrate() {
    this.loginCookie = localStorage.getItem(LOGIN_COOKIE_KEY) || '';
    const savedMode = localStorage.getItem(LOGIN_MODE_KEY) as LoginMode | null;
    this.loginMode = savedMode === 'uid' || savedMode === 'cookie' || savedMode === 'qr' ? savedMode : 'none';

    if (this.loginCookie.startsWith(UID_LOGIN_PREFIX)) {
      this.loginMode = 'uid';
    }

    logAuthDebug('hydrate', {
      hasCookie: Boolean(this.loginCookie),
      loginMode: this.loginMode,
      cookiePreview: maskCookie(this.loginCookie),
    });
  },
  saveCookie(cookie: string) {
    this.loginCookie = cookie;
    logAuthDebug('saveCookie', {
      hasCookie: Boolean(cookie),
      loginMode: this.loginMode,
      cookiePreview: maskCookie(cookie),
    });
    if (cookie) {
      localStorage.setItem(LOGIN_COOKIE_KEY, cookie);
      localStorage.setItem(LOGIN_MODE_KEY, this.loginMode);
    } else {
      localStorage.removeItem(LOGIN_COOKIE_KEY);
      localStorage.removeItem(LOGIN_MODE_KEY);
    }
  },
  resetSession() {
    this.authRequestSeq += 1;
    logAuthDebug('resetSession', {
      nextAuthRequestSeq: this.authRequestSeq,
    });
    this.isLogin = false;
    this.profile = null;
    this.playlists = [];
    this.likedSongIds = [];
    this.loginMode = 'none';
    this.saveCookie('');
  },
  async logout() {
    const cookie = this.loginCookie || undefined;

    try {
      await logoutRequest(cookie);
    } catch {
      // 即使服务端退出失败，也要清理本地登录态，避免界面残留已登录状态
    } finally {
      this.resetSession();
    }
  },
  async loginWithCookie(cookie: string) {
    const normalizedCookie = String(cookie || '').trim();
    if (!normalizedCookie) {
      throw new Error('请输入 Cookie');
    }

    const requestId = ++this.authRequestSeq;
    logAuthDebug('loginWithCookie:start', {
      requestId,
      cookiePreview: maskCookie(normalizedCookie),
    });
    this.saveCookie(normalizedCookie);

    try {
      await this.refreshLoginStatus(requestId);
      logAuthDebug('loginWithCookie:afterRefresh', {
        requestId,
        activeRequestSeq: this.authRequestSeq,
        isLogin: this.isLogin,
        profileUserId: this.profile?.userId || null,
      });

      if (!this.isLogin && requestId === this.authRequestSeq) {
        const accountRes = await getUserAccount();
        const profile = accountRes?.data?.profile || accountRes?.data?.data?.profile || null;
        logAuthDebug('loginWithCookie:getUserAccount', {
          requestId,
          activeRequestSeq: this.authRequestSeq,
          accountUserId: profile?.userId || null,
        });

        if (profile?.userId && requestId === this.authRequestSeq) {
          this.profile = profile;
          this.isLogin = true;
          this.loginMode = 'cookie';
          await Promise.allSettled([this.fetchPlaylists(profile.userId), this.fetchLikedSongs(profile.userId)]);
          logAuthDebug('loginWithCookie:accountFallbackApplied', {
            requestId,
            profileUserId: profile.userId,
          });
        }
      }

      if (!this.isLogin && requestId === this.authRequestSeq) {
        logAuthDebug('loginWithCookie:failedNoLoginState', {
          requestId,
          activeRequestSeq: this.authRequestSeq,
        });
        throw new Error('Cookie 无效、缺少必要字段，或当前接口未返回登录态');
      }

      logAuthDebug('loginWithCookie:success', {
        requestId,
        activeRequestSeq: this.authRequestSeq,
        isLogin: this.isLogin,
        profileUserId: this.profile?.userId || null,
      });
    } catch (error: any) {
      logAuthDebug('loginWithCookie:error', {
        requestId,
        activeRequestSeq: this.authRequestSeq,
        message: error?.message || String(error),
      });
      if (requestId === this.authRequestSeq) {
        this.resetSession();
      }
      throw error;
    }
  },
  async loginWithUid(uid: number | string) {
    const normalizedUid = Number(uid);
    if (!Number.isFinite(normalizedUid) || normalizedUid <= 0) {
      throw new Error('请输入有效 UID');
    }

    const requestId = ++this.authRequestSeq;
    logAuthDebug('loginWithUid:start', {
      requestId,
      uid: normalizedUid,
    });
    const { data } = await getUserDetail(normalizedUid);
    const profile = data?.profile || data?.data?.profile || null;

    if (!profile?.userId) {
      logAuthDebug('loginWithUid:notFound', {
        requestId,
        uid: normalizedUid,
      });
      throw new Error('未找到该 UID 对应用户');
    }

    if (requestId !== this.authRequestSeq) {
      logAuthDebug('loginWithUid:staleResponseIgnored', {
        requestId,
        activeRequestSeq: this.authRequestSeq,
      });
      return;
    }

    this.profile = profile;
    this.isLogin = true;
    this.playlists = [];
    this.likedSongIds = [];
    this.loginMode = 'uid';
    this.saveCookie('uid=' + String(profile.userId));

    await Promise.allSettled([this.fetchPlaylists(profile.userId), this.fetchLikedSongs(profile.userId)]);
    logAuthDebug('loginWithUid:success', {
      requestId,
      profileUserId: profile.userId,
    });
  },
  async restoreUidLogin(uid: number, requestId = ++this.authRequestSeq) {
    logAuthDebug('restoreUidLogin:start', {
      requestId,
      uid,
    });

    try {
      const { data } = await getUserDetail(uid);
      const profile = data?.profile || data?.data?.profile || null;

      if (!profile?.userId) {
        throw new Error('未找到已保存 UID 对应用户');
      }

      if (requestId !== this.authRequestSeq) {
        logAuthDebug('restoreUidLogin:staleResponseIgnored', {
          requestId,
          activeRequestSeq: this.authRequestSeq,
        });
        return;
      }

      this.profile = profile;
      this.isLogin = true;
      this.loginMode = 'uid';
      this.playlists = [];
      this.likedSongIds = [];
      this.saveCookie(UID_LOGIN_PREFIX + String(profile.userId));

      await Promise.allSettled([this.fetchPlaylists(profile.userId), this.fetchLikedSongs(profile.userId)]);
      logAuthDebug('restoreUidLogin:success', {
        requestId,
        profileUserId: profile.userId,
      });
    } catch (error: any) {
      logAuthDebug('restoreUidLogin:error', {
        requestId,
        message: error?.message || String(error),
      });
      if (requestId === this.authRequestSeq) {
        this.resetSession();
      }
    }
  },
  async refreshLoginStatus(requestId = ++this.authRequestSeq) {
    if (this.loginCookie.startsWith(UID_LOGIN_PREFIX)) {
      const uid = Number(this.loginCookie.slice(UID_LOGIN_PREFIX.length));
      if (Number.isFinite(uid) && uid > 0) {
        await this.restoreUidLogin(uid, requestId);
        return;
      }
    }

    const cookie = this.loginCookie || undefined;
    logAuthDebug('refreshLoginStatus:start', {
      requestId,
      activeRequestSeq: this.authRequestSeq,
      hasCookie: Boolean(cookie),
      cookiePreview: maskCookie(cookie || ''),
    });
    const { data } = await getLoginStatus(cookie);
    const profile = data?.data?.profile || null;

    logAuthDebug('refreshLoginStatus:response', {
      requestId,
      activeRequestSeq: this.authRequestSeq,
      profileUserId: profile?.userId || null,
      dataCode: data?.code ?? null,
    });

    if (requestId !== this.authRequestSeq) {
      logAuthDebug('refreshLoginStatus:staleResponseIgnored', {
        requestId,
        activeRequestSeq: this.authRequestSeq,
      });
      return;
    }

    this.profile = profile;
    this.isLogin = Boolean(profile?.userId);
    this.loginMode = this.isLogin ? 'cookie' : 'none';

    logAuthDebug('refreshLoginStatus:stateApplied', {
      requestId,
      isLogin: this.isLogin,
      profileUserId: this.profile?.userId || null,
    });

    if (this.isLogin && profile?.userId) {
      const results = await Promise.allSettled([this.fetchPlaylists(profile.userId), this.fetchLikedSongs(profile.userId)]);
      const rejected = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => (result.reason as any)?.message || String(result.reason));

      logAuthDebug('refreshLoginStatus:userDataLoaded', {
        requestId,
        profileUserId: profile.userId,
        playlistCount: this.playlists.length,
        likedSongCount: this.likedSongIds.length,
        rejected,
      });
    } else {
      this.playlists = [];
      this.likedSongIds = [];
      logAuthDebug('refreshLoginStatus:clearedUserData', {
        requestId,
      });
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
