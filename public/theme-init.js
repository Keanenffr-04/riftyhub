/* Sets the saved theme before the page is first painted, so there is no flash of the wrong theme. */
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('riftyhub:preferences') || '{}')
    var light = prefs.theme === 'light' || (prefs.theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
    var root = document.documentElement
    root.dataset.theme = light ? 'light' : 'dark'
    if (prefs.density === 'compact') root.dataset.density = 'compact'
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', light ? '#f6f6fa' : '#0c0c10')
  } catch (e) {}
})()
