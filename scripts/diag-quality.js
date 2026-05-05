(async () => {
  const cookie = localStorage.getItem('ncm_login_cookie');
  if (!cookie) return console.log('NOT LOGGED IN');

  const levels = [
    { label: 'jymaster(超清母带)', level: 'jymaster', minBr: 1920000 },
    { label: 'dolby(杜比全景声)', level: 'dolby', minBr: 1920000 },
    { label: 'sky(沉浸环绕声)',   level: 'sky',     minBr: 1920000 },
    { label: 'jyeffect(高清臻音)', level: 'jyeffect', minBr: 1920000 },
    { label: 'hires(Hi-Res)',     level: 'hires',   minBr: 1920000 },
    { label: 'lossless(无损SQ)',  level: 'lossless', minBr: 800000 },
    { label: 'exhigh(极高HQ)',   level: 'exhigh',  minBr: 320000 },
    { label: 'higher(较高)',     level: 'higher',  minBr: 192000 },
    { label: 'standard(标准)',   level: 'standard', minBr: 128000 },
  ];

  const id = 2650815712;
  console.log('=== QUALITY DIAGNOSIS (trackId=' + id + ') ===');

  for (const q of levels) {
    try {
      const url = '/api/song/url/v1?id=' + id + '&level=' + q.level + '&cookie=' + encodeURIComponent(cookie);
      const res = await fetch(url);
      const data = await res.json();
      const item = data?.data?.[0];
      const br = item?.br || 0;
      const pass = br >= q.minBr;
      const icon = pass ? 'PASS' : 'DOWNGRADE';
      console.log(
        icon + ' | ' + q.label.padEnd(25) + ' | br=' + String(br).padStart(8) +
        (pass ? '' : ' (got ' + br + ', need >=' + q.minBr + ')') +
        (item?.url ? '' : ' [NO URL]')
      );
    } catch(e) {
      console.log('FAIL | ' + q.label + ' | ' + (e.message || e));
    }
  }
})();