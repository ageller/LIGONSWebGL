//Fullscreen query

var saveWidth = 0.;
var saveHeight = 0.;
var infullscreen = false;
function fullscreen(){
    infullscreen = true;
    //console.log("fullscreen")
 //   var elem = document.getElementById('WebGL-canvas');
    var elem = document.getElementById('ContentContainer');
    saveWidth = elem.width;
    saveHeight = elem.height;
    elem.width = screen.width;
    elem.height = screen.height;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    }
    d3.select("#fullScreenButton").attr("class","hideButton")
   
}

if (document.addEventListener)
{
    document.addEventListener('webkitfullscreenchange', exitHandler, false);
    document.addEventListener('mozfullscreenchange', exitHandler, false);
    document.addEventListener('fullscreenchange', exitHandler, false);
    document.addEventListener('MSFullscreenChange', exitHandler, false);
}

function exitHandler()
{
    //var elem = document.getElementById('WebGL-canvas');
    var elem = document.getElementById('ContentContainer');

    if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement != null){
//    	document.getElementById("fullScreenButton").style.visibility = "hidden"
    } else {
        infullscreen = false;
        d3.select("#fullScreenButton").attr("class","showButton")
        elem.width = saveWidth;
        elem.height = saveHeight;
    }

}

////////////////////////////////////////////////
// the main attaction

var gl;
var canvas; 
var shaderProgram;
var mvMatrix = mat4.create();
var mvMatrix0 = mat4.create();
var pMatrix = mat4.create();

var VertexPositionBuffer;
var BoxPositionBuffer;
var CirclePositionBuffer;
var BNSVertexBuffer;

var redraw = true;

//for mouse events
var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var xrot = 0.;
var yrot = 0.;
var dz = 0.;

var BNSkeys;
var BNSkeyshowi;
var BNSkeyshow;
var MNS1;
var MNS2;
var Vkick;

var BNSVertices;

var alphaLine = 0.5;

var center = [0., 0., 0.];//0.];
var camerapos = [0., 0., -25.];//-200.];//-600];
var zCamMin = -50;
var zCamMax = -5.;

var btexture;
var mtexture;
var gtexture;


//for frustum
var zmax = 10000;
var zmin = 0.01;
var fov = 45.

var maxt = 0.;
var mint = 0.;

var time = 0.; //Myr (will be reset below)
var timeStart = 0.;

//make the SN more than one frame
var NSNframes = 2.;// on either side of flash
var NSNft = -1.;
//same idea, but for kilonova
var drawkN = false;
var NkNframes = 5.;// on either side of flash
var NkNft = -2.;
//for sGRB
var drawGRB = false;
var NGRBframes = 3.;
var NGRBft = -1.;
var GRBparts = [];
var NGRBp = 1000.;
var GRBpsize = 0.05;
var minGRBz = 0.;
var GRBxy = [-0.05, 0.2];
var GRBspread = 0.01;
var GRBspeed = 3.;

var colorNU = 	colorNU = [78./255., 42./255., 132./255.]; //NU purple, //http://www.northwestern.edu/brand/visual-identity/color/index.html

var dt = 5.; //Myr //setting this below 5 causes strange lines in Chrome below time bar from tween -- probably a Chrome bug
var play = true;

var lthick = 1.;
var duration = 300.; //Myr, duration of the lines


//set up the mvMatrix
function setmvMatrix0()
{
	mat4.identity(mvMatrix0);

	mat4.translate(mvMatrix0, camerapos);
	mat4.rotate(mvMatrix0, degToRad(yrot), [1, 0, 0]);
	mat4.rotate(mvMatrix0, degToRad(xrot), [0, 1, 0]);
}

//handle window resize event
function handleResize(event){
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	gl.viewportWidth = window.innerWidth;
	gl.viewportHeight = window.innerHeight;
	redraw = true;
	mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, zmin, zmax, pMatrix);

}

//handle Mouse events
function handleMouseDown(event) {
    mouseDown = true;
    redraw = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}
function handleMouseUp(event) {
    mouseDown = false;
}

