import 'regenerator-runtime/runtime';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

var scene = new THREE.Scene();
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

const ambientLight = new THREE.AmbientLight(0x404040, 8);
scene.add(ambientLight);

const loader = new GLTFLoader();

function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, data => resolve(data), null, reject)
  });
}

function main() {
  var audioElement = document.getElementById("audioElement");
  var audioContext = new AudioContext();
  var audioSrc = audioContext.createMediaElementSource(audioElement);
  var audioAnalyzer = audioContext.createAnalyser();
  audioSrc.connect(audioAnalyzer);
  audioAnalyzer.connect(audioContext.destination);
  audioAnalyzer.fftSize = 256;
  var dataArray = new Uint8Array(audioAnalyzer.frequencyBinCount);

  var model;
  async function load() {
    const modelUrl = require('./assets/models/beetroot.glb');
    const gltfData = await loadModel(modelUrl);

    model = gltfData.scene;

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
      1 + lowFreqFactor, // X
      1 + lowFreqFactor, // Y
      1 + highFreqFactor // Z
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

  load().then(animate).catch(error => {
    console.log(error);
  });

}

main();
