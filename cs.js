//console.info('cs.js');

// TODO:
//   - DONE: stop Animation
//   - DONE: clear canvas at start
//   - DONE: setup canvas size
//   - DONE: dummy video with dummy audio
//   - DONE: dummy audio only
//   - DONE: debuglog
//   - bodybipx mask

function main() {
  'use strict'
  const PRINT_DEBUG_LOG = true;
  //const PRINT_DEBUG_LOG = false;

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
                <option value="mask_backbround">背景をマスク</option>
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

    _debuglog('replacing GUM');
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

  function _debuglog(var_args) {
    if (PRINT_DEBUG_LOG) {
      console.log(...arguments);
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
      _debuglog('playback video:', file.name);
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
    else if (select?.value === 'mask_backbround') {
      _showMessage('use bodypix');
      return _startBodyPixStream(withVideo, withAudio, constraints);
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

    _debuglog('canvas width,height=', canvas.width, canvas.height);
  }

  function _startVideoFileStream(withVideo, withAudio) {
    return new Promise((resolve, reject) => {
      video.play()
        .then(() => {
          const stream = video.captureStream();
          if (!stream) { reject('video Capture ERROR'); }

          if ((!withVideo) && (stream.getVideoTracks().length > 0)) {
            // remove video track
            _debuglog('remove video track from video');
            const videoTrack = stream.getVideoTracks()[0];
            stream.removeTrack(videoTrack);
            videoTrack.stop();
          }

          if ((!withAudio) && (stream.getAudioTracks().length > 0)) {
            // remove audio track
            _debuglog('remove audio track from video');
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
            _debuglog('camvas stream stop');
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
        _debuglog('start webAudio');

        const audioTrack = audioOutput.stream.getAudioTracks()[0];
        if (audioTrack) {
          if (!audioTrack._stop) {
            audioTrack._stop = audioTrack.stop;
            audioTrack.stop = function () {
              _debuglog('webaudio stop');
              keepSound = false;
              audioTrack._stop();
            };
          }
          stream.addTrack(audioTrack);
        }
        else {
          console.warn('WARN: WebAudio error, but skip');
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

  // ------- bodypix -------
  let _bodyPixNet = null;
  //let animationId = null;
  //let contineuAnimation = false;
  let _bodyPixMask = null;
  let _segmentTimerId = null;
  //let isConnected = false;
  let _maskType = 'room';

  async function _bodypix_loadModel() {
    const net = await bodyPix.load(/** optional arguments, see below **/);
    _bodyPixNet = net;
    _showMessage('bodyPix model loaded');
    _debuglog('bodyPix ready');
    //updateUI();
  }

  function _bodypix_setMask(type) {
    _maskType = type;
  }

  function _startBodyPixStream(withVideo, withAudio, constraints) {
    return new Promise((resolve, reject) => {
      let stream = null;

      if ((!withVideo) && (!withAudio)) {
        // Nothing
        reject('NO video/audio specified');
      }

      //reject('NOT SUPPORTED YET');

      //_debuglog('_startBodyPixStream() video:', video);
      navigator.mediaDevices._getUserMedia(constraints).
        then(async (stream) => {
          video.srcObject = stream;
          video.width = 640;
          video.height = 480;
          await video.play().catch(err => console.error('local play ERROR:', err));
          video.volume = 0.0;

          _clearCanvas();
          requestAnimationFrame(_updateCanvasWithMask);
          const canvasStream = canvas.captureStream(10);
          if (!canvasStream) {
            reject('canvas Capture ERROR');
          }
          keepAnimation = true;
          _bodypix_updateSegment();
          const videoTrack = canvasStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack._stop = videoTrack.stop;
            videoTrack.stop = function () {
              _debuglog('camvas stream stop');
              keepAnimation = false;
              videoTrack._stop();
              stream.getTracks().forEach(track => {
                track.stop();
              });
            };
          }

          resolve(canvasStream);
        })
        .catch(err => {
          console.error('media ERROR:', err);
          reject(err);
        });
    });
  }

  function _updateCanvasWithMask() {
    _drawCanvas(video);
    if (keepAnimation) {
      window.requestAnimationFrame(_updateCanvasWithMask);
    }
  }

  function _drawCanvas(srcElement) {
    const opacity = 1.0;
    const flipHorizontal = false;
    //const maskBlurAmount = 0;
    const maskBlurAmount = 3;

    // Draw the mask image on top of the original image onto a canvas.
    // The colored part image will be drawn semi-transparent, with an opacity of
    // 0.7, allowing for the original image to be visible under.
    bodyPix.drawMask(
      canvas, srcElement, _bodyPixMask, opacity, maskBlurAmount,
      flipHorizontal
    );
  }

  function _bodypix_updateSegment() {
    const segmeteUpdateTime = 10; // ms
    if (!_bodyPixNet) {
      console.warn('bodyPix net NOT READY');
      return;
    }

    const option = {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.7,
      maxDetections: 4,
      scoreThreshold: 0.5,
      nmsRadius: 20,
      minKeypointScore: 0.3,
      refineSteps: 10
    };

    if (_maskType === 'none') {
      _bodyPixMask = null;
      if (keepAnimation) {
        _segmentTimerId = setTimeout(_bodypix_updateSegment, segmeteUpdateTime);
      }
      return;
    }

    _bodyPixNet.segmentPerson(video, option)
      .then(segmentation => {
        if (_maskType === 'room') {
          const fgColor = { r: 0, g: 0, b: 0, a: 0 };
          const bgColor = { r: 127, g: 127, b: 127, a: 255 };
          const personPartImage = bodyPix.toMask(segmentation, fgColor, bgColor);
          _bodyPixMask = personPartImage;
        }
        else if (_maskType === 'person') {
          const fgColor = { r: 127, g: 127, b: 127, a: 255 };
          const bgColor = { r: 0, g: 0, b: 0, a: 0 };
          const roomPartImage = bodyPix.toMask(segmentation, fgColor, bgColor);
          _bodyPixMask = roomPartImage;
        }
        else {
          _bodyPixMask = null;
        }

        if (keepAnimation) {
          _segmentTimerId = setTimeout(_bodypix_updateSegment, segmeteUpdateTime);
        }
      })
      .catch(err => {
        console.error('segmentPerson ERROR:', err);
      })
  }

  // ------- bodypix -------


  // -----------------
  _debuglog('cs main()');
  const insertPoint = document.body;
  _insertPanel(insertPoint);
  _replaceGetUserMedia();

  // ------- bodypix -------
  //_bodypix_loadModel();
  setTimeout(_bodypix_loadModel, 1000); // wait until boxyPix ready;
}

main()
