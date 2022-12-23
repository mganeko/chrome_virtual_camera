// Chrome Virtual Camera Extension
//   mganeko https://github.com/mganeko/chrome_virtual_camera
//  MIT LICENSE


// TODO:
//   - DONE: stop Animation
//   - DONE: clear canvas at start
//   - DONE: setup canvas size
//   - DONE: dummy video with dummy audio
//   - DONE: dummy audio only
//   - DONE: debuglog
//   - DONE: bodypix background mask
//   - DONE: bodypix person mask
//   - DONE: select update when bodypix ready
//   - DONE: background image
//   - DONE: canvas&image size variable
//   - DONE: static switch jp/en
//   - DONE: dynamic switch ja/en (by navigator.language)

function main() {
  'use strict'
  //const PRINT_DEBUG_LOG = true;
  const PRINT_DEBUG_LOG = false;

  const LANG_TYPE = navigator.language; // en, en-US, ja
  _debuglog('lang=' + LANG_TYPE);

  if (navigator.mediaDevices._getUserMedia !== undefined) return;
  const video = document.createElement('video');
  const videoBackground = document.createElement('video');
  const canvas = document.createElement('canvas');
  const canvasFront = document.createElement('canvas');
  const img = document.createElement('img');
  //canvas.width = 1280;
  //canvas.height = 720;
  canvas.width = 640;
  canvas.height = 480;
  canvasFront.width = 640;
  canvasFront.height = 480;
  img.width = 640;
  img.height = 480;
  let keepAnimation = false;
  let keepSound = false;
  const canvasCtx = canvas.getContext('2d');
  let audioCtx = null;
  let audioOutput = null;
  let audioGain = null;


  // --- ファイル選択GUIを挿入 ---
  function _insertPanel(node) {
    try {
      const html_ja =
        `<div id="gum_panel" style="border: 1px solid blue; position: absolute; left:2px; top:2px;  z-index: 2001; background-color: rgba(192, 250, 192, 0.7);">
        <div><span id="gum_pannel_button">[+]</span><span id="gum_position_button">[_]</span></div>
        <table id="gum_control" style="display: none;">
          <tr>
            <td colspan="4">Chrome Virtual Camera extension</td>
          </tr>
          <tr>
            <td><label for="video_type">種類</label></td>
            <td>
              <select id="video_type" title="Google Meetではいったんカメラをオフ→オンしてください">
                <option value="camera" selected="1">デバイス</option>
                <option value="file">ファイル</option>
                <option value="clock">時計</option>
                <option value="screen">画面キャプチャー</option>
              </select>
            </td>
            <td colspan="2"><span id="message_span">message</span></td>
          </tr>
          <tr>
            <td><label for="image_file">背景</label></td>
            <td><input type="file" accept="image/*" id="image_file"></td>
            <td><label for="video_file">動画</label></td>
            <td><input type="file" accept="video/mp4,video/webm" id="video_file"></td>
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
      const html_en =
        `<div id="gum_panel" style="border: 1px solid blue; position: absolute; left:2px; top:2px;  z-index: 2001; background-color: rgba(192, 250, 192, 0.7);">
        <div><span id="gum_pannel_button">[+]</span><span id="gum_position_button">[_]</span></div>
        <table id="gum_control" style="display: none;">
          <tr>
           <td colspan="4">Chrome Virtual Camera extension</td>
          </tr>
          <tr>
            <td><label for="video_type">type</label></td>
            <td>
              <select id="video_type" title="Please Off --> On your camera, for Google Meet">
                <option value="camera" selected="1">device</option>
                <option value="file">video file</option>
                <option value="clock">clock</option>
                <option value="screen">screen capture</option>
              </select>
            </td>
            <td colspan="2"><span id="message_span">message</span></td>
          </tr>
          <tr>
            <td><label for="image_file">background image</label></td>
            <td><input type="file" accept="image/*" id="image_file"></td>
            <td><label for="video_file">video file</label></td>
            <td><input type="file" accept="video/mp4,video/webm" id="video_file"></td>
          </tr>
          <!--
          <tr>
            <td><label for="afile">audio file</label></td>
            <td><input type="file" accept="audio/mpeg" id="afile"></td>
            <td><span id="message2_span"><span></td>
          </tr>
          -->
        </table>
        </div>`;

      if (LANG_TYPE == 'ja') {
        const element = document.createElement('div');
        element.setHTML(html_ja);
        node.appendChild(element);        
      }
      else {
        const element = document.createElement('div');
        element.setHTML(html_ja);
        node.appendChild(element);
      }

      node.querySelector('#video_file').addEventListener('change', (evt) => {
        _startVideoPlay();
      }, false);

      node.querySelector('#image_file').addEventListener('change', (evt) => {
        _loadImage();
      }, false);

      node.querySelector('#gum_pannel_button').addEventListener('click', (evt) => {
        _debuglog('pannel open/close');
        _openClosePanel();
      }, false);

      node.querySelector('#gum_position_button').addEventListener('click', (evt) => {
        _debuglog('pannel top/bottom');
        _changePanelPositon();
      }, false)
    } catch (e) {
      console.error('_insertPanel() ERROR:', e);
    }
  }

  let panelVisible = false;
  let panelPositionTop = true;
  function _openClosePanel() {
    panelVisible = (!panelVisible);
    if (panelVisible) {
      document.getElementById('gum_control').style.display = 'block';
      document.getElementById('gum_pannel_button').innerText = '[-]';
    }
    else {
      document.getElementById('gum_control').style.display = 'none';
      document.getElementById('gum_pannel_button').innerText = '[+]';
    }
  }

  function _changePanelPositon() {
    panelPositionTop = (!panelPositionTop);
    const pannelDiv = document.getElementById('gum_panel');
    if (panelPositionTop) {
      pannelDiv.style.top = '2px';
      pannelDiv.style.bottom = '';
      document.getElementById('gum_position_button').innerText = '[_]';
    }
    else {
      pannelDiv.style.top = '';
      pannelDiv.style.bottom = '2px';
      document.getElementById('gum_position_button').innerText = '[^]';
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
      span.innerText = str;
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

  function _loadImage() {
    const imageFile = document.getElementById('image_file');
    const file = (imageFile.files && imageFile.files.length) ? imageFile.files[0] : null;
    if (file && file.type.startsWith('image/')) {
      _debuglog('load image:', file.name);
      _showMessage('load image');
      const url = window.URL.createObjectURL(file);
      img.src = url;

      _setVideoType('mask_image');
    }
  }

  function _updateCanvas() {
    const currentTime = new Date();
    const strTime = _2digit(currentTime.getHours()) + ':' + _2digit(currentTime.getMinutes()) + ':' + _2digit(currentTime.getSeconds());

    const fontHeight = Math.min(parseInt(canvas.height / 5), 120);
    const textTop = parseInt(canvas.height / 5) * 2;
    const textLeft = parseInt(canvas.width / 10);
    canvasCtx.font = fontHeight + 'px serif'; //'128px serif';

    canvasCtx.fillStyle = 'rgb(255,255,255)';
    //canvasCtx.fillStyle = 'rgb(240,240,240)';
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
    _debuglog('GUM constraints:', constraints);

    // --- video constraints ---
    const withVideo = !(!constraints.video);
    if (constraints.video) {
      _setupCanvasSize(constraints);
    }

    // --- audio constraints ---
    const withAudio = !(!constraints.audio);

    // --- bypass for desktop capture ---
    if (constraints?.video?.mandatory?.chromeMediaSource === 'desktop') {
      _debuglog('GUM start Desktop Capture');
      _showMessage('use device for Desktop Catpure');
      return navigator.mediaDevices._getUserMedia(constraints);
    }

    // --- start media ---
    if (select?.value === 'file') {
      _showMessage('use video file');
      return _startVideoFileStream(withVideo, withAudio);
    }
    else if (select?.value === 'clock') {
      _showMessage('use canvas for clock');
      return _startCanvasStream(withVideo, withAudio);
    }
    else if (select?.value === 'mask_background') {
      _showMessage('use bodypix');
      _bodypix_setMask('room');
      return _startBodyPixStream(withVideo, withAudio, constraints);
    }
    else if (select?.value === 'mask_person') {
      _showMessage('use bodypix (person)');
      _bodypix_setMask('person');
      return _startBodyPixStream(withVideo, withAudio, constraints);
    }
    else if (select?.value === 'mask_image') {
      _showMessage('use bodypix (mask image)');
      _bodypix_setMask('back_image');
      return _startBodyPixStream(withVideo, withAudio, constraints);
    }
    else if (select?.value === 'mask_display') {
      _showMessage('use bodypix (overlay display)');
      _bodypix_setMask('overlay_display');
      return _startDisplayOverlayStream(withVideo, withAudio, constraints);
    }
    else if (select?.value === 'screen') {
      _showMessage('use screen capture (displayMedia)');
      return _startScreenStream(withVideo, withAudio, constraints);
    }
    else {
      _showMessage('use device');
      return navigator.mediaDevices._getUserMedia(constraints);
    }
  }

  function _setupCanvasSize(constraints) {
    if (constraints.video?.advanced) {
      constraints.video?.advanced.forEach(item => {
        if (item.width?.min) {
          canvas.width = item.width.min;
        }
        if (item.height?.min) {
          canvas.height = item.height.min;
        }
      });
      //canvas.width = 1280;
      //canvas.height = 720;
      canvasFront.width = canvas.width;
      canvasFront.height = canvas.height;
      video.width = canvas.width;
      video.height = canvas.height;

      _debuglog('advanced canvas width,height=', canvas.width, canvas.height, video.width, video.height);

      return;
    }

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

    canvasFront.width = canvas.width;
    canvasFront.height = canvas.height;
    video.width = canvas.width;
    video.height = canvas.height;

    _debuglog('canvas width,height=', canvas.width, canvas.height, video.width, video.height);
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

  function _startScreenStream(withVideo, withAudio, constraints) {
    return new Promise((resolve, reject) => {
      let stream = null;

      if ((!withVideo) && (!withAudio)) {
        // Nothing
        reject('NO video/audio specified');
      }

      if (withVideo) {
        navigator.mediaDevices.getDisplayMedia({ video: true })
          .then(displayStream => {
            _debuglog('get DisplayStream');
            stream = displayStream;

            if (withAudio) {
              constraints.video = false;
              navigator.mediaDevices._getUserMedia(constraints).
                then(audioStream => {
                  const audioTrack = audioStream.getAudioTracks()[0];
                  stream.addTrack(audioTrack);
                })
                .catch(err => {
                  _debuglog('_startScreenStream() audio ERROR:', err);
                  if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                  }
                  reject(err);
                });
            }

            resolve(stream);
          })
          .catch(err => {
            _debuglog('_startScreenStream() media ERROR:', err);
            recject(err)
          });
      }
      else if (withAudio) { // --- audio only ---
        navigator.mediaDevices._getUserMedia(constraints).
          then(audioStream => {
            resolve(audioStream);
          })
          .catch(err => {
            reject(err);
          });
      }
    });
  }

  function _startDisplayOverlayStream(withVideo, withAudio, constraints) {
    // TODO
    // - start
    //   - DONE: カメラデバイスの映像を取得 --> streamDevice, videoに表示
    //   - DONE: 画面キャブチャー --> streamScreen, videoBackgroundに表示
    //   - DONE: cavas.captureStream() --> stream
    //   - DONE: streamDeviceのAudioTrack --> stream.addTrack()
    // - draw
    //   - DONE: updateSegment (video)
    //   - DONE: videoBackround --> cavas (ctx.drawImage)
    //   - DONE: video --> canvas (setPixel)
    //   - ※サイズ調整は？
    //     - screen > camera, screen < camera
    //     - position (left-top, right-top, left-bottom, right-bottom)
    // - stop
    //   - DONE: stream-videoTrack-stop() --> streamDevice-videoTrack-stop() & streamScreen.videoTrack.stop()
    //       & video.pause(), videoBackground.pause(), animation=false
    // - BUG
    //   - STACK OVERFLOW after using while (windows10)

    _bodyPixMask = null;
    _backPixMask = null;

    return new Promise((resolve, reject) => {
      //let stream = null;

      if (!withVideo) {
        // NEED video
        reject('NEED video for Boxypix mask');
      }

      // --- withVideo ---
      navigator.mediaDevices._getUserMedia(constraints).
        then(async (deviceStream) => {
          _debuglog('got device stream');

          // --- device stream and videoPix
          video.srcObject = deviceStream;
          video.onloadedmetadata = () => {
            _debuglog('loadedmetadata videoWidht,videoHeight', video.videoWidth, video.videoHeight);
            video.width = video.videoWidth;
            video.height = video.videoHeight;
            img.width = video.width;
            img.height = video.height;
            //canvas.width = video.width;
            //canvas.height = video.height;
          }
          await video.play().catch(err => console.error('local play ERROR:', err));
          video.volume = 0.0;

          // ---- screen stream ---
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true }).catch(err => {
            video.pause();
            deviceStream.getTracks().forEach(track => track.stop());
            reject('display Capture ERROR');
          });
          _debuglog('got display stream');
          videoBackground.srcObject = displayStream;
          videoBackground.onloadedmetadata = () => {
            _debuglog('videoBackground loadedmetadata videoWidht,videoHeight', videoBackground.videoWidth, videoBackground.videoHeight);
            videoBackground.width = videoBackground.videoWidth;
            videoBackground.height = videoBackground.videoHeight;
            //img.width = video.width;
            //img.height = video.height;
            canvas.width = videoBackground.width;
            canvas.height = videoBackground.height;
          }
          await videoBackground.play().catch(err => console.error('videoBackground play ERROR:', err));
          videoBackground.volume = 0.0;

          // ----- canvas stream ----
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
              _debuglog('stop device track');
              deviceStream.getTracks().forEach(track => {
                track.stop();
              });
              _debuglog('stop display track');
              displayStream.getTracks().forEach(track => {
                track.stop();
              });
            };
          }

          // --- for audio ---
          if (withAudio) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              canvasStream.addTrack(audioTrack);
            }
            else {
              _debuglog('WARN: NO audio in device stream');
            }
          }

          resolve(canvasStream);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // ------- bodypix -------
  let _bodyPixNet = null;
  //let animationId = null;
  //let contineuAnimation = false;
  let _bodyPixMask = null;
  let _segmentTimerId = null;
  //let isConnected = false;
  let _maskType = 'room';
  let _backPixMask = null;
  let _segmentation = null;

  async function _bodypix_loadModel() {
    _showMessage('loading bodyPix model...');
    const net = await bodyPix.load(/** optional arguments, see below **/);
    _bodyPixNet = net;
    _showMessage('bodyPix model loaded');
    _debuglog('bodyPix ready');

    _insertBoxypixOptions();
  }


  // <option value="mask_background">背景を塗りつぶし</option>
  // <option value="mask_image">背景を画像でマスク</option>
  // <option value="mask_person">人物を塗りつぶし</option>
  function _insertBoxypixOptions() {
    const select = document.getElementById('video_type');
    const option1 = document.createElement('option');
    option1.value = 'mask_background';
    select.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = 'mask_image';
    select.appendChild(option2);

    const option3 = document.createElement('option');
    option3.value = 'mask_person';
    select.appendChild(option3);

    // display overlay
    const option4 = document.createElement('option');
    option4.value = 'mask_display';
    select.appendChild(option4);

    if (LANG_TYPE === 'ja') {
      option1.innerText = '背景を塗りつぶし';
      option2.innerText = '背景を画像でマスク';
      option3.innerText = '人物を塗りつぶし';
      option4.innerText = '画面に人物を合成';
    }
    else {
      option1.innerText = 'mask backgroud with gray';
      option2.innerText = 'mask backgroud with image';
      option3.innerText = 'mask peson with gray';
      option3.innerText = 'overlay peson on display';
    }

    // -- force select ---
    //select.value = 'mask_display';
  }

  function _bodypix_setMask(type) {
    _maskType = type;
  }

  function _startBodyPixStream(withVideo, withAudio, constraints) {
    _bodyPixMask = null;
    _backPixMask = null;

    return new Promise((resolve, reject) => {
      if (!withVideo) {
        // NEED video
        reject('NEED video for Boxypix mask');
      }

      navigator.mediaDevices._getUserMedia(constraints).
        then(async (stream) => {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            _debuglog('loadedmetadata videoWidht,videoHeight', video.videoWidth, video.videoHeight);
            video.width = video.videoWidth;
            video.height = video.videoHeight;
            img.width = video.width;
            img.height = video.height;
            canvas.width = video.width;
            canvas.height = video.height;
          }
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

          // --- for audio ---
          if (withAudio) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              canvasStream.addTrack(audioTrack);
            }
            else {
              _debuglog('WARN: NO audio in device stream');
            }
          }

          resolve(canvasStream);
        })
        .catch(err => {
          _debuglog('_startBodyPixStream() media ERROR:', err);
          reject(err);
        });
    });
  }

  function _updateCanvasWithMask() {
    try {
      if (_maskType === 'back_image') {
        _drawFrontBackToCanvas(canvas, _segmentation, video, img) // canvas, segmentation, front, back
      }
      else if (_maskType === 'overlay_display') {
        _drawDisplayOverlayToCanvas(canvas, _segmentation, video, videoBackground) // canvas, segmentation, front, back
      }
      else {
        _drawCanvas(video);
      }
    }
    catch (err) {
      _debuglog('bodypix draw ERR:', err);
    }

    if (keepAnimation) {
      window.requestAnimationFrame(_updateCanvasWithMask);
    }
  }

  function _drawCanvas(srcElement) {
    const opacity = 1.0;
    const flipHorizontal = false;
    const maskBlurAmount = 0;
    //const maskBlurAmount = 3;

    // Draw the mask image on top of the original image onto a canvas.
    // The colored part image will be drawn semi-transparent, with an opacity of
    // 0.7, allowing for the original image to be visible under.
    bodyPix.drawMask(
      canvas, srcElement, _bodyPixMask, opacity, maskBlurAmount,
      flipHorizontal
    );
  }

  function _drawFrontBackToCanvas(canvas, segmentation, frontElement, backElement) {
    if (!segmentation) {
      return;
    }

    const ctx = canvasCtx; //canvas.getContext("2d");
    //canvas.width = img.width;
    //canvas.height = img.height;
    const width = canvas.width;
    const height = canvas.height;
    ctx.drawImage(frontElement, 0, 0);
    const front_img = ctx.getImageData(0, 0, width, height);
    //ctx.drawImage(backElement, 0, 0); // clop
    if (backElement.complete) { // asume as imageElement
      const srcWidth = backElement.naturalWidth ? backElement.naturalWidth : backElement.width;
      const srcHeight = backElement.naturalHeight ? backElement.naturalHeight : backElement.height;
      ctx.drawImage(backElement, 0, 0, srcWidth, srcHeight,
        0, 0, width, height
      ); // rezise src --> dest
    }
    else {
      ctx.fillRect(0, 0, width, height);
    }


    //const bg_img = ctx.getImageData(0, 0, width, height);

    let imageData = ctx.getImageData(0, 0, width, height);
    let pixels = imageData.data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let base = (y * width + x) * 4;
        let segbase = y * width + x;
        if (segmentation.data[segbase] == 1) { // is fg
          // --- 前景 ---
          pixels[base + 0] = front_img.data[base + 0];
          pixels[base + 1] = front_img.data[base + 1];
          pixels[base + 2] = front_img.data[base + 2];
          pixels[base + 3] = front_img.data[base + 3];

          //// --- 背景と前景半透明 ---
          // pixels[base + 0] = _mix(pixels[base + 0], front_img.data[base + 0]);
          // pixels[base + 1] = _mix(pixels[base + 1], front_img.data[base + 1]);
          // pixels[base + 2] = _mix(pixels[base + 2], front_img.data[base + 2]);
          // pixels[base + 3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // function _mix(a, b) {
    //   return (a + b) / 2;
    // }
  }

  function _drawDisplayOverlayToCanvas(canvas, segmentation, frontElement, backElement) {
    if (!segmentation) {
      return;
    }
    const frontWidth = frontElement.videoWidth;
    const frontHeight = frontElement.videoHeight;

    const ctx = canvasCtx; //canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.drawImage(frontElement, 0, 0);
    const front_img = ctx.getImageData(0, 0, frontWidth, frontHeight); // WARN: if canvas is too small, front_image is cropped
    //return; front draw OK, but not size adjusted

    if (backElement.readyState > 0) {
      const srcWidth = backElement.videoWidth ? backElement.videoWidth : backElement.width;
      const srcHeight = backElement.videolHeight ? backElement.videolHeight : backElement.height;
      ctx.drawImage(backElement, 0, 0, srcWidth, srcHeight,
        0, 0, width, height
      ); // rezise src --> dest
    }
    else {
      ctx.fillRect(0, 0, width, height);
    }
    //return; // back draw OK
    if ((frontWidth === 0) || (frontHeight === 0)) {
      return;
    }

    let imageData = ctx.getImageData(0, 0, width, height);
    let pixels = imageData.data;

    // -- front scale ---
    const ratio = 0.5; //0.25;
    const backWidth = width;

    //const scale = 1; // OK
    //const scale = 0.5; // OK
    //const scale = 0.4; // OK
    //const scale = 0.56; // OK

    //ratio = (frontWidth * scale) / backWidth;
    const scale = ratio * backWidth / frontWidth; // NG
    //_debuglog('scale=' + scale);

    const scaledFrontWidth = Math.floor(frontWidth * scale);
    const scaledFrontHeight = Math.floor(frontHeight * scale);

    // --- front positon: left-top --
    //const frontOffsetX = 0;
    //const frontOffsetY = 0;
    // --- front positon: right-top --
    //const offsetX = (width - frontWidth);
    //const offsetY = 0;
    // --- front positon: right-bottom --
    //const offsetX = (width - frontWidth);
    //const offsetY = (height - frontHeight);
    // --- front positon: right-bottom, if possible --
    //const offsetX = (width > frontWidth) ? (width - frontWidth) : 0;
    //const offsetY = (height > frontHeight) ? (height - frontHeight) : 0;

    // --- front positon: right-bottom, scaled --
    const offsetX = (width > scaledFrontWidth) ? (width - scaledFrontWidth) : 0;
    const offsetY = (height > scaledFrontHeight) ? (height - scaledFrontHeight) : 0;

    //const loopWidth = Math.min(frontWidth, width);
    //const loopHeight = Math.min(frontHeight, height);
    const loopWidth = Math.min(scaledFrontWidth, width);
    const loopHeight = Math.min(scaledFrontHeight, height);
    for (let y = 0; y < loopHeight; y++) {
      for (let x = 0; x < loopWidth; x++) {
        const backBase = ((y + offsetY) * width + x + offsetX) * 4;
        //const frontBase = (y * frontWidth + x) * 4;
        //let segbase = y * frontWidth + x;
        //const segbase = Math.floor((y / scale) * frontWidth + (x / scale)); // NG
        const segbase = Math.floor(y / scale) * frontWidth + Math.floor(x / scale); //OK
        if (segbase >= segmentation.data.length) {
          _debuglog('sagebase:%d >= segmatation size:%d', segbase, segmentation.data.length);
          break;
        }
        const frontBase = segbase * 4;

        if (segmentation.data[segbase] == 1) { // is fg
          // --- 前景 ---
          /*--- 100% front 
          pixels[backBase + 0] = front_img.data[frontBase + 0];
          pixels[backBase + 1] = front_img.data[frontBase + 1];
          pixels[backBase + 2] = front_img.data[frontBase + 2];
          pixels[backBase + 3] = front_img.data[frontBase + 3];
          ---*/

          //*--- mix
          pixels[backBase + 0] = _mix(pixels[backBase + 0], front_img.data[frontBase + 0], 0.9);
          pixels[backBase + 1] = _mix(pixels[backBase + 1], front_img.data[frontBase + 1], 0.9);
          pixels[backBase + 2] = _mix(pixels[backBase + 2], front_img.data[frontBase + 2], 0.9);
          pixels[backBase + 3] = _mix(pixels[backBase + 3], front_img.data[frontBase + 3], 0.9);
          //---*/

          /*--
          // --black mask ok ----
          pixels[backBase + 0] = 0;
          pixels[backBase + 1] = 0;
          pixels[backBase + 2] = 0;
          pixels[backBase + 3] = 255;
          ---*/
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    function _mix(a, b, rate) {
      return Math.floor(a * (1 - rate) + b * rate);
    }
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
      segmentationThreshold: 0.7, //0.9, //0.7,
      maxDetections: 4,
      scoreThreshold: 0.5,
      nmsRadius: 20,
      minKeypointScore: 0.3,
      refineSteps: 10
    };

    if (_maskType === 'none') {
      _bodyPixMask = null;
      _backPixMask = null;
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
          _backPixMask = null;
        }
        else if (_maskType === 'person') {
          const fgColor = { r: 127, g: 127, b: 127, a: 255 };
          const bgColor = { r: 0, g: 0, b: 0, a: 0 };
          const roomPartImage = bodyPix.toMask(segmentation, fgColor, bgColor);
          _bodyPixMask = roomPartImage;
          _backPixMask = null;
        }
        else if (_maskType === 'back_image') {
          _segmentation = segmentation;
        }
        else if (_maskType === 'overlay_display') {
          _segmentation = segmentation;
        }
        else {
          _bodyPixMask = null;
          _backPixMask = null;
          _segmentation = null;
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