function handleMouseMove(event) {    
    if (!mouseDown || event.target.id != "WebGL-canvas") {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX
    var deltaY = newY - lastMouseY;

    lastMouseX = newX
    lastMouseY = newY;
 
    var dxrot = 0.;
    var dyrot = 0.;
    var fac = 200.;
    dz = 0.;
    if (event.which == 1 || event.which == 3){
        dxrot = deltaX / canvas.width;
        dyrot = deltaY / canvas.height;
    } 
    //if (event.which == 2) {
    //    dz = deltaY * 10.;
    //}

    xrot += dxrot*fac;
    xrot = xrot % 360.;
    yrot += dyrot*fac;
    yrot = yrot % 360.;
    setmvMatrix0();
    redraw = true;
}

//https://stackoverflow.com/questions/34050929/3d-point-rotation-algorithm
function rotate(coord, pitch, roll, yaw) {
    var cosa = Math.cos(yaw);
    var sina = Math.sin(yaw);

    var cosb = Math.cos(pitch);
    var sinb = Math.sin(pitch);

    var cosc = Math.cos(roll);
    var sinc = Math.sin(roll);

    var Axx = cosa*cosb;
    var Axy = cosa*sinb*sinc - sina*cosc;
    var Axz = cosa*sinb*cosc + sina*sinc;

    var Ayx = sina*cosb;
    var Ayy = sina*sinb*sinc + cosa*cosc;
    var Ayz = sina*sinb*cosc - cosa*sinc;

    var Azx = -sinb;
    var Azy = cosb*sinc;
    var Azz = cosb*cosc;

    var px = coord[0];
    var py = coord[1];
    var pz = coord[2];
    var cout = [0., 0., 0];

    cout[0] = Axx*px + Axy*py + Axz*pz;
    cout[1] = Ayx*px + Ayy*py + Ayz*pz;
    cout[2] = Azx*px + Azy*py + Azz*pz;

    return cout;
}

//https://stackoverflow.com/questions/25204282/mousewheel-wheel-and-dommousescroll-in-javascript
function handleMouseWheel(event) 
{
    // Determine the direction of the scroll (< 0 = up, > 0 = down).
    var delta = ((event.deltaY || -event.wheelDelta || event.detail) >> 10) || 1;

    var dr = delta;
	camerapos[2] += dr;
	camerapos[2] = Math.min(zCamMax, Math.max(zCamMin, camerapos[2]));
    setmvMatrix0();
    redraw = true;
}


var textureloaded = false;
//functions to load and bind textures
function initTexture() {

    ttexture = gl.createTexture();
    ttexture.image = new Image();
    ttexture.image.onload = function() {
        handleLoadedTexture(ttexture)
    }
    ttexture.image.src = "textures/TimeUntilMerger.png"; 


    btexture = gl.createTexture();
    btexture.image = new Image();
    btexture.image.onload = function() {
        handleLoadedTexture(btexture)
    }
    btexture.image.src = "textures/Binary.png";

    mtexture = gl.createTexture();
    mtexture.image = new Image();
    mtexture.image.onload = function() {
        handleLoadedTexture(mtexture)
    }
	mtexture.image.src = "textures/singleStar.png"

    textureloaded = false;
    gtexture = gl.createTexture();
    gtexture.image = new Image();
    gtexture.image.onload = function() {
        handleLoadedTexture(gtexture)
    }
    gtexture.image.src = "textures/myS0Galaxy.png";

    //binding
    gl.uniform1i(shaderProgram.txtLocation, 2);
}

function handleLoadedTexture(texture) {
    //window.console.log("handleLoadedTexture " + texture.image.src);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try{
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    } catch (e) {}
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    //console.log(texture.image.src.slice(-14))
    if (texture.image.src.slice(-14) == "myS0Galaxy.png"){textureloaded = true;}

}

//initialize the shaders
function initShaders() {

    //Shader compilation
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, myVertexShader);
    gl.compileShader(vertexShader);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, myFragmentShader);
    gl.compileShader(fragmentShader);

    //vertexShader = createShaderFromScriptElement(gl, "vertex-shader");
    //fragmentShader = createShaderFromScriptElement(gl, "fragment-shader");
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    //Uniform location
    gl.bindAttribLocation(shaderProgram, 0, 'aVertexPosition');

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "color");
    shaderProgram.vScaleUniform = gl.getUniformLocation(shaderProgram, "uVertexScale");
    shaderProgram.oIDUniform = gl.getUniformLocation(shaderProgram, "oID");
    shaderProgram.zUniform = gl.getUniformLocation(shaderProgram, "zdist");
    shaderProgram.xrotUniform = gl.getUniformLocation(shaderProgram, "xrot");
    shaderProgram.yrotUniform = gl.getUniformLocation(shaderProgram, "yrot");
    shaderProgram.camZUniform = gl.getUniformLocation(shaderProgram, "cameraZ");
    shaderProgram.txtLocation = gl.getUniformLocation(shaderProgram, "texSampler"); 
    shaderProgram.ffacUniform = gl.getUniformLocation(shaderProgram, "fogfac");
    shaderProgram.useTexUniform = gl.getUniformLocation(shaderProgram, "usetex");
    shaderProgram.aspectUniform = gl.getUniformLocation(shaderProgram, "aspect");


}    

// for moving and rotating objects
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

// initialize the buffer(s) that contain the vertices
// this is just a simple quad (billboard)
function initQuad(xfac = 1., yfac = 1.) {

    vertices = [
         1.0*xfac,  1.0*yfac,  0.0,
        -1.0*xfac,  1.0*yfac,  0.0,
         1.0*xfac, -1.0*yfac,  0.0,
        -1.0*xfac, -1.0*yfac,  0.0
    ];
	gl.deleteBuffer(VertexPositionBuffer);
 	VertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VertexPositionBuffer);   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    VertexPositionBuffer.itemSize = 3;
    VertexPositionBuffer.numItems = 4;
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, VertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
}

function initCircle(xfac = 1., yrac = 1., endtheta = 2.*Math.PI, fill=false){
	vertices = [];
	var theta = 0.;
	var Ntheta = 100.;
	var	theta0 = Math.PI/2.; 
	for (var i=0; i<=Ntheta; i++){
		theta = endtheta*i/Ntheta + theta0;
		vertices.push(xfac * Math.cos(theta));
		vertices.push(yfac * Math.sin(theta));
		vertices.push(0.);
		if (fill && i % 2 == 0){
			vertices.push(0.);
			vertices.push(0.);
			vertices.push(0.);
		}
	}
 	gl.deleteBuffer(CirclePositionBuffer);   
    CirclePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, CirclePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    CirclePositionBuffer.itemSize = 3;
    CirclePositionBuffer.numItems = vertices.length/3.;
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
}



