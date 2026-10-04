export function createSdkBridge({ profiles, downloadFile, goHome }) {
  return function prepareSdk(sdk) {
    sdk.Bridge.getPlatform = () => sdk.Platform.Qt;
    sdk.Bridge.getENV = () => ({ language: 'zh-cn', game: sdk.EGame.ENDFIELD });
    sdk.Bridge.getIsCloud = () => false;
    sdk.Bridge.invoke = () => Promise.resolve();
    sdk.Bridge.invokeWithReturnValue = () => Promise.resolve({});
    sdk.WebView.event = () => Promise.resolve();
    sdk.WebView.initETL = () => Promise.resolve();
    sdk.WebView.ready = () => Promise.resolve();
    sdk.WebView.setCursorVisible = () => {};
    sdk.WebView.getShareChannels = () => [];
    sdk.WebView.share = (channel, content) => {
      const filename = content.fileName || '山团团-成绩';
      downloadFile(content.image, filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`);
      return Promise.resolve({ status: 0, savedPath: '浏览器下载目录（本地图片）' });
    };
    sdk.WebView.close = () => {
      profiles.persistNow();
      goHome();
      return Promise.resolve();
    };
    return sdk;
  };
}
