/**
 * @name my音源
 * @description 支持网易云音乐和QQ音乐的自定义音源
 * @version 1.0.0
 * @author Your Name
 * @homepage http://blog.20204.xyz
 */

const { EVENT_NAMES, request, on, send } = globalThis.lx;

// 定义 HTTP 请求函数
const httpRequest = (url, options) => new Promise((resolve, reject) => {
  request(url, options, (err, resp) => {
    if (err) return reject(err);
    resolve(resp.body);
  });
});

// 定义 API 调用逻辑
const apis = {
  wy: {
    musicUrl(musicInfo, quality) {
      const id = musicInfo.id; // 假设 musicInfo.id 是歌曲 ID
      const qualityMap = {
        '128k': '128000',
        '320k': '320000',
        flac: 'flac',
        flac24bit: 'flac24bit',
      };
      const q = qualityMap[quality] || '128000';
      return httpRequest(`http://wy.ww.20204.xyz/song/url?id=${id}&quality=${q}`).then(data => {
        return data.url; // 假设 API 返回 { url: '...' }
      });
    },
  },
  tx: {
    musicUrl(musicInfo, quality) {
      const id = musicInfo.id; // 假设 musicInfo.id 是歌曲 ID
      const qualityMap = {
        '128k': '128',
        '320k': '320',
        flac: 'flac',
        flac24bit: 'flac24bit',
      };
      const q = qualityMap[quality] || '128';
      return httpRequest(`http://qq.ww.20204.xyz/song/url?id=${id}&quality=${q}`).then(data => {
        return data.url; // 假设 API 返回 { url: '...' }
      });
    },
  },
};

// 注册请求事件
on(EVENT_NAMES.request, ({ source, action, info }) => {
  if (action === 'musicUrl') {
    return apis[source].musicUrl(info.musicInfo, info.type);
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
  },
});