function initBNStimes(){

	var tmaxt = 0.;
	var tmint = 0.;

	//I will need to record when the SN happens

	//reset the times so that they all end at t=0
	for (var j=0; j<BNSkeys.length; j++){
		BNS[BNSkeys[j]].SNtime = 0.;
		//tmaxt = Math.max(...BNS[BNSkeys[j]].time);
        tmaxt = -1.e10;
        for (var i=0; i<BNS[BNSkeys[j]].time.length; i++){
            tmaxt = Math.max(tmaxt, BNS[BNSkeys[j]].time[i]);
        }
		for (var i=0; i<BNS[BNSkeys[j]].time.length; i++){
			if (BNS[BNSkeys[j]].time[i] == 0){
				BNS[BNSkeys[j]].SNtime = BNS[BNSkeys[j]].time[i] - tmaxt;
				BNS[BNSkeys[j]].SNindex = i;
			}
			BNS[BNSkeys[j]].time[i] -= tmaxt;

		}

	}

	//only plot one of these
	maxt = Math.max(...BNS[BNSkeyshow].time);
	mint = Math.min(...BNS[BNSkeyshow].time);

	time = mint;
	timeStart = mint;

}

//interpolate to the actual value
function getBNSnow(key, currentime){
	currentime = Math.min(currentime, 0.);
	var coord = null;
	var jmin = 0;
	var jmax = BNS[key].coordinates.length-1;
	for (var j=0; j< BNS[key].coordinates.length-1; j++){
		if (BNS[key].time[j] <= currentime && BNS[key].time[j+1] > currentime){
			jmin = j;
		}
		if (BNS[key].time[j] >= currentime){
			jmax = j;
			break;
		}

	}
	if (jmin < 0 || jmax < 0){
		//console.log("null at", jmin, jmax, currentime)
		return null
	}
	if (jmax == 0 && jmin != 0){
		//console.log("jmax = 0", currentime, jmin, jmax, key)
	}
	var coord = [];
	var c0 = BNS[key].coordinates[jmin];
	var c1 = BNS[key].coordinates[jmax];
	var m;
	if (jmin == jmax){
		coord = c0;
		coord.push(jmin);
		coord.push(jmax);
	} else {
		for (var j=0; j<3; j++){
			m = (c1[j] - c0[j])/(BNS[key].time[jmax] - BNS[key].time[jmin]);
			coord.push(m*(currentime - BNS[key].time[jmin]) + c0[j]);
		}
		coord.push(jmin);
		coord.push(jmax);
	}
	return coord;
}

function drawGalaxy(zdist, zval){
	gl.uniform1i(shaderProgram.oIDUniform, 1);

	var gsize = 22.5/camerapos[2]*zdist ;//size of 450 at zcamera = -25  
	
	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, camerapos);
    mat4.translate(mvMatrix, [-center[0], -center[1], -center[2] + zdist]);
    setMatrixUniforms();
    
    gl.uniform1f(shaderProgram.zUniform, zval);
    gl.uniform1f(shaderProgram.xrotUniform, xrot % 360.);
    gl.uniform1f(shaderProgram.yrotUniform, yrot % 360.);
	gl.uniform1f(shaderProgram.vScaleUniform, gsize);

	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, gtexture);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, VertexPositionBuffer.numItems);	 
}

function drawStar(coord, size, color){
	gl.uniform1i(shaderProgram.oIDUniform,2);

	gl.uniform1f(shaderProgram.vScaleUniform, size);
    gl.uniform4fv(shaderProgram.colorUniform, color);

	mvMatrix = mat4.create(mvMatrix0);
    mat4.translate(mvMatrix, [coord[0] - center[0], coord[1] - center[1], coord[2] - center[2]]);
    mat4.rotate(mvMatrix, degToRad(-xrot), [0, 1, 0]);
    mat4.rotate(mvMatrix, degToRad(-yrot), [1, 0, 0]);
    setMatrixUniforms();

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, VertexPositionBuffer.numItems);
}



function drawTimeCircle(rfac, tfac, xmove, ymove, alpha){
	gl.lineWidth(2);

    mat4.identity(pMatrix);

//circle
	gl.uniform1i(shaderProgram.oIDUniform, 10);
	gl.uniform1f(shaderProgram.vScaleUniform, 1.);
	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, [xmove, ymove, 0]);
	setMatrixUniforms();

	gl.uniform4fv(shaderProgram.colorUniform, [1.,1.,1.,alpha]);
	var aspect = gl.viewportWidth / gl.viewportHeight;
	initCircle(xfac = rfac, yfac = rfac*aspect);
	gl.drawArrays(gl.LINE_STRIP, 0, CirclePositionBuffer.numItems);


//filler
	gl.uniform1i(shaderProgram.oIDUniform, 10);
	gl.uniform1f(shaderProgram.vScaleUniform, 1.);
	gl.uniform4fv(shaderProgram.colorUniform, [1.,1.,1.,0.5*alpha]);
	initCircle(xfac = rfac, yfac = rfac*aspect, endtheta = 2.*Math.PI * tfac, fill = true);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, CirclePositionBuffer.numItems);



//text 
	gl.uniform1i(shaderProgram.oIDUniform, 6);
	gl.uniform1f(shaderProgram.vScaleUniform, 0.07);
	gl.uniform1f(shaderProgram.aspectUniform, aspect);
	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, [xmove, 0.8, 0.]);
	setMatrixUniforms();

	gl.uniform4fv(shaderProgram.colorUniform, [1.,1.,1.,alpha]);
	initQuad(xfac = 1., yfac = aspect);

	gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, ttexture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, VertexPositionBuffer.numItems);


//reset pMatrix
	mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, zmin, zmax, pMatrix);

}

