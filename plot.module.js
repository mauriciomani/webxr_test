import * as THREE from "./libs/three.module.js";
import { BoxLineGeometry } from "./libs/BoxLineGeometry.js";
import { VRButton } from "./libs/VRButton.js";
import { XRControllerModelFactory } from './libs/XRControllerModelFactory.js'
import { CanvasUI } from './libs/CanvasUI.js'

const intersected = [];
const tempMatrix = new THREE.Matrix4();
const raycaster = new THREE.Raycaster();
// Have not been able to INTERSECT without plot
var plot = [];
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const scene = new THREE.Scene();

function createText(scene, position_x, position_y, position_z, title, size=0.5, height=0.1, color=0x111111, opacity=1.0, parent=null){
    /*
    Create text using textgeometry, fontloader and meshphong
    @scene created three.js scene
    @position_x center of position x
    @position_y center of position y
    @position_z center of position z
    @title text for title
    */
    let textGeo, textMesh;
    //const textMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
    const textMaterial = new THREE.MeshPhongMaterial( { color: color,
                                                        specular: 0xb5b5b5,
                                                        shininess: 70,
                                                        emissive: 0x0,
                                                        transparent: true,
                                                        opacity: opacity
                                                        } );
    const fontload = new THREE.FontLoader();
	fontload.load( 'fonts/optimer_regular.typeface.json', function ( font ) {
        textGeo = new THREE.TextGeometry( title, {
            font: font,
            size: size,
            height: height,
            curveSegments: 12,
            bevelEnabled: false
        } );
        // Make title in the middle
        textGeo.computeBoundingBox();
        const centerOffset = ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x ) / 2;
        textMesh = new THREE.Mesh( textGeo, textMaterial );
        textMesh.position.x = position_x - centerOffset;
        textMesh.position.y = position_y;
        textMesh.position.z = position_z;
        if (parent != null ){
            parent.children = textMesh;
        }
        scene.add(textMesh);
    } );
}


function dotted_lines(x_start, x_end, y_start, y_end, z_start, z_end){
    /*
    Create dotted line to know where we are.
    @x_start if same as x_end then would either be y or z
    @x_end if different to x_start then position and size on x-axis
    @y_start
    @y_end
    @z_start
    @z_end
    */
    const material = new THREE.LineDashedMaterial( { color: 0x111111, 
                                                     dashSize: 0.5, 
                                                     gapSize: 0.3, 
                                                     transparent: true, 
                                                     opacity: 0.1} );

    const points = [];
    points.push( new THREE.Vector3( x_start, y_start, z_start ) );
    points.push( new THREE.Vector3( x_end, y_end, z_end ) );

    const geometry = new THREE.BufferGeometry().setFromPoints( points );

    const line = new THREE.Line( geometry, material );
    line.computeLineDistances();
    return line;
}


function onSelectStart() {
    this.userData.isSelecting = true;
}

function onSelectEnd() {
    this.userData.isSelecting = false;
}



function buildController( data ) {
    /*
    This function create a white line comming from the controller.
    If removed no white line. It is used inside the connected function.
    */
    let geometry, material;

    switch ( data.targetRayMode ) {

        case 'tracked-pointer':

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

            material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

            return new THREE.Line( geometry, material );

        case 'gaze':

            geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, -1 );
            material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
            return new THREE.Mesh( geometry, material );
    }
}

function getIntersections( controller ){
    tempMatrix.identity().extractRotation( controller.matrixWorld );
    
    raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
    raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );

    return raycaster.intersectObjects( plot );
}

function intersectObjects( controller ){
    if ( controller.userData.selected !== undefined ) return;

    const line = controller.getObjectByName( 'line' );
    const intersections = getIntersections( controller );

    if (intersections.length > 0){
        const intersection = intersections[0];
        const object = intersection.object;
        if (object.name == 'observation'){
            scene.add(object.children.mesh);
        } else{
            object.material.opacity = 1;
            try{
                object.children.material.opacity = 1;
            } catch{   
            }
        }
        intersected.push( object );

        line.scale.z = intersection.distance;
    } else{
        line.scale.z =5;
    }
}

function cleanIntersected(){
    while ( intersected.length ){
        const object = intersected.pop();
        if (object.name == 'observation'){
            scene.remove( object.children.mesh );
        }else{
            object.material.opacity = 0.1;
            try{
                object.children.material.opacity = 0.1;
            } catch{

            }
        }
    }
}

