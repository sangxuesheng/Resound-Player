import { computed, ref, watch } from 'vue';
import { playerStore } from '../stores/player';
import { userStore } from '../stores/user';
import { toggleDjSubscribe, toggleSongLike } from '../api/music';

/**
 * 当前播放曲目的收藏/喜欢切换逻辑
 *
 * PlayerBar 和 PlayerExpanded 共享同一套 like toggle，
 * 支持歌曲喜欢和播客 DJ 订阅两种模式。
 */
export function useCurrentTrackLike() {
  const currentTrackId = computed(() => Number(playerStore.currentTrack?.id || 0));
  const currentPodcastRid = computed(() => Number(playerStore.currentTrack?.podcast?.rid || 0));
  const isCurrentPodcast = computed(() => playerStore.currentTrack?.source === 'podcast' && currentPodcastRid.value > 0);

  const canToggleCurrentLike = computed(() =>
    isCurrentPodcast.value ? currentPodcastRid.value > 0 : currentTrackId.value > 0,
  );

  const likedSongSignature = computed(() => userStore.likedSongIds.join(','));
  const subscribedDjSignature = computed(() => userStore.subscribedDjIds.join(','));

  const isCurrentLiked = computed(() => {
    void likedSongSignature.value;
    void subscribedDjSignature.value;
    if (isCurrentPodcast.value) return userStore.subscribedDjIds.includes(currentPodcastRid.value);
    return currentTrackId.value > 0 ? userStore.likedSongIds.includes(currentTrackId.value) : false;
  });

  const likeLoading = ref(false);

  // 切歌时重置 loading 状态
  watch(
    () => `${currentTrackId.value}-${currentPodcastRid.value}-${playerStore.currentTrack?.source || 'song'}`,
    () => {
      likeLoading.value = false;
    },
    { immediate: true },
  );

  async function toggleCurrentLike() {
    if (likeLoading.value || !canToggleCurrentLike.value) return;
    const next = !isCurrentLiked.value;
    likeLoading.value = true;
    try {
      const response = isCurrentPodcast.value
        ? await toggleDjSubscribe({ rid: currentPodcastRid.value, subscribe: next, cookie: userStore.loginCookie || undefined })
        : await toggleSongLike({ id: currentTrackId.value, like: next, uid: userStore.profile?.userId, cookie: userStore.loginCookie || undefined });
      const code = response?.data?.code ?? response?.data?.data?.code;
      if (typeof code === 'number' && code !== 200) throw new Error(`收藏失败，接口返回 ${code}`);
      if (isCurrentPodcast.value) {
        const rid = currentPodcastRid.value;
        const exists = userStore.subscribedDjIds.includes(rid);
        if (next && !exists) userStore.subscribedDjIds = [...userStore.subscribedDjIds, rid];
        if (!next && exists) userStore.subscribedDjIds = userStore.subscribedDjIds.filter((id) => id !== rid);
        return;
      }
      const id = currentTrackId.value;
      if (next) {
        if (!userStore.likedSongIds.includes(id)) userStore.likedSongIds = [...userStore.likedSongIds, id];
      } else {
        userStore.likedSongIds = userStore.likedSongIds.filter((songId) => songId !== id);
      }
    } catch (error) {
      console.error('[like] toggle like failed', error);
    } finally {
      likeLoading.value = false;
    }
  }

  return {
    currentTrackId,
    currentPodcastRid,
    isCurrentPodcast,
    canToggleCurrentLike,
    isCurrentLiked,
    likeLoading,
    toggleCurrentLike,
  };
}