function drawBNScircle(coord, oID=2, scale=0.5, color=[78./255., 42./255., 132./255., 1.]){

	gl.uniform1f(shaderProgram.vScaleUniform, scale);
   	gl.uniform1f(shaderProgram.useTexUniform, 1.);

	mvMatrix = mat4.create(mvMatrix0);
    mat4.translate(mvMatrix, [coord[0] - center[0], coord[1] - center[1], coord[2] - center[2]]);
    mat4.rotate(mvMatrix, degToRad(-xrot), [0, 1, 0]);
    mat4.rotate(mvMatrix, degToRad(-yrot), [1, 0, 0]);
    setMatrixUniforms();


	gl.uniform1i(shaderProgram.oIDUniform, oID);
	gl.uniform4fv(shaderProgram.colorUniform, color);
	
	if (oID == 2 || oID == 7 || oID == 8 || oID == 9){//stars, SNe, kilonovae and sGRB
    	gl.drawArrays(gl.TRIANGLE_STRIP, 0, VertexPositionBuffer.numItems);
	}

    if (oID == 5 && time < 0){
    	gl.activeTexture(gl.TEXTURE2);
    	gl.bindTexture(gl.TEXTURE_2D, btexture);
    	nblur = 10.;//20.
// spin the NS, and try for a motion blur effect
		if (nblur > 1) {
			var spinfac = 0.35;
			var theta0 = time*spinfac % (2.*Math.PI);
			var theta1 = theta0 + (dt*spinfac % (2.*Math.PI));
			var alpha0 = color[3];
		 	var dtheta = (theta1 - theta0) / nblur * 2.;
			mat4.rotate(mvMatrix, theta1-dtheta, [0, 0, 1]); 
			setMatrixUniforms();
			//console.log("theta", theta0, theta1, dtheta)
			for (var i=0; i<nblur; i++){
				//console.log("theta", theta, theta0, theta1, i)

		    	color[3] = alpha0 * (1. - Math.pow(i/nblur, 0.1));
				gl.uniform4fv(shaderProgram.colorUniform, color);
				if (i > 0){gl.uniform1f(shaderProgram.useTexUniform, 0.);}

				gl.drawArrays(gl.TRIANGLE_STRIP, 0, VertexPositionBuffer.numItems);

				mat4.rotate(mvMatrix, -dtheta, [0, 0, 1]); 
				setMatrixUniforms();
			} 
	 		
	 	} else {
 		    var theta = time*4. % (2.*Math.PI);
    		mat4.rotate(mvMatrix, theta, [0, 0, 1]); // spine the NS
    		setMatrixUniforms();

    		gl.uniform4fv(shaderProgram.colorUniform, color);
    		gl.drawArrays(gl.TRIANGLE_STRIP, 0, VertexPositionBuffer.numItems);
	    }
 		//redraw = false;
	} else {
    	gl.activeTexture(gl.TEXTURE2);
    	gl.bindTexture(gl.TEXTURE_2D, mtexture);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, VertexPositionBuffer.numItems);
	}


}

