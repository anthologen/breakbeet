import "regenerator-runtime/runtime";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import noUiSlider from "nouislider";
import "nouislider/distribute/nouislider.css";
import wNumb from "wnumb";
import StartAudioContext from "startaudiocontext";

var scene = new THREE.Scene();
scene.background = new THREE.Color(
  document.getElementById("backgroundColor").value
);
var camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById("viewport").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

window.addEventListener("resize", function() {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

document.getElementById("backgroundColor").addEventListener("input", function(event) {
  scene.background = new THREE.Color(event.target.value);
});

function LightSelection() {
  let lightColor = document.getElementById("lightColor").value;
  let lightIntensity = document.getElementById("lightIntensity").value;

  var ambientLight = new THREE.AmbientLight(lightColor, lightIntensity);
  scene.add(ambientLight);

  var pointLight = new THREE.PointLight (lightColor, lightIntensity);
  pointLight.position.set(
    document.getElementById("pointLightXPos").value,
    document.getElementById("pointLightYPos").value,
    document.getElementById("pointLightZPos").value
  );
  scene.add(pointLight);

  var hemisphereLight = new THREE.HemisphereLight(
    document.getElementById("skyColor").value,
    document.getElementById("groundColor").value,
    document.getElementById("atmosphereIntensity").value
  );
  var sunLight = new THREE.DirectionalLight(lightColor, lightIntensity);
  var sunLightTarget = new THREE.Object3D();
  sunLight.position.set(
    document.getElementById("sunLightXPos").value,
    document.getElementById("sunLightYPos").value,
    document.getElementById("sunLightZPos").value
  );
  sunLightTarget.position.set(
    document.getElementById("sunLightTargetXPos").value,
    document.getElementById("sunLightTargetYPos").value,
    document.getElementById("sunLightTargetZPos").value
  );
  sunLight.target = sunLightTarget;
  scene.add(hemisphereLight);
  scene.add(sunLight);
  scene.add(sunLightTarget);

  var lightList = [
    ambientLight,
    pointLight,
    hemisphereLight,
    sunLight
  ];

  document.getElementById("lightColor").addEventListener("input", function(event) {
    let newColor = new THREE.Color(event.target.value);
    ambientLight.color = newColor;
    pointLight.color = newColor;
    sunLight.color = newColor;
  });

  document.getElementById("lightIntensity").addEventListener("input", function(event) {
    let newIntensity = event.target.valueAsNumber || 0;
    ambientLight.intensity = newIntensity;
    pointLight.intensity = newIntensity;
    sunLight.intensity = newIntensity;
  });

  document.getElementById("pointLightXPos").addEventListener("input", function(event) {
    pointLight.position.x = event.target.valueAsNumber || 0;
  });
  document.getElementById("pointLightYPos").addEventListener("input", function(event) {
    pointLight.position.y = event.target.valueAsNumber || 0;
  });
  document.getElementById("pointLightZPos").addEventListener("input", function(event) {
    pointLight.position.z = event.target.valueAsNumber || 0;
  });

  document.getElementById("skyColor").addEventListener("input", function(event) {
    hemisphereLight.color = new THREE.Color(event.target.value);
  });
  document.getElementById("groundColor").addEventListener("input", function(event) {
    hemisphereLight.groundColor = new THREE.Color(event.target.value);
  });
  document.getElementById("atmosphereIntensity").addEventListener("input", function(event) {
    hemisphereLight.intensity = event.target.valueAsNumber || 0;
  });

  document.getElementById("sunLightXPos").addEventListener("input", function(event) {
    sunLight.position.x = event.target.valueAsNumber || 0;
  });
  document.getElementById("sunLightYPos").addEventListener("input", function(event) {
    sunLight.position.y = event.target.valueAsNumber || 0;
  });
  document.getElementById("sunLightZPos").addEventListener("input", function(event) {
    sunLight.position.z = event.target.valueAsNumber || 0;
  });

  document.getElementById("sunLightTargetXPos").addEventListener("input", function(event) {
    sunLightTarget.position.x = event.target.valueAsNumber || 0;
  });
  document.getElementById("sunLightTargetYPos").addEventListener("input", function(event) {
    sunLightTarget.position.y = event.target.valueAsNumber || 0;
  });
  document.getElementById("sunLightTargetZPos").addEventListener("input", function(event) {
    sunLightTarget.position.z = event.target.valueAsNumber || 0;
  });

  function chooseLight(lightType) {
    // Hide all additional options
    let extraLightSettings = document.querySelectorAll(".lightControl");
    extraLightSettings.forEach((setting) => setting.classList.add("removed"));
    function showAdditionalSetting(lType) {
      document.getElementById(`${lType}LightControl`).classList.remove("removed");
    }
    lightList.forEach(function(l) {l.visible = false;});
    switch (lightType) {
      case "ambient":
        showAdditionalSetting(lightType);
        ambientLight.visible = true;
        break;
      case "point":
        showAdditionalSetting(lightType);
        pointLight.visible = true;
        break;
      case "outdoor":
        showAdditionalSetting(lightType);
        hemisphereLight.visible = true;
        sunLight.visible = true;
        break;
      default:
        console.error(`Invalid lightType ${lightType}.`);
    }

  }
  var lightRadios = document.querySelectorAll("input[type=radio][name=lightType]");
  lightRadios.forEach((radio) => radio.addEventListener("change", () => chooseLight(radio.value)));

  return Object.freeze({
    chooseLight
  });
}
var lightSelection = new LightSelection();
lightSelection.chooseLight("ambient");

document.getElementById("audioInputFile").onchange = function(event) {
  const uploadedFile = event.target.files[0];
  console.debug(uploadedFile);
  const fileUrl = URL.createObjectURL(uploadedFile);
  document.getElementById("audioElement").src = fileUrl;
};

function AudioProcessor() {
  let audioElement = document.getElementById("audioElement");
  let AudioContext = window.AudioContext || window.webkitAudioContext || false;
  if (AudioContext) {
    var audioContext = new AudioContext();
  } else {
    alert("The Web Audio API is not supported by your browser.");
  }
  StartAudioContext(audioContext);
  let audioMediaSrc = audioContext.createMediaElementSource(audioElement);
  let audioAnalyzer = audioContext.createAnalyser();
  audioMediaSrc.connect(audioAnalyzer);
  audioAnalyzer.connect(audioContext.destination);
  audioAnalyzer.fftSize = 2048;

  let linearFftArray = new Uint8Array(audioAnalyzer.frequencyBinCount);
  const {createAudioBars, updateAudioBars} = require("audio-frequency-tempered");
  let logFftArray = createAudioBars({ groupLevel: 2 });

  window.addEventListener("keydown", function(event) {
    switch (event.keyCode) {
      case 80: // P key
        audioContext.resume();
        audioElement.paused ? audioElement.play() : audioElement.pause();
        break;
    }
  });

  let isRecording = false;
  let micStreamSrc;
  function attachMic() {
    // detach media source
    audioElement.pause();
    audioElement.classList.remove("show");
    audioElement.classList.add("hide");
    audioMediaSrc.disconnect(audioAnalyzer);
    audioAnalyzer.disconnect(audioContext.destination);
    // attach mic
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream) {
      if (isRecording) {
        micStreamSrc = audioContext.createMediaStreamSource(stream);
        micStreamSrc.connect(audioAnalyzer);
      }
    }, function(err) {
      console.error(err);
    });
  }

  function detachMic() {
    // detach mic
    if (micStreamSrc) {
      micStreamSrc.disconnect(audioAnalyzer);
      micStreamSrc = null;
    }
    // re-attach media source
    audioElement.classList.remove("hide");
    audioElement.classList.add("show");
    audioMediaSrc.connect(audioAnalyzer);
    audioAnalyzer.connect(audioContext.destination);
  }

  let micButton = document.getElementById("micButton");
  micButton.onclick = function() {
    if (isRecording) {
      isRecording = false;
      detachMic();
      micButton.classList.remove("micIsRecording");
    } else {
      isRecording = true;
      attachMic();
      micButton.classList.add("micIsRecording");
    }
  };

  function getLogFftArray() {
    audioAnalyzer.getByteFrequencyData(linearFftArray);
    updateAudioBars(linearFftArray); // updates logFftArray
    return logFftArray.map((x) => x["value"]);
  }

  function getNumFreqBins() {
    return logFftArray.length;
  }

  return Object.freeze({
    getLogFftArray,
    getNumFreqBins
  });
}
var audioProcessor = new AudioProcessor();

