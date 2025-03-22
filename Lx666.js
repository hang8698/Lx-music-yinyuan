/**
 * @name my音源
 * @description 支持网易云音乐和QQ音乐的自定义音源
 * @version 1.0.100
 * @author Your Name
 * @homepage http://yourwebsite.com
 */

const { EVENT_NAMES, request, on, send } = globalThis.lx;

// 定义 HTTP 请求函数，改进错误处理
const httpRequest = (url, options) => new Promise((resolve, reject) => {
  request(url, options, (err, resp) => {
    if (err) {
      return reject(new Error(`Network error: ${err.message}`));
    }
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      return reject(new Error(`HTTP error: ${resp.statusCode} for ${url}`));
    }
    resolve(resp.body);
  });
});

// 定义 API 调用逻辑，增加数据校验
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
      const apiUrl = `http://wy.ww.20204.xyz/song/url?id=${id}&quality=${q}`;
      return httpRequest(apiUrl).then(data => {
        if (!data || !data.url) {
          throw new Error(`API response missing 'url' for ${apiUrl}`);
        }
        return data.url;
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
      const apiUrl = `http://qq.ww.20204.xyz/song/url?id=${id}&quality=${q}`;
      return httpRequest(apiUrl).then(data => {
        if (!data || !data.url) {
          throw new Error(`API response missing 'url' for ${apiUrl}`);
        }
        return data.url;
      });
    },
  },
};

// 注册请求事件，捕获并显示错误
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
  },
});
