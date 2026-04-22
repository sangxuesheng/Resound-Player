<template>
  <AnimatedAppear tag="section" variant="content" rhythm="shell" class-name="panel">
    <AnimatedAppear tag="h2" variant="title" rhythm="title">扫码登录</AnimatedAppear>

    <AnimatedAppear tag="div" variant="text" rhythm="body" class-name="row">
      <AnimatedAppear tag="button" variant="control" rhythm="actions" class-name="btn" :disabled="disabled || qrLoading" @click="startQrLogin">
        {{ qrLoading ? '生成中...' : '生成二维码' }}
      </AnimatedAppear>
      <AnimatedAppear tag="span" variant="text" rhythm="body" :index="1" class-name="muted">{{ qrStatusText }}</AnimatedAppear>
    </AnimatedAppear>

    <AnimatedAppear v-if="qrImg" tag="div" variant="modal" rhythm="overlay" class-name="qr-wrap">
      <img :src="qrImg" alt="qr" class="qr" />
    </AnimatedAppear>

    <AnimatedAppear tag="div" variant="text" rhythm="body" :index="2" class-name="meta">
      <template v-if="userStore.isLogin && userStore.profile">
        当前用户：<strong>{{ userStore.profile.nickname }}</strong>
      </template>
      <template v-else>
        当前未登录
      </template>
    </AnimatedAppear>
  </AnimatedAppear>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { checkQrStatus, createQr, getQrKey } from '../api/auth';
import { userStore } from '../stores/user';
import AnimatedAppear from './AnimatedAppear.vue';

const props = defineProps<{ disabled?: boolean }>();

const qrLoading = ref(false);
const qrImg = ref('');
const qrStatusText = ref('未开始登录');
let qrTimer: ReturnType<typeof setInterval> | null = null;

function clearQrTimer() {
  if (qrTimer) {
    clearInterval(qrTimer);
    qrTimer = null;
  }
}

async function startQrLogin() {
  if (props.disabled) {
    qrStatusText.value = 'API 尚未就绪，请稍后重试';
    return;
  }

  qrLoading.value = true;
  qrStatusText.value = '正在生成二维码...';
  clearQrTimer();

  try {
    const keyRes = await getQrKey();
    const unikey = keyRes?.data?.data?.unikey;
    if (!unikey) throw new Error('获取二维码 key 失败');

    const qrRes = await createQr(unikey);
    qrImg.value = qrRes?.data?.data?.qrimg || '';
    qrStatusText.value = '请使用网易云音乐 APP 扫码';

    qrTimer = setInterval(async () => {
      try {
        const statusRes = await checkQrStatus(unikey);
        const code = statusRes?.data?.code;

        if (code === 801) qrStatusText.value = '等待扫码';
        if (code === 802) qrStatusText.value = '已扫码，请在手机确认';

        if (code === 803) {
          qrStatusText.value = '登录成功';
          const cookie = statusRes?.data?.cookie as string | undefined;
          if (cookie) userStore.saveCookie(cookie);
          clearQrTimer();
          await userStore.refreshLoginStatus();
        }

        if (code === 800) {
          qrStatusText.value = '二维码已过期，请重新生成';
          clearQrTimer();
        }
      } catch {
        qrStatusText.value = '轮询失败，请重试';
        clearQrTimer();
      }
    }, 2500);
  } catch (e: any) {
    qrStatusText.value = e?.message || '生成二维码失败';
  } finally {
    qrLoading.value = false;
  }
}

onBeforeUnmount(() => clearQrTimer());
</script>

<style scoped>
.panel {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(15, 23, 42, 0.82));
  color: #e5e7eb;
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
}
.muted {
  font-size: 13px;
  color: #9ca3af;
}
.qr-wrap {
  margin-top: 12px;
}
.qr {
  width: 180px;
  height: 180px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}
.meta {
  margin-top: 12px;
  font-size: 14px;
}
</style>
