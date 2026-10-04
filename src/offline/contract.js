export function installContract({ api, prepareSdk, connect }) {
  window.orbipom = {
    api,
    prepareSdk,
    connect,
    ignoreTelemetry() {}
  };
}