function initBNSBuffer(key){

    BNSvertices = [];
    for (var j=0; j< BNS[key].coordinates.length; j++){
        if ( (BNS[key].time[j] <= time) && (BNS[key].time[j] >= (time - duration))) {
            BNSvertices.push(BNS[key].coordinates[j][0]);
            BNSvertices.push(BNS[key].coordinates[j][1]);
            BNSvertices.push(BNS[key].coordinates[j][2]);
        }
        if (BNS[key].time[j] > time){
            break;
        }
    }
    BNSVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, BNSVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(BNSvertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
}

function drawBNSlines(){

    var color = [1., 0., 1., alphaLine];
    var NUcolor = [colorNU[0], colorNU[1], colorNU[2], 1.];
    gl.uniform1f(shaderProgram.vScaleUniform, 1.);

    mvMatrix = mat4.create(mvMatrix0);
    mat4.translate(mvMatrix, [-center[0], -center[1], -center[2]]);
    setMatrixUniforms();

//always draw the BNSkeyshow on top
    gl.lineWidth(5.*lthick);
    gl.uniform4fv(shaderProgram.colorUniform, NUcolor);
    gl.uniform1i(shaderProgram.oIDUniform, 4);
    initBNSBuffer(BNSkeyshow);
    gl.drawArrays(gl.LINE_STRIP, 0, BNSvertices.length/3);

    for (j=0; j< BNSkeys.length; j++){
    	if (BNSkeys[j] != BNSkeyshow){
		    gl.lineWidth(lthick);
		    gl.uniform4fv(shaderProgram.colorUniform, color);
		    gl.uniform1i(shaderProgram.oIDUniform, 3);
            initBNSBuffer(BNSkeys[j]);
            gl.drawArrays(gl.LINE_STRIP, 0, BNSvertices.length/3);
        }
    }

}

function drawScene() {

//oIDs
//1 == galaxy
//2 == stars
//3 == lines
//4 == line for BNSkeyshow
//5 == symbol for BNSkeyshow
//6 == text texture
//7 == SNe
//8 == GRB
//9 == kilonova
//10 == time bar

    gl.useProgram(shaderProgram);
	gl.uniform1f(shaderProgram.camZUniform, -camerapos[2]);
    gl.enable(gl.DEPTH_TEST);
	gl.uniform1f(shaderProgram.ffacUniform, 1.);


    var j=0;
    var i=0;
    //console.log(xrot,yrot, camerapos);

    var drawstr = true;
    var drawgal = true;
    var drawBNSl = true;

//gather all the coordinates and oIDs
    var coords = [];
    var c0 = [];
    var c1 = [];
    var c2 = [];
//the stars
	if (drawstr){
		c0 = [];
		c1 = [];
		c2 = [];
		var tang = 0;
		var rprojlim = 3.;//3.0;//2.8;
		for (j=0; j<stars.coordinates.length; j++){
			//progress along circular orbit
			//c0 = rotate(stars.coordinates[j], stars.theta[j], stars.phi[j], 2.*Math.PI * (time / stars.tcirc[j] % 1));
			//c1 = c0;//rotate(c0, 0., 0., 2.*Math.PI * (time / stars.tcirc[j] % 1) );;

			tang = (time / stars.tcirc[j] % 1);

			c0 = rotate(stars.coordinates[j],0,0,0);
			c1 = rotate(c0, stars.theta[j]*tang, stars.phi[j]*tang, 0.);

			//c0 = rotate(stars.coordinates[j], 0., 0., 2.*Math.PI * (time / stars.tcirc[j] % 1) );
			//c1 = rotate(c0, stars.theta[j], stars.phi[j], 0.);

			c2 = rotate(c1, degToRad(xrot), 0., 0.);
			c2 = rotate(c2, 0., degToRad(yrot), 0.);
			var rproj = Math.sqrt(c2[0]*c2[0] + c2[1]*c2[1]);
			if (rproj > rprojlim){
			//coords.push([c1[0], c1[1], c1[2], 0]);
				coords.push([c1[0], c1[1], c1[2], 2, c2[2]]);
			}
		}
	}


//symbol for BNSkeyshow, and also SN, GRB, kilonova
	var SNt = BNS[BNSkeyshow].SNtime;
	var tt;
	var rr;
	var ttv;
	var rrv;
	var jj;
	var jjj;
	var front;
	var back;
	if (time + dt/2. >= SNt){
		cc = getBNSnow(BNSkeyshow, time);

		if (cc != null){
			c1 = [cc[0], cc[1], cc[2]];
			c2 = rotate(c1, degToRad(xrot), 0., 0.);
			c2 = rotate(c2, 0., degToRad(yrot), 0.);
			if (time > SNt + dt/2){
				coords.push([c1[0], c1[1], c1[2], 5, c2[2]]);
			}
			//check for SNe
			if ( (SNt >= time - NSNframes*dt - dt/2. ) && (SNt <= time + NSNframes*dt + dt/2.) && (time != 0)){
				cc = getBNSnow(BNSkeyshow, SNt);
				c1 = [cc[0], cc[1], cc[2]];
				c2 = rotate(c1, degToRad(xrot), 0., 0.);
				c2 = rotate(c2, 0., degToRad(yrot), 0.);
				coords.push([c1[0], c1[1], c1[2], 7, c2[2] - 2.]); //moving backwards so it doesn't cover up the orbit
				if (time <= SNt){
					NSNft += 1.;
				} else {
					NSNft -= 1.;
				}
			}
			if (drawGRB){ //draw a random bunch of points and progess them along the jet
				cc = getBNSnow(BNSkeyshow, 0.);
				c1 = [cc[0], cc[1], cc[2]];
				c2 = rotate(c1, degToRad(xrot), 0., 0.);
				c2 = rotate(c2, 0., degToRad(yrot), 0.);
                var Ndv = (zmin - (c1[2] + camerapos[2]))/GRBspeed;
                xoffGRB = (GRBxy[0] - c1[0])/Ndv;
                yoffGRB = (GRBxy[1] - c1[1])/Ndv;

				for (j=0; j<GRBparts.length; j++){ // progress alon orbit
					for (i=0; i<3; i++){
						GRBparts[j][i] += GRBparts[j][i+3];
					}
				}
				if (NGRBft < NGRBframes){ // add more
	

					for (j=0; j< NGRBp; j++){

						tt = 2.*Math.PI*Math.random();
						ttv = 2.*Math.PI*Math.random();
						rr = GRBpsize*Math.random();
						rrv = GRBspread*Math.random();

						front = [c1[0] + rr*Math.cos(tt) + xoffGRB*j/NGRBp, c1[1] + rr*Math.sin(tt) + yoffGRB*j/NGRBp, c1[2] + GRBspeed*j/NGRBp,         rrv*Math.cos(tt) + xoffGRB, rrv*Math.sin(tt) + yoffGRB, GRBspeed, 1];   //x, y, z,        vx, vy, vz
						back = [c1[0] - rr*Math.cos(tt) - xoffGRB*j/NGRBp, c1[1] - rr*Math.sin(tt) - yoffGRB*j/NGRBp, c1[2] - 1.*GRBspeed*j/NGRBp,         -1.*rrv*Math.cos(tt) - xoffGRB, -1.*rrv*Math.sin(tt) - yoffGRB, -1.*GRBspeed, 0];   //x, y, z,        vx, vy, vz
						GRBparts.push(front);
						GRBparts.push(back);

					}



				}
				minGRBz = 1000;
				for (j=0; j<GRBparts.length; j++){
					c0 = [GRBparts[j][0], GRBparts[j][1], GRBparts[j][2]];
					c1 = rotate(c0, degToRad(xrot), 0., 0.);
					c1 = rotate(c1, 0., degToRad(yrot), 0.);
					//if (c1[2] > zmin && c1[2] < zmax){
					coords.push([c0[0], c0[1], c0[2], 8, c1[2]]);
					//}
					if (GRBparts[j][6] >0){minGRBz = Math.min(c0[2], minGRBz)};
				}
				NGRBft += 1.;
				//console.log("GRB",minGRBz, 0.5*Math.max( (1. - 0.2*NGRBft/NGRBframes), 0.));
			}
			if (drawkN){
				cc = getBNSnow(BNSkeyshow, 0.);
				c1 = [cc[0], cc[1], cc[2]];
				c2 = rotate(c1, degToRad(xrot), 0., 0.);
				c2 = rotate(c2, 0., degToRad(yrot), 0.);
				NkNft += 1.;
				if (NkNft >= 0){
					coords.push([c1[0], c1[1], c1[2], 9, c2[2] + 2.*(1. - Math.abs(NkNft - NkNframes)/NkNframes)]);//c2[2]]); // move forward then back
				}

				if (NkNft >= 2.*NkNframes){
					drawkN = false;
				}
				//console.log("kilonova",NkNft, 30.*(1. - Math.abs(NkNft - NkNframes)/NkNframes), c1);
			}
		}
	}




	

//sort the coords array by z
	coords.sort(function(a, b) {
  		return a[4] - b[4];
	});

//now plot them
//Galaxy (plotting as flat billboard well behind stars to avoid blending issues -- not great, but works here)
	initQuad();
	if (drawgal){
		drawGalaxy(-0.8*zmax, 0.); 
	}

//BNS lines
	if (drawBNSl){
	    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	    drawBNSlines();
	}


	initQuad();
	for (j=0; j<coords.length; j++){
		c0 = [coords[j][0], coords[j][1], coords[j][2]];
		switch( coords[j][3]){
			case 2: //stars
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
				drawStar(c0, stars.size[0], stars.color[0]); //of course this should be changed if different sizers and/or colors are desired
				break;
			case 5: //BNS circles
				gl.disable(gl.DEPTH_TEST);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
				drawBNScircle(c0, oID = 5);
				gl.enable(gl.DEPTH_TEST);
				break;
			case 7: //SNe
				//gl.disable(gl.DEPTH_TEST);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);//_MINUS_SRC_ALPHA);
				drawBNScircle(c0, oID = 7, size = 100.*NSNft/(NSNframes*dt), color = [1., 1., 0.8, 1.]);
				//gl.enable(gl.DEPTH_TEST);
				break;
			case 8: //sGRB
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);//_MINUS_SRC_ALPHA);
				drawBNScircle(c0, oID = 8, size = GRBpsize, color = [0.2, 0.2, 1., 1.]);
				break;
			case 9: //kilonova
				gl.disable(gl.DEPTH_TEST);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);//_MINUS_SRC_ALPHA);
				drawBNScircle(c0, oID = 9, size = 30.*(1. - Math.abs(NkNft - NkNframes)/NkNframes), color = [1., 197./255., 32./255., 1.]); //color = NUgold
				gl.enable(gl.DEPTH_TEST);
				break;

		}

	}


