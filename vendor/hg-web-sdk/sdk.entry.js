// Loads the pinned hg-web-sdk@3.0.3 bundle. No grayscale lookup and no cache-busting query.
(function () {
  var current = document.currentScript;
  if (!current || !current.src) {
    throw new Error('sdk.entry.js must load from a script tag with src');
  }
  var script = document.createElement('script');
  script.src = new URL('3.0.3/hg-web-sdk.min.js', current.src).href;
  script.defer = true;
  document.head.appendChild(script);
}());