function main(){

    let room, controller, controllerGrip;
    //const intersected = [];
	//const tempMatrix = new THREE.Matrix4();
    const canvas = document.querySelector('#c');
    //const scene = new THREE.Scene();

    // Light gray background
    scene.background = new THREE.Color( 0xd3d3d3 );

    //const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    // For some reason camara position does not work with VR extension
    // Can be used THREE.Group, however did not find out how to group controllers
    const cameraHolder = new THREE.Object3D(  );
    cameraHolder.add(camera);

    const renderer = new THREE.WebGLRenderer({canvas});
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.xr.enabled = true;
    document.body.appendChild( VRButton.createButton( renderer ) );

    // Controller
    controller = renderer.xr.getController( 0 );
    controller.addEventListener( 'selectstart', onSelectStart );
    controller.addEventListener( 'selectend', onSelectEnd );
    controller.addEventListener( 'connected', function ( event ) {
        this.add( buildController( event.data ) );
    } );
    controller.addEventListener( 'disconnected', function () {
        this.remove( this.children[ 0 ] );
    } );
    cameraHolder.add( controller );

    // Controller Grip
    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip = renderer.xr.getControllerGrip( 0 );
    controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ) );
    cameraHolder.add( controllerGrip );

    const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );
    const line = new THREE.Line( geometry );
    line.name = 'line';
    line.scale.z = 5;
    controller.add( line.clone() );

    // Load data
    const loader = new THREE.FileLoader();

    loader.load(
        "iris.csv",
        function (data){
            // Data extraction
            var rows = data.split(/\r\n|\n/);
            const column_names = rows[0].split(",");
            const col1_index = column_names.indexOf('"petal.length"');
            const col2_index = column_names.indexOf('"sepal.length"');
            const col3_index = column_names.indexOf('"sepal.width"');
            const first_value = rows[1].split(",")

            // Understand where to position viewer
            var min_col1, min_col2, min_col3, max_col1, max_col2, max_col3;
            min_col1 = max_col1 = parseFloat(first_value[col1_index]);
            min_col2 = max_col2 = parseFloat(first_value[col2_index]);
            min_col3 = max_col3 = parseFloat(first_value[col3_index]);

            // Placing points for each observation
            var cardinality = rows.length;
            for (var i=1; i<cardinality; i++){
                var entries = rows[i].split(",")
                const geometry = new THREE.SphereGeometry( 0.1, 32, 32 );
                const material = new THREE.MeshLambertMaterial( {transparent: true, opacity: 0.6, color: 0x0000ff} )
                const sphere = new THREE.Mesh( geometry, material );

                // Define point x and estabish min and max
                const col1 = parseFloat(entries[col1_index]);
                sphere.position.x = col1;
                if (min_col1 > col1) {
                    min_col1 = col1
                }
                else if (max_col1 < col1){
                    max_col1 = col1
                }
                // Define point y and establish min and max
                const col2 = parseFloat(entries[col2_index]);
                sphere.position.y = col2;
                if (min_col2 > col2) {
                    min_col2 = col2
                }
                else if (max_col2 < col2){
                    max_col2 = col2
                }
                // Define point z and establish min and max
                const col3 = parseFloat(entries[col3_index]);
                sphere.position.z = col3;
                if (min_col3 > col3) {
                    min_col3 = col3
                }
                else if (max_col3 < col3){
                    max_col3 = col3
                }

                // Modified the opacity in CanvasUi lib
                const css = {
                    header:{
                        type: "text",
                        position:{ top:0 },
                        paddingTop: 30,
                        height: 70
                    },
                    main:{
                        type: "text",
                        position:{ top:70 },
                        height: 372, // default height is 512 so this is 512 - header height:70 - footer height:70
                        backgroundColor: "#bbb",
                        fontColor: "#000"
                    },
                    footer:{
                        type: "text",
                        position:{ bottom:0 },
                        paddingTop: 30,
                        height: 70
                    }
                }
                const content = {
                    header: "Fisher's Iris dataset",
                    main: 'Petal length: \ ' + col1.toString() + ' \
                    Sepal Length: ' + col2.toString() + ' \
                    Sepal Width: ' + col3.toString(),
                    footer: "ID: " + i.toString()
                }

                const ui = new CanvasUI( content, css );
                ui.mesh.position.set( col1, col2 + 0.6, col3 );
                sphere.children = ui;
                sphere.name = "observation";
                scene.add(sphere);
                plot.push( sphere );
            }

            // Move position to max
            var arrayLength = plot.length;
            for (var i = 0; i < arrayLength; i++){
                plot[i].children.mesh.position.z = max_col3;
            }
            
            // Will help for later calculations
            const diff_col1 = parseFloat(max_col1) - parseFloat(min_col1);
            const diff_col2 = parseFloat(max_col2) - parseFloat(min_col2);
            const diff_col3 = parseFloat(max_col3) - parseFloat(min_col3);

            // Position controller and camera
            cameraHolder.position.set(min_col1 + ( diff_col1 / 2 ), min_col2 + ( diff_col2 / 2 ), max_col3 + 3);
            scene.add(cameraHolder);

            // Create BoxLine, it is priority to properly set the box
            room = new THREE.LineSegments(
                new BoxLineGeometry( diff_col1 * 4,
                                     diff_col2 * 4,
                                     diff_col3 * 4, 
                                     5,
                                     5,
                                     5 ).translate( 0, 3, 0 ), 
                                     new THREE.LineBasicMaterial( { color: 0x4e4e4e } )
            );
            room.position.x = (parseFloat(min_col1) + ((diff_col1)/2));
            // Division by 4 seems to work good
            room.position.y = parseFloat(min_col2) - (diff_col2/4);
            // Near the end of the boxline
            room.position.z = (parseFloat(max_col3) + ((diff_col3)/1.2));
            scene.add( room );

            const horizontal_dotted_line = dotted_lines(min_col1 - 1, max_col1 + 1, min_col2 + (diff_col2/2), min_col2 + (diff_col2/2), min_col3 + (diff_col3/2), min_col3 + (diff_col3/2));
            createText(scene, max_col1 + 0.5, min_col2 + (diff_col2/2), min_col3 + (diff_col3/2), (min_col2 + (diff_col2/2)).toString(), 0.1, 0.01, 0x111111, 0.1, horizontal_dotted_line);
            plot.push(horizontal_dotted_line);
            scene.add(horizontal_dotted_line);

            const vertical_dotted_line = dotted_lines(min_col1 + (diff_col1/2), min_col1 + (diff_col1/2), min_col2 - 1, max_col2 + 1, min_col3 + (diff_col3/2), min_col3 + (diff_col3/2));
            createText(scene, min_col1 + (diff_col1/2) + 0.2, max_col2, min_col3 + (diff_col3/2), (min_col1 + (diff_col1/2)).toString(), 0.1, 0.01, 0x111111, 0.1, vertical_dotted_line);
            plot.push(vertical_dotted_line);
            scene.add(vertical_dotted_line);

            const depth_dotted_line = dotted_lines(min_col1 + (diff_col1/2), min_col1 + (diff_col1/2), min_col2 + (diff_col2/2), min_col2 + (diff_col2/2), min_col3 - 1, max_col3  + 1);
            createText(scene, min_col1 + (diff_col1/2) + 0.2, min_col2 + (diff_col2/2), min_col3 + (diff_col3/2), (min_col3 + (diff_col3/2)).toString(), 0.1, 0.01, 0x111111, 0.1, depth_dotted_line);
            plot.push(depth_dotted_line);
            scene.add(depth_dotted_line);
                        
            createText(scene,
                       ((max_col1 - min_col1)/2) + min_col1,
                       max_col2 + 2,
                       ((max_col3 - min_col3)/2) + min_col3,
                       'Iris sepal and petal');
            
            const hemisphereLight = new THREE.HemisphereLight(0x606060, 0x404040, 1);
            hemisphereLight.position.set ( 0, max_col2 + 5, 0 );
            scene.add(hemisphereLight);
            const light = new THREE.DirectionalLight( 0xffffff );
            light.position.set( min_col1 + ((diff_col1)/2) + 2, min_col2 + ((diff_col2)/2) + 3, min_col3 + ((diff_col3)/2) + 1);
            light.target.position.set( min_col1 + ((diff_col1)/2), min_col2 + ((diff_col2)/2), min_col3 + ((diff_col3)/2) );
            scene.add(light.target);
            scene.add(light);
            //const helper = new THREE.DirectionalLightHelper( light, 5 );
            //scene.add( helper);
        }
    );
    console.log(plot);

    renderer.setAnimationLoop( function () {

        cleanIntersected();
        intersectObjects(controller);

        renderer.render( scene, camera );
    
    } );

}

main();