//time bar (plotting as flat billboard in front of everything)
	var tfac = Math.abs((timeStart - time) / timeStart);
	var rfac = 0.1;
	var alphafac = 1.;
//	drawTimeCircle(rfac, 1. - tfac, -0.87, 0.57, alphafac);


}

function initStars(){

	var Mgal = 53.38e9; //M_sun
	var a_bulge = 1.542; //kpc
	//var Gconst = 0.00449975332435 //pc3 / (Myr2 solMass) //print constants.G.to(units.parsec**3. / units.solMass) / units.Myr**2.)
	var Gconst = 4.49975332435e-12;// kpc3 / (Myr2 solMass)//print constants.G.to(units.kpc**3. / units.solMass / units.Myr**2.)
	stars.color = [];
	stars.size = [];
	stars.tcirc = [];
	stars.theta = [];
	stars.phi = [];
	var vcirc;
	var sign;
	for (var i=0; i<stars.coordinates.length;i++){
		stars.size.push(0.05);
		x = stars.coordinates[i][0]
		y = stars.coordinates[i][1]
		z = stars.coordinates[i][2]
		r = Math.sqrt(x*x + y*y + z*z); //kpc
		//define a circular orbit at a random orientation
		vcirc = Math.sqrt(Gconst * Mgal * r) / (r + a_bulge) ; //kpc/Myr
		stars.tcirc.push(2. * Math.PI * r / vcirc); //Myr
		sign = Math.random() < 0.5 ? -1 : 1;
		stars.theta.push( Math.random()*2.*Math.PI*sign);
		sign = Math.random() < 0.5 ? -1 : 1;
		stars.phi.push( (2.*Math.acos(Math.random()) - 1.)*sign);
		stars.color.push([1., 1., 0.5, 0.3]);//0.5 - (r/100.)]);
		//stars.color.push([1., 1., 0.0, 1.]);//0.5 - (r/100.)]);

	}
	//console.log(stars.theta, stars.phi);
}


function initGL() {
    try {
        //gl = getWebGLContext(canvas);
        gl = canvas.getContext("webgl", {
  			alpha: false  // no alpha in the backbuffer; necessary for rendering fi gl.ONE_MINUS_SRC_ALPHA
		});
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    	document.getElementById("errorDiv").innerHTML = "An error occurred.  This application cannot load."
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry !");
    }
}


function tick() {
	if (textureloaded && redraw){
	    //redraw = false;
	    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		drawScene();

//sGRB & kilonova
		//if (time > -1400 && NkNft < NkNframes){
		if (time >= 0 && NGRBft < NGRBframes){
			drawGRB = true;
		}
		if (time >= 0 && NkNft < NkNframes && minGRBz > 7){
			drawkN = true;
		}

        if (play){
    		if (time + dt < 0.){
    			time += dt;
    		} else {
    			time = 0.;
    		}
        }
        if (time == 0 && play){
            play = false;
            d3.select(".playPause").html("&#9654")
        }
	}

	requestAnimationFrame(tick);

}

