import 'regenerator-runtime/runtime';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const ambientLight = new THREE.AmbientLight(0x404040, 8);
scene.add(ambientLight);

const loader = new GLTFLoader();

function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, data => resolve(data), null, reject)
  });
}

function main() {
  var model;
  async function load() {
    const modelUrl = require('./assets/models/beetroot.glb');
    const gltfData = await loadModel(modelUrl);

    model = gltfData.scene;

    scene.add(model);
  }

  var y_rot_rps = 0.05; // revolutions per second
  var y_rot_delta = y_rot_rps * Math.PI / 30; // assuming 60 FPS
  function animate() {
    requestAnimationFrame( animate );
    model.rotation.y += y_rot_delta;
    renderer.render( scene, camera );
  }

  load().then(animate).catch(error => {
    console.log(error);
  });

}

main();
