console.log('cs.js');

// TODO:
//   - DONE: stop Animation
//   - DONE: clear canvas at start
//   - DONE: setup canvas size
//   - DONE: dummy video with dummy audio
//   - DONE: dummy audio only
//   - bodybipx mask

function main() {
  'use strict'
  if (navigator.mediaDevices._getUserMedia !== undefined) return;
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  //canvas.width = 1280;
  //canvas.height = 720;
  canvas.width = 640;
  canvas.height = 480;
  let keepAnimation = false;
  let keepSound = false;
  const canvasCtx = canvas.getContext('2d');
  let audioCtx = null;
  let audioOutput = null;
  let audioGain = null;


  // --- ファイル選択GUIを挿入 ---
  function _insertPanel(node) {
    try {
      const html1 =
        `<div style="border: 1px solid blue;">
        <table>
          <tr>
            <td><label for="video_file">動画</label></td>
            <td><input type="file" accept="video/mp4,image/*" id="video_file"></td>
            <td>
              <select id="video_type" title="切り替え後はいったんカメラをオフ→オンにする必要があります。">
                <option value="camera">カメラ</option>
                <option value="file">ファイル</option>
                <option value="composite" selected="1">時計</option>
              </select>
            </td>
            <td><span id="message_span">message</span></td>
          </tr>
          <!--
          <tr>
            <td><label for="afile">効果音</label></td>
            <td><input type="file" accept="audio/mpeg" id="afile"></td>
            <td><span id="message2_span"><span></td>
          </tr>
          -->
        </table>
        </div>`;
      node.insertAdjacentHTML('beforeend', html1);

      node.querySelector('#video_file').addEventListener('change', (evt) => {
        _startVideoPlay();
      }, false);
    } catch (e) {
      console.error('_insertPanel() ERROR:', e);
    }
  }

  function _replaceGetUserMedia() {
    if (navigator.mediaDevices._getUserMedia) {
      console.warn('ALREADY replace getUserMedia()');
      return;
    }

    console.log('replacing GUM');
    _showMessage('replace GUM');

    navigator.mediaDevices._getUserMedia = navigator.mediaDevices.getUserMedia
    navigator.mediaDevices.getUserMedia = _modifiedGetUserMedia;
  }

  function _showMessage(str) {
    const span = document.getElementById('message_span');
    if (span) {
      span.innerHTML = str;
    }
  }

  function _setVideoType(type) {
    const select = document.getElementById('video_type');
    if (select) {
      select.value = type;
    }
  }

  function _startVideoPlay() {
    const videoFile = document.getElementById('video_file');
    const file = (videoFile.files && videoFile.files.length) ? videoFile.files[0] : null;
    if (file && file.type.startsWith('video/')) {
      console.log('playback video:', file.name);
      _showMessage('start play');
      const url = window.URL.createObjectURL(file);
      video.loop = true;
      video.muted = true;
      video.src = url;
      video.playbackRate = 1.0;

      video.onloadedmetadata = () => {
        _showMessage('metadata loaded');
        _setVideoType('file');
      };
    }
  }

  function _updateCanvas() {
    const currentTime = new Date();
    const strTime = _2digit(currentTime.getHours()) + ':' + _2digit(currentTime.getMinutes()) + ':' + _2digit(currentTime.getSeconds());

    const fontHeight = Math.min(parseInt(canvas.height / 5), 120);
    const textTop = parseInt(canvas.height / 5) * 2;
    const textLeft = parseInt(canvas.width / 10);
    canvasCtx.font = fontHeight + 'px serif'; //'128px serif';

    //canvasCtx.fillStyle = 'rgb(255,255,255)';
    canvasCtx.fillStyle = 'rgb(240,240,240)';
    canvasCtx.fillRect(textLeft - 2, (textTop - fontHeight) - 2, fontHeight * 5 + 20, fontHeight + 8);
    canvasCtx.fillStyle = 'rgb(0,0,255)';
    canvasCtx.fillText(strTime, textLeft, textTop);

    if (keepAnimation) {
      requestAnimationFrame(_updateCanvas);
    }
  }

  function _clearCanvas() {
    canvasCtx.fillStyle = 'rgb(255,255,255)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function _2digit(str) {
    return ('0' + str).slice(-2);
  }


  function _modifiedGetUserMedia(constraints) {
    const select = document.getElementById('video_type');

    // --- video constraints ---
    const withVideo = !(!constraints.video);
    if (constraints.video) {
      _setupCanvasSize(constraints);
    }

    // --- audio constraints ---
    const withAudio = !(!constraints.audio);

    // --- start media ---
    if (select?.value === 'file') {
      _showMessage('use video');
      return _startVideoFileStream(withVideo, withAudio);
    }
    else if (select?.value === 'composite') {
      _showMessage('use canvas');
      return _startCanvasStream(withVideo, withAudio);
    }
    else {
      _showMessage('use camera');
      return navigator.mediaDevices._getUserMedia(constraints);
    }
  }

  function _setupCanvasSize(constraints) {
    if (constraints.video?.width?.exact) {
      canvas.width = constraints.video.width.exact;
    }
    else if (constraints.video?.width?.ideal) {
      canvas.width = constraints.video.width.ideal;
    }
    else if (constraints.video?.width) {
      canvas.width = constraints.video.width;
    }

    if (constraints.video?.height?.exact) {
      canvas.height = constraints.video.height.exact;
    }
    else if (constraints.video?.height?.ideal) {
      canvas.height = constraints.video.height.ideal;
    }
    else if (constraints.video?.height) {
      canvas.height = constraints.video.height;
    }

    console.log('canvas width,height=', canvas.width, canvas.height);
  }

  function _startVideoFileStream(withVideo, withAudio) {
    return new Promise((resolve, reject) => {
      video.play()
        .then(() => {
          const stream = video.captureStream();
          if (!stream) { reject('video Capture ERROR'); }

          if ((!withVideo) && (stream.getVideoTracks().length > 0)) {
            // remove video track
            console.log('remove video track from video');
            const videoTrack = stream.getVideoTracks()[0];
            stream.removeTrack(videoTrack);
            videoTrack.stop();
          }

          if ((!withAudio) && (stream.getAudioTracks().length > 0)) {
            // remove audio track
            console.log('remove audio track from video');
            const audioTrack = stream.getAudioTracks()[0];
            stream.removeTrack(audioTrack);
            audioTrack.stop();
          }

          resolve(stream);
        }).
        catch(err => reject(err));
    });
  }

  function _startCanvasStream(withVideo, withAudio) {
    return new Promise((resolve, reject) => {
      let stream = null;

      if ((!withVideo) && (!withAudio)) {
        // Nothing
        reject('NO video/audio specified');
      }

      if (withVideo) {
        _clearCanvas();
        requestAnimationFrame(_updateCanvas);
        stream = canvas.captureStream(10);
        if (!stream) {
          reject('canvas Capture ERROR');
        }
        keepAnimation = true;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack._stop = videoTrack.stop;
          videoTrack.stop = function () {
            console.log('camvas stream stop');
            keepAnimation = false;
            videoTrack._stop();
          };
        }
      }
      else {
        stream = new MediaStream();
      }

      if (withAudio) {
        if (!audioCtx) {
          audioCtx = new AudioContext();
        }
        audioOutput = audioCtx.createMediaStreamDestination();
        audioGain = audioCtx.createGain();
        audioGain.gain.value = 0.2; // Gain (0 - 1)
        audioGain.connect(audioOutput);

        keepSound = true;
        _nextAudioNode();
        console.log('start webAudio');

        const audioTrack = audioOutput.stream.getAudioTracks()[0];
        if (audioTrack) {
          if (!audioTrack._stop) {
            audioTrack._stop = audioTrack.stop;
            audioTrack.stop = function () {
              console.log('webaudio stop');
              keepSound = false;
              audioTrack._stop();
            };
          }
          stream.addTrack(audioTrack);
        }
        else {
          console.warn('WebAudio error, but skip');
        }
      }

      resolve(stream);
    });
  }

  function _nextAudioNode() {
    const beepInterval = 1.0; // sec
    const beepDuration = 0.05; // sec
    if (keepSound) {
      const osc = audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 220; // Hz
      osc.connect(audioGain);
      osc.onended = _nextAudioNode;
      osc.start(audioCtx.currentTime + (beepInterval - beepDuration));
      osc.stop(audioCtx.currentTime + beepInterval);
    }
  }

  // -----------------
  console.log('cs main()');
  const insertPoint = document.body;
  _insertPanel(insertPoint);
  _replaceGetUserMedia();
}

main()
