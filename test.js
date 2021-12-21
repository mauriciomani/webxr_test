import * as THREE from './libs/three.module.js';
import { RGBELoader } from './libs/RGBELoader.js';
import { ARButton } from './libs/ARButton.js';
import { XREstimatedLight } from './libs/XREstimatedLight.js';

let camera, scene, renderer, controller, defaultEnvironment;

init();
animate();

function init() {

	const container = document.createElement( 'div' );
	document.body.appendChild( container );

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

	const defaultLight = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
	defaultLight.position.set( 0.5, 1, 0.25 );
	scene.add( defaultLight );

	renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
	container.appendChild( renderer.domElement );

	// Don't add the XREstimatedLight to the scene initially.
	// It doesn't have any estimated lighting values until an AR session starts.

	
	// In order for lighting estimation to work, 'light-estimation' must be included as either an optional or required feature.
	document.body.appendChild( ARButton.createButton( renderer, { optionalFeatures: [ 'light-estimation' ] } ) );

	const ballGeometry = new THREE.SphereBufferGeometry( 0.175, 32, 32 );
	const ballMaterial = new THREE.MeshStandardMaterial( { color: 0xdddddd} );
	const ballMesh = new THREE.Mesh( ballGeometry, ballMaterial );
	ballMesh.position.set( 0, 0, -2 );
	scene.add( ballMesh );
    function onSelect() {
        ballGroup.position.set( 0, 0, - 2 ).applyMatrix4( controller.matrixWorld );
        ballGroup.quaternion.setFromRotationMatrix( controller.matrixWorld );
    }

	controller = renderer.xr.getController( 0 );
	controller.addEventListener( 'select', onSelect );
	scene.add( controller );

	window.addEventListener( 'resize', onWindowResize );
	}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    renderer.setAnimationLoop( render );
}

function render() {
    renderer.render( scene, camera );
}