/////////////////////////////////////////
// FOR UI

var UIhidden = false;
function hideUI(){
    var UI = document.getElementById("UIhider");
    var UIc = document.getElementsByClassName("UIcontainer")[0];
    var credit = document.getElementById("credit");

    if (UIhidden){
        UI.setAttribute("style","visibility: visible;");
        UIc.setAttribute("style","border-style: solid;");
        credit.setAttribute("style","visibility: visible; margin-top:10px");
        UIhidden = false;
    } else {
        UI.setAttribute("style","visibility: hidden;"); 
        UIc.setAttribute("style","border-style: none; margin-left:2px; margin-top:2px");
        if (infullscreen){
            credit.setAttribute("style","visibility: visible; margin-top:-490px");
        } else {
            credit.setAttribute("style","visibility: visible; margin-top:-520px");
        }
        UIhidden = true;    
    }
    

}
function hideSplash(){
    var fdur = 700.;

    var splash = d3.select("#splash");

    splash.transition()
        .ease(d3.easeLinear)
        .duration(fdur)
        .style("opacity", 0)
        .on("end", function(d){
            splash.style("display","none");
        })
    
    time = timeStart;


}
function createUI(){
//want to control:
// time (using circle?), and also a play, pause, restart, speed (=dt)
// alpha value for other lines
// line thickness?, color?
// which one to plot in purple (but always set the time to one in the movie?)
// add info about the chosen system (added to the input file)

    var UI = d3.select('#UI');

//time circle in here
//see this to select the position in the arc
//https://stackoverflow.com/questions/26499849/select-a-region-over-an-arc
    UI.append("div")
        .attr("class","timeText")
        .text("Time Until Merger");

//playpause
    UI.append('button')
        .attr('class','playPause')
        .on('click', playPause)
        .html("&#10074;&#10074")

    var rad = 70.; 
    var cx = rad + (100 - rad);
    var cy = 80.;

    var arc = d3.arc()
        .innerRadius(0)
        .outerRadius(rad)
        //.startAngle(2.*Math.PI);
        .endAngle(2.*Math.PI);

    var svg = UI.append("svg")
        .attr('class','timeDiv')
        .on("mouseup", mouseUp)
        .on("mousemove", mouseDown)
        .on("mousedown", mouseClick)

            
    var timearc = svg.append("path")
        .attr("transform", "translate(" + cx  + ", " + cy + ")")
        .datum({startAngle: 0.})
        .style("fill", "gray")   
        .attr("d", arc);

    d3.interval(function() {
        timearc.transition()
        .ease(d3.easeLinear)
        .duration(100)
        .attrTween("d", arcTween((1. - time/timeStart) * 2.*Math.PI));
    }, 10); 
    

    svg.append("circle")
        .attr("cx", cx)
        .attr("cy", cy) 
        .style("fill", "none")   
        .style("stroke", "white")
        .style("stroke-width", 3)
        .attr("r", rad)

//chosen system
    var sys = UI.append('div')
        .attr('class','UIDiv')
        .attr("style","height:90px")

        .append('div')
        .attr('class','sliderText')
        .html('Chosen System')

    sys.append('div')
        .attr('class','sysText')
        .attr('id','NSmasses')
        .attr("style","margin-top:10px")
        .html('Neutron Star Masses (M&#9737) : <br/>' + MNS1.toFixed(2) + ', ' + MNS2.toFixed(2))

    sys.append('div')
        .attr('class','sysText')
        .attr('id','NSvel')
        .html('Supernova kick velocity (km/s) : <br/>' + Vkick.toFixed(2));

    UI.append("button")
        .attr('id','nextSys')
        .attr('class','chooseSys')
        .on('click', advanceSys)
        .append('span')
        .html("&#8594");

    UI.append("button")
        .attr('id','prevSys')
        .attr('class','chooseSys')
        .attr('style','left:10px;')
        .on('click', advanceSys)
        .append('span')
        .html("&#8592");

//dt slider
    UI.append('div')
        .attr('class','UIDiv')

        .append('div')
        .attr('class','sliderText')
        .text('Animation Speed')

        .append('input')
        .attr('type', 'range')
        .attr('class', 'slider')
        .attr('id','dtSlider')
        .attr('min', '1')
        .attr('max', '100')
        .attr('value', dt)
        .attr('autocomplete','off');

    d3.select("#dtSlider").on("input", function() {
        dt = parseFloat(this.value);
    });

//alpha slider
    UI.append('div')
        .attr('class','UIDiv')

        .append('div')
        .attr('class','sliderText')
        .text('Line Transparency')

        .append('input')
        .attr('type', 'range')
        .attr('class', 'slider')
        .attr('id','alphaSlider')
        .attr('min', '0')
        .attr('max', '100')
        .attr('value', alphaLine*100.)
        .attr('autocomplete','off');

    d3.select("#alphaSlider").on("input", function() {
        alphaLine = parseFloat(this.value)/100.;
    });

//duration slider
//alpha slider
    UI.append('div')
        .attr('class','UIDiv')

        .append('div')
        .attr('class','sliderText')
        .text('Line Duration')

        .append('input')
        .attr('type', 'range')
        .attr('class', 'slider')
        .attr('id','durationSlider')
        .attr('min', '0')
        .attr('max', '100')
        .attr('value', 300.*100./ Math.abs(timeStart))
        .attr('autocomplete','off');

    d3.select("#durationSlider").on("input", function() {
        duration = parseFloat(this.value)/100. * Math.abs(timeStart);
    });


//full screen
    UI.append('button')
        .attr('class','showButton')
        .attr('id','fullScreenButton')
        .on('click', fullscreen)
        .append('span')
        .text('Fullscreen')

    UI.append("div")
        .attr("class","creditText")
        .attr("id","credit")
        .html("LIGO-Virgo / Aaron Geller / Northwestern");

//http://bl.ocks.org/mbostock/5100636
    function arcTween(newAngle) {
        return function(d) {
            var interpolate = d3.interpolate(d.startAngle, newAngle);
            return function(t) {
                d.startAngle = interpolate(t);
                return arc(d);
            };
        };
    }

    function playPause(){
        if (play){
            play = false;
            d3.select(".playPause").html("&#9654");
        } else{
            play = true;
            d3.select(".playPause").html("&#10074;&#10074");
            if (time == 0){
                time = timeStart;
                NGRBft = 0;
                NkNft = 0.;
                NSNft = 0.;
                drawGRB = false;
                drawKN = false;
                minGRBz = 0.;
                GRBparts = [];
            }
        }
    }

    function getSys(id){
        if (id == "nextSys"){
            BNSkeyshowi += 1;
        } else {
            BNSkeyshowi -= 1;
        }
        if (BNSkeyshowi >= BNSkeys.length){
            BNSkeyshowi = 0;
        }
        if (BNSkeyshowi < 0){
            BNSkeyshowi = BNSkeys.length -1;
        }
        BNSkeyshow = BNSkeys[BNSkeyshowi]; 
    }
    function advanceSys(){
        getSys(this.id);
        var Ntry = 0;
        while (BNS[BNSkeyshow].SNtime > time && Ntry < BNSkeys.length){
            getSys(this.id);
            Ntry += 1;
        }

        MNS1 = BNS[BNSkeyshow].MNS[0];
        MNS2 = BNS[BNSkeyshow].M2[0];
        Vkick = BNS[BNSkeyshow].Vkick[0];

        d3.select("#NSmasses").html('Neutron Star Masses (M&#9737) : <br/>' + MNS1.toFixed(2) + ', ' + MNS2.toFixed(2));
        d3.select("#NSvel").html('Supernova kick velocity (km/s) : <br/>' + Vkick.toFixed(2));

    }

/////to select the time within the circle
    var isMouseDown = false; // 
    function mouseDown(evt = null) {
        if (isMouseDown == false) {
            return;
        }
        if (evt == null){
            evt = this
        }
        var coordinates = [0, 0];
        coordinates = d3.mouse(evt);
        var x = coordinates[0] - cx;
        var y = coordinates[1] - cy;
        var r = Math.sqrt(x*x + y*y);
        if (r > rad/2.){
            var ang = Math.atan2(y,x) + Math.PI/2.;
            if (ang < 0){
                ang += 2.*Math.PI;
            }
            time = (1. - ang/(2.*Math.PI))*timeStart;
        }
    }
    function mouseClick() {
        isMouseDown = true;
        mouseDown(evt = this);
    }
    function mouseUp() {
        isMouseDown = false;
    }



}



