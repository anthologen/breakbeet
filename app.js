import 'regenerator-runtime/runtime';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import noUiSlider from 'nouislider';
import 'nouislider/distribute/nouislider.css';
import wNumb from 'wnumb';

var scene = new THREE.Scene();
scene.background = new THREE.Color(document.getElementById("backgroundColor").value);
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById("viewport").appendChild( renderer.domElement );

const controls = new OrbitControls( camera, renderer.domElement );

const ambientLight = new THREE.AmbientLight(0x404040, 8);
scene.add(ambientLight);

window.addEventListener('resize', () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
})

document.getElementById("panel").addEventListener('mouseover', (event) => {
  document.getElementById("controls-container").classList.remove('hide');
  document.getElementById("controls-container").classList.add('show');
})

document.getElementById("panel").addEventListener('mouseout', (event) => {
  document.getElementById("controls-container").classList.remove('show');
  document.getElementById("controls-container").classList.add('hide');
})

document.getElementById("backgroundColor").addEventListener('input', (event) => {
  scene.background = new THREE.Color(event.target.value);
})

document.getElementById("audioInputFile").onchange = (event) => {
  const uploadedFile = event.target.files[0];
  const fileUrl = URL.createObjectURL(uploadedFile);
  document.getElementById("audioElement").src = fileUrl;
}

var modelBaseSize = 1;
document.getElementById("modelInputBaseSize").addEventListener('input', (event) => {
  modelBaseSize = event.target.valueAsNumber || 0;
})

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

document.getElementById("lightColor").addEventListener('input', (event) => {
  ambientLight.color = new THREE.Color(event.target.value);
})

document.getElementById("lightIntensity").addEventListener('input', (event) => {
  ambientLight.intensity = event.target.valueAsNumber || 0;
})

var audioElement = document.getElementById("audioElement");
var audioContext = new AudioContext();
var audioSrc = audioContext.createMediaElementSource(audioElement);
var audioAnalyzer = audioContext.createAnalyser();
audioSrc.connect(audioAnalyzer);
audioAnalyzer.connect(audioContext.destination);
audioAnalyzer.fftSize = 2048;
var dataArray = new Uint8Array(audioAnalyzer.frequencyBinCount);
const {createAudioBars, updateAudioBars} = require('audio-frequency-tempered');
var temperedAudioDataArray = createAudioBars({ groupLevel: 2 });
const numFreqBins  = temperedAudioDataArray.length;

const minFrequency = 20;
const maxFrequency = 22000;
const midStartFrequency = 440;
const tooltipConfig = wNumb({suffix: " Hz", thousand: ',', decimals: 0});
const tooltipConfigList = [tooltipConfig, tooltipConfig]; // both handles

function makeHundredLogRangeDict() {
  // Solve A and k in y = A*e^(kx) with points (0, 20) and (100, 22000)
  const centLogA = minFrequency;
  const centLogK = Math.log(maxFrequency/minFrequency) / 100;
  var logRangeDict = {};
  for (let i = 0; i <= 100; i++)
  {
    logRangeDict[i + '%'] = centLogA * Math.exp(centLogK * i);
  }
  logRangeDict["min"] = minFrequency;
  delete logRangeDict['0%'];
  logRangeDict["max"] = maxFrequency;
  delete logRangeDict['100%'];
  return logRangeDict;
}
const logRangeConfig = makeHundredLogRangeDict();

// Solve A and k in y = A*e^(kx) with points (0, 20) and (numFreqBins-1, 22000)
const binLogA = minFrequency;
const binLogK =  Math.log(maxFrequency/minFrequency) / (numFreqBins - 1);
function freqToBinIdx(inFreq) {
  return Math.round(Math.log(inFreq / binLogA) / binLogK);
}

var hLowerBound = freqToBinIdx(minFrequency);
var hUpperBound = freqToBinIdx(midStartFrequency);
var hFreqSlider = document.getElementById('hFreqSlider');
noUiSlider.create(hFreqSlider, {
    start: [minFrequency, midStartFrequency],
    connect: true,
    tooltips: tooltipConfigList,
    range: logRangeConfig
});
hFreqSlider.noUiSlider.on("update", (sliderVals) => {
  hLowerBound = freqToBinIdx(sliderVals[0]);
  hUpperBound = freqToBinIdx(sliderVals[1]);
});

var vLowerBound = freqToBinIdx(midStartFrequency);
var vUpperBound = freqToBinIdx(maxFrequency);
var vFreqSlider = document.getElementById('vFreqSlider');
noUiSlider.create(vFreqSlider, {
    start: [midStartFrequency, maxFrequency],
    connect: true,
    tooltips: tooltipConfigList,
    range: logRangeConfig
});
vFreqSlider.noUiSlider.on("update", (sliderVals) => {
  vLowerBound = freqToBinIdx(sliderVals[0]);
  vUpperBound = freqToBinIdx(sliderVals[1]);
});

var dampeningFactor = 1;//0.002; // shrink model to fit on canvas

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b) / arr.length;
}

function fftArrToScaleVec(fftArr) {
  let hSubArray = fftArr.slice(hLowerBound, hUpperBound);
  let vSubArray = fftArr.slice(vLowerBound, vUpperBound);
  let hFreqFactor = avg(hSubArray) * dampeningFactor;
  let vFreqFactor = avg(vSubArray) * dampeningFactor;
  return new THREE.Vector3(
    modelBaseSize + hFreqFactor,
    modelBaseSize + vFreqFactor,
    modelBaseSize + hFreqFactor
  );
}

const loader = new GLTFLoader();
function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, data => resolve(data), null, reject)
  });
}


function main(inputModelUrl) {
  var model;
  async function load(modelUrl) {
    // clear existing model
    var objToRemove = scene.getObjectByName("targetModel");
    scene.remove(objToRemove);
    // load model
    const gltfData = await loadModel(modelUrl);
    model = gltfData.scene;
    model.name = "targetModel";
    scene.add(model);
  }

  function animate() {
    audioAnalyzer.getByteFrequencyData(dataArray);
    updateAudioBars(dataArray);
    var fftData = temperedAudioDataArray.map((x) => x['value']);

    var scaleVec = fftArrToScaleVec(fftData);
    model.scale.copy(scaleVec);
    const rot_delta = (2 * Math.PI) / (60 * 60); // 60 FPS * 60 sec

    model.rotation.x += x_rot_rpm * rot_delta;
    model.rotation.y += y_rot_rpm * rot_delta;
    model.rotation.z += z_rot_rpm * rot_delta;

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
