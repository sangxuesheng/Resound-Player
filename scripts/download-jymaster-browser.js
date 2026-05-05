/**
 * 浏览器控制台运行：下载所有音质
 *
 * 用法：复制全部内容，粘贴到浏览器控制台回车即可
 * 会自动依次下载 9 种音质，间隔 2 秒避免浏览器弹窗冲突
 */
(async function () {
  // 取 cookie：先 localStorage，没命中则查 IndexedDB
  var cookie = localStorage.getItem('ncm_login_cookie') || '';

  if (!cookie) {
    cookie = await new Promise(function (resolve, reject) {
      var r = indexedDB.open('gemini_music', 1);
      r.onsuccess = function () {
        var tx = r.result.transaction('large_items', 'readonly');
        var req = tx.objectStore('large_items').get('ncm_login_cookie');
        req.onsuccess = function () { resolve(req.result || ''); };
        req.onerror = function () { reject(req.error); };
      };
      r.onerror = function () { reject(r.error); };
    });
  }

  if (!cookie) {
    console.log('NOT LOGGED IN');
    return;
  }

  var trackId = 5264842; // 渡口

  var LEVELS = [
    { level: 'jymaster', label: '超清母带' },
    { level: 'dolby',    label: '杜比全景声' },
    { level: 'sky',      label: '沉浸环绕声' },
    { level: 'jyeffect', label: '高清臻音' },
    { level: 'hires',    label: 'Hi-Res' },
    { level: 'lossless', label: '无损SQ' },
    { level: 'exhigh',   label: '极高HQ' },
    { level: 'higher',   label: '较高' },
    { level: 'standard', label: '标准' },
  ];

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // 1. 获取歌曲信息
  console.log('='.repeat(50));
  console.log('获取歌曲信息 (id=' + trackId + ')...');
  var detailRes = await fetch('/api/song/detail?ids=' + trackId);
  var detailJson = await detailRes.json();
  var song = detailJson && detailJson.songs && detailJson.songs[0];
  var songName = song ? song.name + ' - ' + (song.ar || []).map(function (a) { return a.name; }).join(',') : 'track_' + trackId;
  var safeName = songName.replace(/[\\/:*?"<>|]/g, '_');
  console.log('  歌曲: ' + songName);
  console.log('='.repeat(50));

  var results = [];

  for (var i = 0; i < LEVELS.length; i++) {
    var level = LEVELS[i].level;
    var label = LEVELS[i].label;
    var n = i + 1;
    console.log('[' + n + '/' + LEVELS.length + '] 请求 ' + label + ' (' + level + ')...');

    try {
      var urlRes = await fetch(
        '/api/song/url/v1?id=' + trackId + '&level=' + level + '&cookie=' + encodeURIComponent(cookie)
      );
      var urlJson = await urlRes.json();
      var item = (urlJson && urlJson.data && urlJson.data[0]) || {};

      if (!item.url) {
        console.log('  skip - no URL');
        results.push({ level: level, label: label, br: item.br || 0, url: null, status: 'NO_URL' });
        continue;
      }

      var br = item.br;
      var brKBps = Math.round(br / 1000);
      var ext = item.type === 'flac' ? 'flac' : 'mp3';
      var filename = safeName + '_' + label + '_' + brKBps + 'kbps.' + ext;

      console.log('  br=' + br + ' (' + brKBps + 'kbps) | type=' + (item.type || '?'));

      // 下载
      var audioRes = await fetch(item.url);
      if (!audioRes.ok) {
        console.log('  download fail HTTP ' + audioRes.status);
        results.push({ level: level, label: label, br: br, url: item.url, status: 'DOWNLOAD_FAIL' });
        continue;
      }

      var blob = await audioRes.blob();
      var sizeMB = (blob.size / 1024 / 1024).toFixed(2);

      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      console.log('  OK -> ' + filename + ' (' + sizeMB + ' MB)');
      results.push({ level: level, label: label, br: br, sizeMB: sizeMB, filename: filename, status: 'OK' });

      if (i < LEVELS.length - 1) {
        console.log('  (wait 2s...)');
        await sleep(2000);
      }
    } catch (e) {
      console.error('  error: ' + (e.message || e));
      results.push({ level: level, label: label, br: 0, status: 'ERROR', error: e.message });
    }
  }

  // 汇总
  console.log('');
  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  for (var j = 0; j < results.length; j++) {
    var r = results[j];
    var icon = r.status === 'OK' ? 'OK' : 'XX';
    var size = r.sizeMB ? ' (' + r.sizeMB + ' MB)' : '';
    var brStr = r.br ? Math.round(r.br / 1000) + 'kbps' : '-';
    var note = '';
    if (r.status === 'NO_URL') note = ' [no url]';
    else if (r.status === 'DOWNLOAD_FAIL') note = ' [fail]';
    else if (r.status === 'ERROR') note = ' [' + r.error + ']';
    console.log('  ' + icon + ' ' + r.label + ' | ' + brStr + ' | ' + (r.filename || '-') + size + note);
  }
  console.log('='.repeat(50));
  var okCount = results.filter(function (r) { return r.status === 'OK'; }).length;
  console.log('Done: ' + okCount + '/' + LEVELS.length + ' OK');
})();