////////////////////////////////////////////////
//on load
var stars;
var BNS;
function webGLStart() {

    // loader settings
    var opts = {
      lines: 15, // The number of lines to draw
      length: 30, // The length of each line
      width: 15, // The line thickness
      radius: 50, // The radius of the inner circle
      color: '#4E2A84', // #rgb or #rrggbb or array of colors
      speed: 1.5, // Rounds per second
      trail: 75, // Afterglow percentage
      className: 'spinner', // The CSS class to assign to the spinner
    };

    var target = document.getElementById("loader");

    // trigger loader
    var spinner = new Spinner(opts).spin(target);

    d3.json("data/stars.json",  function(starjson) {
        stars = starjson[0];

        d3.json("data/evolution_v2.json",  function(BNSjson) {
            BNS = BNSjson[0];

            // stop spin.js loader
            spinner.stop();

            //show the rest of the page
            d3.select("#hider").style("visibility","visible")

////////////////////
            //now everything else
            canvas = document.getElementById("WebGL-canvas");

            BNSkeys = Object.keys(BNS);
            BNSkeyshowi = 17;//"281"
            BNSkeyshow = BNSkeys[BNSkeyshowi]; 
            MNS1 = BNS[BNSkeyshow].MNS[0];
            MNS2 = BNS[BNSkeyshow].M2[0];
            Vkick = BNS[BNSkeyshow].Vkick[0];


           	initGL();
            initShaders();
            initTexture();

            setmvMatrix0();

            initStars();
            initBNStimes();

            createUI()

            gl.clearColor(0.0, 0.0, 0.0, 1.0);

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.preserveDrawingBuffer = false;
            canvas.onmousedown = handleMouseDown;
            document.onmousedown = handleMouseDown;
            document.onmouseup = handleMouseUp;
            document.onmousemove = handleMouseMove;
            canvas.addEventListener('wheel', handleMouseWheel);
            canvas.addEventListener('mousewheel', handleMouseWheel)
            canvas.addEventListener('DOMMouseScroll', handleMouseWheel);
            window.addEventListener("resize", handleResize);
            canvas.onwheel = function(event){ event.preventDefault(); };
            canvas.onmousewheel = function(event){ event.preventDefault(); };


            mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, zmin, zmax, pMatrix);

        	tick();
        });
    });
}

 