function FreqRangeSelector() {
  const MIN_FREQUENCY = 20;
  const MAX_FREQUENCY = 22000;
  const MID_START_FREQUENCY = 440;
  const tooltipConfig = wNumb({suffix: " Hz", thousand: ",", decimals: 0});
  const tooltipConfigList = [tooltipConfig, tooltipConfig]; // for both handles

  function makeSliderLogRangeConfig() {
    // Solve A and k in y = A*e^(kx) with points (0, 20) and (100, 22000)
    const centLogA = MIN_FREQUENCY;
    const centLogK = Math.log(MAX_FREQUENCY/MIN_FREQUENCY) / 100;
    let logRangeDict = {};
    for (let i = 0; i <= 100; i++)
    {
      logRangeDict[i + "%"] = centLogA * Math.exp(centLogK * i);
    }
    logRangeDict["min"] = MIN_FREQUENCY;
    delete logRangeDict["0%"];
    logRangeDict["max"] = MAX_FREQUENCY;
    delete logRangeDict["100%"];
    return logRangeDict;
  }
  const sliderLogRangeConfig = makeSliderLogRangeConfig();

  const pipConfig = {
    mode: "values",
    values: [20, 200, 2000, 22000],
    density: 8
  };

  // Solve A and k in y = A*e^(kx) with points (0, 20) and (numFreqBins-1, 22000)
  const binLogA = MIN_FREQUENCY;
  const binLogK = (Math.log(MAX_FREQUENCY/MIN_FREQUENCY)
                    / (audioProcessor.getNumFreqBins() - 1));
  function freqToBinIdx(inFreq) {
    return Math.round(Math.log(inFreq / binLogA) / binLogK);
  }

  let hLowerBinIdx = freqToBinIdx(MIN_FREQUENCY);
  let hUpperBinIdx = freqToBinIdx(MID_START_FREQUENCY);
  let hFreqSlider = document.getElementById("sliderHFreqs");
  noUiSlider.create(hFreqSlider, {
      start: [MIN_FREQUENCY, MID_START_FREQUENCY],
      connect: true,
      tooltips: tooltipConfigList,
      range: sliderLogRangeConfig,
      pips: pipConfig
  });
  hFreqSlider.noUiSlider.on("update", (sliderVals) => {
    hLowerBinIdx = freqToBinIdx(sliderVals[0]);
    hUpperBinIdx = freqToBinIdx(sliderVals[1]);
  });
  var hConnects = hFreqSlider.querySelectorAll(".noUi-connect");
  hConnects[0].classList.add("hSliderConnect");

  let vLowerBinIdx = freqToBinIdx(MID_START_FREQUENCY);
  let vUpperBinIdx = freqToBinIdx(MAX_FREQUENCY);
  let vFreqSlider = document.getElementById("sliderVFreqs");
  noUiSlider.create(vFreqSlider, {
      start: [MID_START_FREQUENCY, MAX_FREQUENCY],
      connect: true,
      tooltips: tooltipConfigList,
      range: sliderLogRangeConfig,
      pips: pipConfig
  });
  vFreqSlider.noUiSlider.on("update", (sliderVals) => {
    vLowerBinIdx = freqToBinIdx(sliderVals[0]);
    vUpperBinIdx = freqToBinIdx(sliderVals[1]);
  });
  var vConnects = vFreqSlider.querySelectorAll(".noUi-connect");
  vConnects[0].classList.add("vSliderConnect");

  return Object.freeze({
    getHLoBinIdx: () => hLowerBinIdx,
    getHHiBinIdx: () => hUpperBinIdx,
    getVLoBinIdx: () => vLowerBinIdx,
    getVHiBinIdx: () => vUpperBinIdx,
  });

}
var freqRanges = new FreqRangeSelector();

