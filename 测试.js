/**
 * @name my音源
 * @description 直接获取音乐
 * @version 2.0.1
 * @author myyy
 * @homepage http://yourwebsite.com
 */

const { EVENT_NAMES, request, on, send } = globalThis.lx;

// 定义 HTTP 请求函数
const httpRequest = (url, options) => new Promise((resolve, reject) => {
  request(url, options, (err, resp) => {
    if (err) return reject(new Error(`Network error: ${err.message}`));
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      return reject(new Error(`HTTP error: ${resp.statusCode} for ${url}`));
    }
    resolve(resp.body);
  });
});

// 定义质量映射
const qualityMappings = {
  wy: {
    '128k': '128000',
    '320k': '320000',
    'flac': '999000',
    'flac24bit': '999000', // 降级到 flac，避免 flac24bit 不可用
  },
  tx: {
    '128k': 'M500',
    '320k': 'M800',
    'flac': 'F000',
    'flac24bit': 'F000', // QQ 音乐可能不支持 flac24bit
  },
  kw: {
    '128k': '128kmp3',
    '320k': '320kmp3',
    'flac': '2000kflac',
    'flac24bit': '2000kflac', // 酷我可能不支持 flac24bit
  },
  kg: {
    '128k': '128',
    '320k': '320',
    'flac': 'flac',
    'flac24bit': 'flac', // 酷狗可能不支持 flac24bit
  },
};

// 通用请求头
const commonHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

// 定义 API 调用逻辑
const apis = {
  wy: {
    musicUrl(musicInfo, quality) {
      const id = musicInfo.id;
      const q = qualityMappings.wy[quality] || '128000';
      const apiUrl = `https://music.163.com/api/song/enhance/player/url?id=${id}&ids=[${id}]&br=${q}`;
      return httpRequest(apiUrl, {
        headers: {
          ...commonHeaders,
          'Referer': 'https://music.163.com/',
          // 如果需要认证，请添加 Cookie，例如：
          // 'Cookie': 'MUSIC_U=your_music_u_cookie_here'
        }
      }).then(data => {
        if (!data?.data?.[0]?.url) {
          throw new Error(`API response missing 'url' for ${apiUrl}, response: ${JSON.stringify(data)}`);
        }
        return data.data[0].url;
      });
    },
  },
  tx: {
    musicUrl(musicInfo, quality) {
      const id = musicInfo.songmid || musicInfo.id;
      const q = qualityMappings.tx[quality] || 'M500';
      const apiUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data={"req_0":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"123456789","songmid":["${id}"],"songtype":[0],"uin":"0","loginflag":0,"platform":"20"}}}`;
      return httpRequest(apiUrl, {
        headers: {
          ...commonHeaders,
          'Referer': 'https://y.qq.com/',
          // 如果需要认证，请添加 Cookie，例如：
          // 'Cookie': 'uin=your_uin_here; qqmusic_key=your_key_here'
        }
      }).then(data => {
        if (!data?.req_0?.data?.midurlinfo?.[0]?.purl) {
          throw new Error(`API response missing 'purl' for ${apiUrl}, response: ${JSON.stringify(data)}`);
        }
        const purl = data.req_0.data.midurlinfo[0].purl;
        const sip = data.req_0.data.sip[0];
        return `${sip}${purl}`;
      });
    },
  },
  kw: {
    musicUrl(musicInfo, quality) {
      const id = musicInfo.id;
      const q = qualityMappings.kw[quality] || '128kmp3';
      const apiUrl = `http://www.kuwo.cn/api/v1/www/music/playUrl?mid=${id}&type=music&br=${q}`;
      return httpRequest(apiUrl, {
        headers: {
          ...commonHeaders,
          'Referer': 'http://www.kuwo.cn/',
          // 如果需要认证，请添加 Cookie，例如：
          // 'Cookie': 'kw_token=your_kw_token_here'
        }
      }).then(data => {
        if (!data?.data?.url) {
          throw new Error(`API response missing 'url' for ${apiUrl}, response: ${JSON.stringify(data)}`);
        }
        return data.data.url;
      });
    },
  },
  kg: {
    musicUrl(musicInfo, quality) {
      const id = musicInfo.hash || musicInfo.id;
      const q = qualityMappings.kg[quality] || '128';
      const apiUrl = `http://www.kugou.com/yy/index.php?r=play/getdata&hash=${id}&album_id=0&mid=1&platid=4`;
      return httpRequest(apiUrl, {
        headers: {
          ...commonHeaders,
          'Referer': 'http://www.kugou.com/',
          // 如果需要认证，请添加 Cookie，例如：
          // 'Cookie': 'kg_mid=your_kg_mid_here'
        }
      }).then(data => {
        if (!data?.data?.play_url) {
          throw new Error(`API response missing 'play_url' for ${apiUrl}, response: ${JSON.stringify(data)}`);
        }
        return data.data.play_url;
      });
    },
  },
};

// 注册请求事件
on(EVENT_NAMES.request, ({ source, action, info }) => {
  if (action === 'musicUrl') {
    return apis[source].musicUrl(info.musicInfo, info.type).catch(err => {
      send(EVENT_NAMES.updateAlert, {
        title: 'Error',
        body: `Failed to get music URL for ${source}: ${err.message}`
      });
      return Promise.reject(err);
    });
  }
  return Promise.reject(new Error('Unsupported action'));
});

// 初始化音源
send(EVENT_NAMES.inited, {
  sources: {
    wy: {
      name: '网易云音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'],
    },
    tx: {
      name: 'QQ音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'],
    },
    kw: {
      name: '酷我音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'],
    },
    kg: {
      name: '酷狗音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '320k', 'flac', 'flac24bit'],
    },
  },
});
