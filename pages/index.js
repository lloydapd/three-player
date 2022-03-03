import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import * as BufferGeometryUtils from 'three/examples/jsm/controls/OrbitControls.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js'

export default function Home() {
  const [song, setSong] = useState("http://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg")

  let camera, scene, renderer;
	let cameraControls;
	let effectController;
	const teapotSize = 300;
	let ambientLight, light;

	let tess = - 1;	// force initialization
	let bBottom;
	let bLid;
	let bBody;
	let bFitLid;
	let bNonBlinn;
	let shading;

	let teapot, textureCube;
	const materials = {};


	function init() {

		const container = document.createElement( 'div' );
		document.body.appendChild( container );

		const canvasWidth = window.innerWidth;
		const canvasHeight = window.innerHeight;

		// CAMERA
		camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 80000 );
		camera.position.set( - 600, 550, 1300 );

		// LIGHTS
		ambientLight = new THREE.AmbientLight( 0x333333 );

		light = new THREE.DirectionalLight( 0xFFFFFF, 1.0 );
		light.position.set( 0.32, 0.39, 0.7 );

		// RENDERER
		renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( canvasWidth, canvasHeight );
		renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( renderer.domElement );

		// EVENTS
		window.addEventListener( 'resize', onWindowResize );

		// CONTROLS
		cameraControls = new OrbitControls( camera, renderer.domElement );
		cameraControls.addEventListener( 'change', render );

		// TEXTURE MAP
		const textureMap = new THREE.TextureLoader().load( 'textures/uv_grid_opengl.jpg' );
		textureMap.wrapS = textureMap.wrapT = THREE.RepeatWrapping;
		textureMap.anisotropy = 16;
		textureMap.encoding = THREE.sRGBEncoding;

		// REFLECTION MAP
		const path = 'textures/cube/pisa/';
		const urls = [ 'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png' ];

		textureCube = new THREE.CubeTextureLoader().setPath( path ).load( urls );
		textureCube.encoding = THREE.sRGBEncoding;

		materials[ 'wireframe' ] = new THREE.MeshBasicMaterial( { wireframe: true } );
		materials[ 'flat' ] = new THREE.MeshPhongMaterial( { specular: 0x000000, flatShading: true, side: THREE.DoubleSide } );
		materials[ 'smooth' ] = new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } );
		materials[ 'glossy' ] = new THREE.MeshPhongMaterial( { side: THREE.DoubleSide } );
		materials[ 'textured' ] = new THREE.MeshPhongMaterial( { map: textureMap, side: THREE.DoubleSide } );
		materials[ 'reflective' ] = new THREE.MeshPhongMaterial( { envMap: textureCube, side: THREE.DoubleSide } );

		// scene itself
		scene = new THREE.Scene();
		scene.background = new THREE.Color( 0xAAAAAA );

		scene.add( ambientLight );
		scene.add( light );

		// GUI
		setupGui();

	}

	// EVENT HANDLERS

	function onWindowResize() {

		const canvasWidth = window.innerWidth;
		const canvasHeight = window.innerHeight;

		renderer.setSize( canvasWidth, canvasHeight );

		camera.aspect = canvasWidth / canvasHeight;
		camera.updateProjectionMatrix();

		render();

	}

	function setupGui() {

		effectController = {
			newTess: 15,
			bottom: true,
			lid: true,
			body: true,
			fitLid: false,
			nonblinn: false,
			newShading: 'glossy'
		};

		const gui = new GUI()
		gui.add( effectController, 'newTess', [ 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50 ] ).name( 'Tessellation Level' ).onChange( render );
		gui.add( effectController, 'lid' ).name( 'display lid' ).onChange( render );
		gui.add( effectController, 'body' ).name( 'display body' ).onChange( render );
		gui.add( effectController, 'bottom' ).name( 'display bottom' ).onChange( render );
		gui.add( effectController, 'fitLid' ).name( 'snug lid' ).onChange( render );
		gui.add( effectController, 'nonblinn' ).name( 'original scale' ).onChange( render );
		gui.add( effectController, 'newShading', [ 'wireframe', 'flat', 'smooth', 'glossy', 'textured', 'reflective' ] ).name( 'Shading' ).onChange( render );

	}

	function render() {

		if ( effectController.newTess !== tess ||
			effectController.bottom !== bBottom ||
			effectController.lid !== bLid ||
			effectController.body !== bBody ||
			effectController.fitLid !== bFitLid ||
			effectController.nonblinn !== bNonBlinn ||
			effectController.newShading !== shading ) {

			tess = effectController.newTess;
			bBottom = effectController.bottom;
			bLid = effectController.lid;
			bBody = effectController.body;
			bFitLid = effectController.fitLid;
			bNonBlinn = effectController.nonblinn;
			shading = effectController.newShading;

			createNewTeapot();

		}

		// skybox is rendered separately, so that it is always behind the teapot.
		if ( shading === 'reflective' ) {

			scene.background = textureCube;

		} else {

			scene.background = null;

		}

		renderer.render( scene, camera );

	}

	// Whenever the teapot changes, the scene is rebuilt from scratch (not much to it).
	function createNewTeapot() {

		if ( teapot !== undefined ) {

			teapot.geometry.dispose();
			scene.remove( teapot );

		}

		const geometry = new TeapotGeometry( teapotSize,
			tess,
			effectController.bottom,
			effectController.lid,
			effectController.body,
			effectController.fitLid,
			! effectController.nonblinn );

		teapot = new THREE.Mesh( geometry, materials[ shading ] );

		scene.add( teapot );

	}

  useEffect(() => {
    init();
    render();
  }, [])

  return (
    <div className={styles.container}>
      <Head>
        <title>Three project</title>
      </Head>

      <div>
        <div id="container" ></div>
        <h1>m4a</h1>
        <audio src="http://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a" controls />
        <br/>
        <h1>ogg</h1>
        <audio src="http://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg" controls />
        <br/>
        <h1>mp3</h1>
        <audio src="http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3" controls />
        <br/>
        <h1>wav</h1>
        <audio src="http://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/alien_shoot.wav" controls />
        <h1>Mp4</h1>
        <video src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" controls />
        <br/>
        <h1>webm</h1>
        <video src="http://localhost:3000/price.webm" controls />
        <br/>
        <h1>ogv</h1>
        <video src="https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-ogv-file.ogv" controls />
        <br/>
        <h1>oga</h1>
        <video src="http://localhost:3000/price.oga" controls />
      </div>

    </div>
  )
}

// <div>
//   <h1>m4a</h1>
//   <audio src="http://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a" controls />
//   <br/>
//   <h1>ogg</h1>
//   <audio src="http://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg" controls />
//   <br/>
//   <h1>mp3</h1>
//   <audio src="http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3" controls />
//   <br/>
//   <h1>wav</h1>
//   <audio src="http://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/alien_shoot.wav" controls />
//   <h1>Mp4</h1>
//   <video src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" controls />
//   <br/>
//   <h1>webm</h1>
//   <video src="http://localhost:3000/price.webm" controls />
//   <br/>
//   <h1>ogv</h1>
//   <video src="https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-ogv-file.ogv" controls />
//   <br/>
//   <h1>oga</h1>
//   <video src="http://localhost:3000/price.oga" controls />
// </div>

// <Canvas className={styles.canvas}>
//   <ambientLight intensity={0.5} />
//   <directionalLight position={[ -2, 5, 2 ]} intensity={1} />
//   <Cube />
// </Canvas>