function ModelAudioScaler() {
  var hScaleFactor = 1;
  document.getElementById("modelHScaleFactor").addEventListener("input", function(event) {
    hScaleFactor = event.target.valueAsNumber || 0;
  });

  var vScaleFactor = 1;
  document.getElementById("modelVScaleFactor").addEventListener("input", function(event) {
    vScaleFactor = event.target.valueAsNumber || 0;
  });

  function avg(arr) {
    if (arr.length === 0) { return 0; }
    return arr.reduce((a, b) => a + b) / arr.length;
  }

  function fftArrToScaleVec(fftArr) {
    let hSubArray = fftArr.slice(freqRanges.getHLoBinIdx(),
                                 freqRanges.getHHiBinIdx());
    let vSubArray = fftArr.slice(freqRanges.getVLoBinIdx(),
                                 freqRanges.getVHiBinIdx());
    let hFreqFactor = avg(hSubArray) * hScaleFactor;
    let vFreqFactor = avg(vSubArray) * vScaleFactor;
    return new THREE.Vector3(1 + hFreqFactor, 1 + vFreqFactor, 1 + hFreqFactor);
  }

  return Object.freeze({
    fftArrToScaleVec
  });
}
var modelAudioScaler = new ModelAudioScaler();

function AudioSpectrum() {
  let canvas = document.getElementById("audioSpectrumCanvas");
  let canvasCtx = canvas.getContext("2d");

  function drawSpectrum(fftArr) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    let barWidth = canvas.width / fftArr.length;
    let hLo = freqRanges.getHLoBinIdx();
    let hHi = freqRanges.getHHiBinIdx();
    let vLo = freqRanges.getVLoBinIdx();
    let vHi = freqRanges.getVHiBinIdx();
    for(let i = 0; i < fftArr.length; i++) {
      let barHeight = fftArr[i] * canvas.height;
      let r = 0, g = 0, b = 0;
      if (hLo <= i && i < hHi) { // h is red
        r += 192;
      }
      if (vLo <= i && i < vHi) { // v is blue
        g += 63;
        b += 255;
      }
      canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      canvasCtx.fillRect(i * barWidth, canvas.height - barHeight,
                         barWidth, barHeight);
    }
  }

  return Object.freeze({
    drawSpectrum
  });
}
var audioSpectrum = new AudioSpectrum();

