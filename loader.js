async function load() {
  _loaderlog('loader load()');
  _loaderlog('GUM2:', navigator.mediaDevices.getUserMedia);
  const res = await fetch(chrome.runtime.getURL('cs.js'), { method: 'GET' })
  _loaderlog('loader load() after fetch');
  const js = await res.text()
  _loaderlog('loader load() after res.text()');
  const script = document.createElement('script')
  script.textContent = js
  _loaderlog('loader load() after createElement(script');
  document.body.insertBefore(script, document.body.firstChild)
  _loaderlog('loader load() END');
}

const _PRINT_LOADER_LOG = false;
function _loaderlog(var_args) {
  if (_PRINT_LOADER_LOG) {
    console.log(...arguments);
  }
}

// window.addEventListener('load', (evt) => {
//   _loaderlog('event load'); // 元のindex.html の中の処理より後に呼ばれる
//   load()
// }, false)

window.addEventListener('load', async (evt) => {
  _loaderlog('event load'); // 元のindex.html の中の処理より後に呼ばれる
  await load()
}, true) // use capture

_loaderlog('loader.js');

if (!navigator.mediaDevices._originalGetUserMedia) {
  _loaderlog('loader replacing');
  navigator.mediaDevices._originalGetUserMedia = navigator.mediaDevices.getUserMedia;
  _loaderlog('GUM0:', navigator.mediaDevices.getUserMedia);
  navigator.mediaDevices.getUserMedia = null; //function () { _loaderlog('NONE GUM') };
  // ここで入れ替えても、もとのindex.htmlでは置き換わっていない
  _loaderlog('GUM1:', navigator.mediaDevices.getUserMedia);
}


