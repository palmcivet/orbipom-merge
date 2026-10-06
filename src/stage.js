(function () {
  var root = document.documentElement;

  function coarse() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  function deviceLandscape() {
    var angle = window.orientation;
    if (typeof angle === 'number') return Math.abs(angle) === 90;
    if (coarse() && screen.orientation && typeof screen.orientation.type === 'string') {
      return screen.orientation.type.indexOf('landscape') === 0;
    }
    return window.matchMedia('(orientation: landscape)').matches;
  }

  function sync() {
    var viewport = window.visualViewport;
    var width = viewport && viewport.width ? viewport.width : window.innerWidth;
    var height = viewport && viewport.height ? viewport.height : window.innerHeight;
    root.style.setProperty('--app-width', width + 'px');
    root.style.setProperty('--app-height', height + 'px');
    root.classList.toggle('device-landscape', deviceLandscape());
  }

  sync();
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', function () {
    sync();
    setTimeout(sync, 120);
    setTimeout(sync, 400);
  });
  if (window.visualViewport) visualViewport.addEventListener('resize', sync);
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', sync);
  }
})();
