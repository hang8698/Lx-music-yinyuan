/*!
 * @name my音源
 * @description 直接从tx.wy.kg.kw资源(如失效请去：lx.20204.xyz)
 * @version v2.1.0
 * @author h8698
 */

// 开发模式开关（调试时开启）
const DEV_ENABLE = true;

// ================== 平台配置 ==================
// 各平台支持音质（根据账号权限调整）
const MUSIC_QUALITY = {
  wy: ['128k', '320k', 'flac'],     // 网易云
  tx: ['128k', '320k', 'flac'],     // QQ音乐
  kw: ['128k', '320k', 'flac'],     // 酷我
  kg: ['128k', '320k', 'flac'],     // 酷狗
};

// 音源列表（自动生成）
const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY);

/**
 * --------------------------------
 * 以下为核心逻辑
 * --------------------------------
 */
const { EVENT_NAMES, request, on, send, utils } = globalThis.lx;

// ================== 平台接口定义 ==================
const platformApis = {
  // 网易云音乐
  wy: {
    musicUrl: async (musicInfo, quality) => {
      const qMap = { '128k': '128000', '320k': '320000', 'flac': '999000' };
      const url = `https://music.163.com/api/song/enhance/player/url?id=${musicInfo.id}&ids=[${musicInfo.id}]&br=${qMap[quality]}`;
      
      const resp = await httpRequest(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://music.163.com/',
          // 如果需要认证，请取消注释并填写你的 MUSIC_U Cookie
          // 'Cookie': 'MUSIC_U=your_music_u_cookie_here'
        }
      });

      if (!resp.data?.[0]?.url) throw new Error('获取链接失败');
      return resp.data[0].url;
    }
  },

  // QQ音乐
  tx: {
    musicUrl: async (musicInfo, quality) => {
      const qMap = { '128k': 'M500', '320k': 'M800', 'flac': 'F000' };
      const songmid = musicInfo.songmid || musicInfo.id;
      const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify({
        req_0: {
          module: "vkey.GetVkeyServer",
          method: "CgiGetVkey",
          param: {
            guid: "123456789",
            songmid: [songmid],
            songtype: [0],
            uin: "0",
            loginflag: 0,
            platform: "20"
          }
        }
      }))}`;

      const resp = await httpRequest(url, {
        headers: {
          'Referer': 'https://y.qq.com/',
          // 如果需要认证，请取消注释并填写你的 QQ音乐 Cookie
          // 'Cookie': 'uin=your_uin_here; qqmusic_key=your_key_here'
        }
      });

      const purl = resp.req_0?.data?.midurlinfo?.[0]?.purl;
      if (!purl) throw new Error('获取链接失败');
      return `https://dl.stream.qqmusic.qq.com/${purl}`;
    }
  },

  // 酷我音乐
  kw: {
    musicUrl: async (musicInfo, quality) => {
      const qMap = { '128k': '128kmp3', '320k': '320kmp3', 'flac': '2000kflac' };
      const url = `http://www.kuwo.cn/api/v1/www/music/playUrl?mid=${musicInfo.id}&type=music&br=${qMap[quality]}`;

      const resp = await httpRequest(url, {
        headers: {
          'Referer': 'http://www.kuwo.cn/',
          // 如果需要认证，请取消注释并填写你的酷我音乐 Cookie
          // 'Cookie': 'kw_token=your_kw_token_here'
        }
      });

      if (!resp.data?.url) throw new Error('获取链接失败');
      return resp.data.url;
    }
  },

  // 酷狗音乐
  kg: {
    musicUrl: async (musicInfo, quality) => {
      const qMap = { '128k': '128', '320k': '320', 'flac': 'flac' };
      const url = `http://www.kugou.com/yy/index.php?r=play/getdata&hash=${musicInfo.hash || musicInfo.id}&album_id=0&mid=1&platid=4`;

      const resp = await httpRequest(url, {
        headers: {
          'Referer': 'http://www.kugou.com/',
          // 如果需要认证，请取消注释并填写你的酷狗音乐 Cookie
          // 'Cookie': 'kg_mid=your_kg_mid_here'
        }
      });

      if (!resp.data?.play_url) throw new Error('获取链接失败');
      return resp.data.play_url;
    }
  }
};

// ================== 通用工具 ==================
const httpRequest = (url, options) => {
  return new Promise((resolve, reject) => {
    request(url, options, (err, resp) => {
      if (err || resp.statusCode !== 200) {
        reject(new Error(`请求失败: ${err?.message || resp.statusCode}`));
      } else {
        try {
          resolve(JSON.parse(resp.body));
        } catch(e) {
          reject(new Error('响应解析失败'));
        }
      }
    });
  });
};

// ================== 调试工具 ==================
const debugLog = (title, message) => {
  if (DEV_ENABLE) {
    send(EVENT_NAMES.updateAlert, {
      title: `[调试] ${title}`,
      body: message
    });
  }
  console.log(`[调试] ${title}: ${message}`);
};

// ================== 事件处理 ==================
on(EVENT_NAMES.request, ({ action, source, info }) => {
  if (action !== 'musicUrl') return Promise.reject('不支持的操作');
  
  const logMessage = `[${source}] 请求音质: ${info.type}\n歌曲ID: ${info.musicInfo.id}`;
  debugLog('请求开始', logMessage);

  return platformApis[source].musicUrl(info.musicInfo, info.type)
    .then(url => {
      debugLog('请求成功', `[${source}] 获取链接成功: ${url}`);
      return url;
    })
    .catch(err => {
      debugLog('请求失败', `[${source}] 错误: ${err.message}`);
      send(EVENT_NAMES.updateAlert, { title: '错误', body: err.message });
      throw err;
    });
});

// ================== 初始化 ==================
send(EVENT_NAMES.inited, {
  status: true,
  openDevTools: DEV_ENABLE,
  sources: Object.fromEntries(
    MUSIC_SOURCE.map(source => ([
      source,
      {
        name: {
          wy: '网易云',
          tx: 'QQ音乐',
          kw: '酷我',
          kg: '酷狗'
        }[source],
        type: 'music',
        actions: ['musicUrl'],
        qualitys: MUSIC_QUALITY[source]
      }
    ]))
  )
});
