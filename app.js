import 'regenerator-runtime/runtime';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

var scene = new THREE.Scene();
scene.background = new THREE.Color(document.getElementById("backgroundColor").value);
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById("viewport").appendChild( renderer.domElement );

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
  modelBaseSize = event.target.valueAsNumber;
})

const ambientLight = new THREE.AmbientLight(0x404040, 8);
scene.add(ambientLight);

var audioElement = document.getElementById("audioElement");
var audioContext = new AudioContext();
var audioSrc = audioContext.createMediaElementSource(audioElement);
var audioAnalyzer = audioContext.createAnalyser();
audioSrc.connect(audioAnalyzer);
audioAnalyzer.connect(audioContext.destination);
audioAnalyzer.fftSize = 256;
var dataArray = new Uint8Array(audioAnalyzer.frequencyBinCount);

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

  var y_rot_rps = 0.05; // revolutions per second
  var y_rot_delta = y_rot_rps * Math.PI / 30; // assuming 60 FPS

  var pivotPercentSlider = 0.2; // where to partition the frequency spectrum
  var dampeningFactor = 0.002; // shrink model to fit on canvas

  var pivotIdx = (dataArray.length/2 - 1) * pivotPercentSlider;

  function avg(arr) {
    return arr.reduce((a, b) => a + b) / arr.length;
  }

  function fftArrToScaleVec(fftArr) {
    var lowerSubArray = fftArr.slice(0, pivotIdx);
    var upperSubArray = fftArr.slice(pivotIdx, fftArr.length - 1);
    var lowFreqFactor = avg(lowerSubArray) * dampeningFactor;
    var highFreqFactor = avg(upperSubArray) * dampeningFactor;
    return new THREE.Vector3(
      modelBaseSize + lowFreqFactor, // X
      modelBaseSize + lowFreqFactor, // Y
      modelBaseSize + highFreqFactor // Z
    );
  }

  function animate() {
    audioAnalyzer.getByteFrequencyData(dataArray);

    var scaleVec = fftArrToScaleVec(dataArray);
    model.scale.copy(scaleVec);

    model.rotation.y += y_rot_delta;
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
