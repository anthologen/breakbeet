import 'regenerator-runtime/runtime';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import noUiSlider from 'nouislider';
import 'nouislider/distribute/nouislider.css';
import wNumb from 'wnumb';

var scene = new THREE.Scene();
scene.background = new THREE.Color(document.getElementById("backgroundColor").value);
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById("viewport").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404040, 8);
scene.add(ambientLight);

window.addEventListener('resize', () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
})

document.getElementById("backgroundColor").addEventListener('input', (event) => {
  scene.background = new THREE.Color(event.target.value);
})

document.getElementById("lightColor").addEventListener('input', (event) => {
  ambientLight.color = new THREE.Color(event.target.value);
})

document.getElementById("lightIntensity").addEventListener('input', (event) => {
  ambientLight.intensity = event.target.valueAsNumber || 0;
})

document.getElementById("audioInputFile").onchange = (event) => {
  const uploadedFile = event.target.files[0];
  const fileUrl = URL.createObjectURL(uploadedFile);
  document.getElementById("audioElement").src = fileUrl;
}

function AudioProcessor() {
  let audioElement = document.getElementById("audioElement");
  let audioContext = new AudioContext();
  let audioSrc = audioContext.createMediaElementSource(audioElement);
  let audioAnalyzer = audioContext.createAnalyser();
  audioSrc.connect(audioAnalyzer);
  audioAnalyzer.connect(audioContext.destination);
  audioAnalyzer.fftSize = 2048;

  let linearFftArray = new Uint8Array(audioAnalyzer.frequencyBinCount);
  const {createAudioBars, updateAudioBars} = require('audio-frequency-tempered');
  let logFftArray = createAudioBars({ groupLevel: 2 });

  function getLogFftArray() {
    audioAnalyzer.getByteFrequencyData(linearFftArray);
    updateAudioBars(linearFftArray); // updates logFftArray
    return logFftArray.map((x) => x['value']);
  }

  function getNumFreqBins() {
    return logFftArray.length;
  }

  return Object.freeze({
    getLogFftArray,
    getNumFreqBins
  });
}
var audioProcessor = AudioProcessor();

function FreqRangeSelector() {
  const MIN_FREQUENCY = 20;
  const MAX_FREQUENCY = 22000;
  const MID_START_FREQUENCY = 440;
  const tooltipConfig = wNumb({suffix: " Hz", thousand: ',', decimals: 0});
  const tooltipConfigList = [tooltipConfig, tooltipConfig]; // for both handles

  function makeSliderLogRangeConfig() {
    // Solve A and k in y = A*e^(kx) with points (0, 20) and (100, 22000)
    const centLogA = MIN_FREQUENCY;
    const centLogK = Math.log(MAX_FREQUENCY/MIN_FREQUENCY) / 100;
    let logRangeDict = {};
    for (let i = 0; i <= 100; i++)
    {
      logRangeDict[i + '%'] = centLogA * Math.exp(centLogK * i);
    }
    logRangeDict["min"] = MIN_FREQUENCY;
    delete logRangeDict['0%'];
    logRangeDict["max"] = MAX_FREQUENCY;
    delete logRangeDict['100%'];
    return logRangeDict;
  }
  const sliderLogRangeConfig = makeSliderLogRangeConfig();

  // Solve A and k in y = A*e^(kx) with points (0, 20) and (numFreqBins-1, 22000)
  const binLogA = MIN_FREQUENCY;
  const binLogK = (Math.log(MAX_FREQUENCY/MIN_FREQUENCY)
                    / (audioProcessor.getNumFreqBins() - 1));
  function freqToBinIdx(inFreq) {
    return Math.round(Math.log(inFreq / binLogA) / binLogK);
  }

  let hLowerBinIdx = freqToBinIdx(MIN_FREQUENCY);
  let hUpperBinIdx = freqToBinIdx(MID_START_FREQUENCY);
  let hFreqSlider = document.getElementById('hFreqSlider');
  noUiSlider.create(hFreqSlider, {
      start: [MIN_FREQUENCY, MID_START_FREQUENCY],
      connect: true,
      tooltips: tooltipConfigList,
      range: sliderLogRangeConfig
  });
  hFreqSlider.noUiSlider.on("update", (sliderVals) => {
    hLowerBinIdx = freqToBinIdx(sliderVals[0]);
    hUpperBinIdx = freqToBinIdx(sliderVals[1]);
  });

  let vLowerBinIdx = freqToBinIdx(MID_START_FREQUENCY);
  let vUpperBinIdx = freqToBinIdx(MAX_FREQUENCY);
  let vFreqSlider = document.getElementById('vFreqSlider');
  noUiSlider.create(vFreqSlider, {
      start: [MID_START_FREQUENCY, MAX_FREQUENCY],
      connect: true,
      tooltips: tooltipConfigList,
      range: sliderLogRangeConfig
  });
  vFreqSlider.noUiSlider.on("update", (sliderVals) => {
    vLowerBinIdx = freqToBinIdx(sliderVals[0]);
    vUpperBinIdx = freqToBinIdx(sliderVals[1]);
  });

  return Object.freeze({
    getHLoBinIdx: () => hLowerBinIdx,
    getHHiBinIdx: () => hUpperBinIdx,
    getVLoBinIdx: () => vLowerBinIdx,
    getVHiBinIdx: () => vUpperBinIdx,
  });

}
var freqRanges = FreqRangeSelector();

function ModelAudioScaler() {
  var hScaleFactor = 1;
  document.getElementById("modelHScaleFactor").addEventListener('input', (event) => {
    hScaleFactor = event.target.valueAsNumber || 0;
  })

  var vScaleFactor = 0;
  document.getElementById("modelVScaleFactor").addEventListener('input', (event) => {
    vScaleFactor = event.target.valueAsNumber || 0;
  })

  function avg(arr) {
    if (arr.length === 0) return 0;
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
var modelAudioScaler = ModelAudioScaler();

var x_rot_rpm = 0;
document.getElementById("modelInputXRot").addEventListener('input', (event) => {
  x_rot_rpm = event.target.valueAsNumber || 0;
})

var y_rot_rpm = 1;
document.getElementById("modelInputYRot").addEventListener('input', (event) => {
  y_rot_rpm = event.target.valueAsNumber || 0;
})

var z_rot_rpm = 0;
document.getElementById("modelInputZRot").addEventListener('input', (event) => {
  z_rot_rpm = event.target.valueAsNumber || 0;
})

function main(inputModelUrl) {
  const loader = new GLTFLoader();
  function loadModel(url) {
    return new Promise((resolve, reject) => {
      loader.load(url, data => resolve(data), null, reject)
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
    let scaleVec = modelAudioScaler.fftArrToScaleVec(logFftArray);
    model.scale.copy(scaleVec);

    const ROT_DELTA = (2 * Math.PI) / (60 * 60); // 60 FPS * 60 sec
    model.rotateX(x_rot_rpm * ROT_DELTA);
    model.rotateY(y_rot_rpm * ROT_DELTA);
    model.rotateZ(z_rot_rpm * ROT_DELTA);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  load(inputModelUrl).then(animate).catch(error => {
    console.log(error);
  });
}

document.getElementById("modelInputFile").onchange = (event) => {
  const uploadedFile = event.target.files[0];
  const fileUrl = URL.createObjectURL(uploadedFile);
  main(fileUrl);
}

main(require('./assets/models/beetroot.glb'));