var x_rot_rpm = 0;
document.getElementById("modelInputXRot").addEventListener("input", function(event) {
  x_rot_rpm = event.target.valueAsNumber || 0;
});

var y_rot_rpm = 2;
document.getElementById("modelInputYRot").addEventListener("input", function(event) {
  y_rot_rpm = event.target.valueAsNumber || 0;
});

var z_rot_rpm = 0;
document.getElementById("modelInputZRot").addEventListener("input", function(event) {
  z_rot_rpm = event.target.valueAsNumber || 0;
});

function main(inputModelUrl) {
  const loader = new GLTFLoader();
  function loadModel(url) {
    return new Promise((resolve, reject) => {
      loader.load(url, (data) => resolve(data), null, reject);
    });
  }

  var model;
  async function load(modelUrl) {
    // clear existing model
    let objToRemove = scene.getObjectByName("targetModel");
    scene.remove(objToRemove);
    // load model
    const gltfData = await loadModel(modelUrl);
    model = gltfData.scene;
    model.name = "targetModel";
    scene.add(model);
  }

  function animate() {
    let logFftArray = audioProcessor.getLogFftArray();
    audioSpectrum.drawSpectrum(logFftArray);

    let scaleVec = modelAudioScaler.fftArrToScaleVec(logFftArray);
    model.scale.copy(scaleVec);

    const ROT_DELTA = (2 * Math.PI) / (60 * 60); // 60 FPS * 60 sec
    model.rotateX(x_rot_rpm * ROT_DELTA);
    model.rotateY(y_rot_rpm * ROT_DELTA);
    model.rotateZ(z_rot_rpm * ROT_DELTA);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  load(inputModelUrl).then(animate).catch(function(error) {
    console.log(error);
  });
}

document.getElementById("modelInputFile").onchange = function(event) {
  const uploadedFile = event.target.files[0];
  console.debug(uploadedFile);
  const fileUrl = URL.createObjectURL(uploadedFile);
  main(fileUrl);
};

main(require("./assets/models/beetroot.glb"));
