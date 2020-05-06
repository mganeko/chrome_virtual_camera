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

  // --- tfjs ---
  const res_tf = await fetch('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.2', { method: 'GET' })
  _loaderlog('loader load() after fetch tf.js');
  const js_tf = await res_tf.text();
  _loaderlog('loader load() after res_tf.text()');
  const script_tf = document.createElement('script');
  //script_tf.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.2';
  script_tf.textContent = js_tf;

  // --- bodypix ---
  const script_bp = document.createElement('script');
  // const res_bp = await fetch('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0', { method: 'GET' })
  // _loaderlog('loader load() after fetch bodypix.js');
  // const js_bp = await res_bp.text();
  // _loaderlog('loader load() after js_bp.text()');
  // script_bp.textContent = js_bp;
  script_bp.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0';

  document.body.insertBefore(script_bp, document.body.firstChild);
  document.body.insertBefore(script_tf, document.body.firstChild);
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


