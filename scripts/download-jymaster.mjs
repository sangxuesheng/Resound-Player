#!/usr/bin/env node

/**
 * 下载超清母带 (jymaster) 音频资源
 *
 * 用法:
 *   1. 先在浏览器控制台运行: copy(localStorage.getItem('ncm_login_cookie'))
 *      把 cookie 复制到剪贴板
 *   2. 运行:
 *      node scripts/download-jymaster.mjs --cookie "你的cookie" --id 2650815712
 *      或:
 *      COOKIE="你的cookie" node scripts/download-jymaster.mjs --id 2650815712
 */

const API_BASE = 'http://127.0.0.1:38761';

async function main() {
  const args = process.argv.slice(2);
  const idIdx = args.indexOf('--id');
  const cookieIdx = args.indexOf('--cookie');

  const trackId = idIdx >= 0 ? args[idIdx + 1] : '2650815712';
  const cookie = cookieIdx >= 0 ? args[cookieIdx + 1] : process.env.COOKIE;

  if (!cookie) {
    console.error('ERROR: 需要 cookie。用法:');
    console.error('  node scripts/download-jymaster.mjs --cookie "你的cookie" --id 2650815712');
    console.error('  或: COOKIE="你的cookie" node scripts/download-jymaster.mjs --id 2650815712');
    console.error('');
    console.error('获取 cookie: 在浏览器控制台运行 copy(localStorage.getItem("ncm_login_cookie"))');
    process.exit(1);
  }

  const level = 'jymaster';
  const apiUrl = `${API_BASE}/song/url/v1?id=${trackId}&level=${level}&cookie=${encodeURIComponent(cookie)}`;

  console.log(`[1/3] 请求音频 URL (trackId=${trackId}, level=${level})...`);

  let res;
  try {
    res = await fetch(apiUrl);
  } catch (e) {
    console.error('ERROR: API 服务器未启动？请先运行 npm run dev:web:full');
    console.error(e.message);
    process.exit(1);
  }

  const json = await res.json();
  const item = json?.data?.[0];

  if (!item?.url) {
    console.error('ERROR: API 返回无 URL');
    console.error('  code:', json?.code);
    console.error('  item:', JSON.stringify(item, null, 2));
    process.exit(1);
  }

  const br = item.br;
  const brMBps = (br / 1024 / 1024).toFixed(2);
  const url = item.url;

  console.log(`  → br=${br} (${brMBps} Mbps)`);
  console.log(`  → type=${item.type || '?'}`);
  console.log(`  → url=${url.substring(0, 120)}...`);

  // 获取歌曲信息用于文件名
  let filename = `jymaster_${trackId}`;
  try {
    const detailRes = await fetch(`${API_BASE}/song/detail?ids=${trackId}`);
    const detailJson = await detailRes.json();
    const song = detailJson?.songs?.[0];
    if (song) {
      filename = `${song.name} - ${song.ar?.map((a) => a.name).join(',')}`;
      // 清理文件名中的非法字符
      filename = filename.replace(/[\\/:*?"<>|]/g, '_');
    }
  } catch {
    // 忽略，使用默认文件名
  }

  // 确定扩展名
  const ext = item.type === 'flac' ? 'flac' : 'mp3';
  const outFile = `${filename}_${level}_br${br}.${ext}`;

  console.log(`[2/3] 下载中... → ${outFile}`);

  const audioRes = await fetch(url);
  if (!audioRes.ok) {
    console.error(`ERROR: 下载失败 HTTP ${audioRes.status}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await audioRes.arrayBuffer());
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

  const { writeFileSync } = await import('fs');
  writeFileSync(outFile, buffer);

  console.log(`[3/3] 完成 → ${outFile} (${sizeMB} MB)`);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});