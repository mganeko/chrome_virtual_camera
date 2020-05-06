async function load() {
  console.log('loader load()');
  console.log('GUM2:', navigator.mediaDevices.getUserMedia);
  const res = await fetch(chrome.runtime.getURL('cs.js'), { method: 'GET' })
  console.log('loader load() after fetch');
  const js = await res.text()
  console.log('loader load() after res.text()');
  const script = document.createElement('script')
  script.textContent = js
  console.log('loader load() after createElement(script');
  document.body.insertBefore(script, document.body.firstChild)
  console.log('loader load() END');
}

// window.addEventListener('load', (evt) => {
//   console.log('event load'); // 元のindex.html の中の処理より後に呼ばれる
//   load()
// }, false)

window.addEventListener('load', async (evt) => {
  console.log('event load'); // 元のindex.html の中の処理より後に呼ばれる
  await load()
}, true) // use capture

console.log('loader.js');

if (!navigator.mediaDevices._originalGetUserMedia) {
  console.log('loader replacing');
  navigator.mediaDevices._originalGetUserMedia = navigator.mediaDevices.getUserMedia;
  console.log('GUM0:', navigator.mediaDevices.getUserMedia);
  navigator.mediaDevices.getUserMedia = null; //function () { console.log('NONE GUM') };
  // ここで入れ替えても、もとのindex.htmlでは置き換わっていない
  console.log('GUM1:', navigator.mediaDevices.getUserMedia);
}


