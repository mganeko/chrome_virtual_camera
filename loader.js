async function load() {
  const res = await fetch(chrome.runtime.getURL('cs.js'), { method: 'GET' })
  const js = await res.text()
  const script = document.createElement('script')
  script.textContent = js
  document.body.insertBefore(script, document.body.firstChild)

  // --- tfjs ---
  const res_tf = await fetch('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.2', { method: 'GET' })
  const js_tf = await res_tf.text();
  const script_tf = document.createElement('script');
  script_tf.textContent = js_tf;

  // --- bodypix ---
  const script_bp = document.createElement('script');
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


