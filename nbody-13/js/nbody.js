/*
 * --------------------------------------
 *   nBody n^2 Numerical Simulation
 * --------------------------------------
 *
 *   This simulation approximates the three body problem
 *   by numerically comparing the forces and interactions
 *   of a set of bodies and updating a graphical 2D-Projection
 *   frame by frame after comparing each body to each other body.
 *   These equations are very hard to optimize without losing
 *   precision, and become prohibitively expensive, very fast,
 *   since the processing load grows exponentially with the
 *   amount of bodies to simulate.
 *
 *   The simulation currently uses newtonian physics only,
 *   which causes imprecise results for very high speeds
 *   and very close distances. (Relativistic behaviour)
 *
 *   This Iteration does limit attraction calculations to
 *   distances below 500px to conserve processing power.
 *   a better solution would be to group distant objects
 *   into meta-objects and still calculate overall attractions.
 *
 *   Simulate merging visual:
 *   move both bodies to the weighted center of dist(pBody, aBody)
 *   weighted by the radius of the larger body
 *   gradually shrink the smaller and gro the larger body
 *   this may shift the weighted center. test visual!
 *
 */


/*
 * --------------------------------------
 *   TODOS
 * --------------------------------------
 *
 *   - Paint in Off-DOM canvases, merge and copy png into visible canvas
 *   - Shift Floats by 100.000.000 for precision
 *   - Timeshift
 *      - Add a time multiplier variable to main calc.
 *      - Add a slider that controls simulation speed
 *        +/-/0, shift, ctrl keybinding
 *      - Automatically match simulation speed to processor load/frame
 *   - Zoom
 *      - Button: Center on heaviest object
 *        This requires:
 *         - Coordinate system offset
 *         - Frame by frame redrawing of offset
 *   - HDR Bloom
 *   - Main sequence for heavy bodies
 *   - JSON Export
 *   - Infinite Spherical 2D-Universe
 *      - We could add 4 additional attraction vectors,
 *        and effectively mirror the universe in x and y twice
 *      - How can this be calculated more efficiently?
 *   - Spawn on MouseDown
 *      - Directed emission on mousedrag + mousedown
 *   - Dynamic Time per Body
 *      - Energy is lost due to low precision newtonian physics
 *        Fast movers are not calculated precise enough/
 *        often enough per way travelled, this makes the system
 *        lose net energy.
 *   - Density & Ignition
 *      - We can calculate Density using an exponential equation
 *        that will provide squared values, starting at 1. This
 *        we use as a divider in the radius calculation to simulate
 *        collapse. We also use this in the color calculation to
 *        simulate ignition.
 *   - Complex Collisions
 *      - Correct collision calculation using impulse and momentum
 *      - Gradual absorption
 *        Impact force determines absorption speed
 *      - Mild Bounceback
 *      - Impact Angle calculation
 *        By drawing a vertical through the larger body's center,
 *        and measuring the distance between the cross section
 *        between it and the infinite parallel of the impulse vector
 *        of the smaller body, we can determine how far off center
 *        the impact occured.
 *      - Cohesion
 *         - We can use Density to approximate cohesion. Cohesion is
 *           part of the complex collision problem and is used to
 *           calculate impact behaviour, ejected material and shattering.
 *      - Impact Fracturing
 *         - Impacts shatter objects if the impact force is larger
 *           than the cohesion.
 *         - The size of objects spawned is determined by the impact
 *           force, and always adds up to 100% of the previous body.
 *      - Material Ejection
 *        This requires research. How can ejections be expressed?
 *
 */

/*
 * --------------------------------------
 *   SETUP AND INITIALIZATION
 * --------------------------------------
 */

// Setting Up Stats Panel
var stats = new Stats();
stats.showPanel( 1 );
document.body.appendChild( stats.dom );
var debug = document.getElementById('debug');

// Setting Up Output Panel
function output(value) {
    debug.innerHTML = value;
    return true;
}

// Constants
var N_INITIAL = 750;     // Number of bodies
var G = 0.0667408;       // Gravitational constant - modify this to modulate gravitational strength
var INERTIA = 1;         // Inertia multiplier - this is a hack!
var TIME = 1;            // Time multiplier - modify to modulate time flow
var CLR = 350;            // clear constant; every CLRth iteration, the screen is cleared with opaque black.

// Init Variables
var viewW = window.innerWidth;           // viewport width, not updated!
var viewH = window.innerHeight;          // viewport height, not updated!
var offsetX = viewW/2;
var offsetY = viewH/2;
var scale = 1;
var nbody = [];          // nbody array, contains all simulated bodies
var n = N_INITIAL;       // n is the current length of the array, and initially equal to N_INITIAL
var clear = 0;           // counts from 0 to CLR

// these variables are used only in specific contexts but are created globally to reduce latency in high speed loops
var thisBody, pBody, aBody, color, isPBody, sumDX, sumDY;

// Init Canvases
var canvas0 = document.getElementById("primary-canvas");
var ctx0 = canvas0.getContext("2d");
ctx0.canvas.width  = viewW;
ctx0.canvas.height = viewH;

var canvas1 = document.getElementById("secondary-canvas");
var ctx1 = canvas1.getContext("2d");
ctx1.canvas.width  = viewW;
ctx1.canvas.height = viewH;

// Populate N-Body Array
for (var i = 0; i < n; i++) {
    var myMass = 2 + Math.random() * 10;
    nbody.push({
        x: (Math.random() * viewW) - viewW/2,
        y: (Math.random() * viewH) - viewH/2,
        iStr: Math.random() * 15,
        iAng: Math.random() * Math.PI * 2,
        mass: myMass,
        radius: radius(myMass),
        untouchable: 0,
        colliding: 0
    });
}


// Vector Math Functions

function dist(x1, y1, x2, y2) {  // works, delivers always positive value
    return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
}

function radian(x1, y1, x2, y2) {
    return Math.atan2(x2 - x1, y2 - y1); // In radians, bottom is 0, top is 3.1415
}

function deltaX (angle, strength) {
    return Math.cos(angle) * strength; // turns angular vector into x delta coordinate
}

function deltaY (angle, strength) {
    return Math.sin(angle) * strength; // turns angular vector into y delta coordinate
}

function grav(m1, m2, dist) {
    //return (m * g) / Math.pow(dist, 2);
    return (G * m1 * m2) / Math.pow(dist, 2);
}

function radius(m) {
    // it would be nice to calculate density, but one challenge at a time.
    // density could be a multiplier that delivers a value that grows very slowly and then increases enormously at large m values
    // combined with luminosity and radiation pressure, simulating stars would become feasible.
    // not sure how to incorporate more than the main sequence of star development: https://de.wikipedia.org/wiki/Hauptreihe#/media/File:HRDiagram.png

    return Math.sqrt(m/Math.PI); // this assumes mass is f(x) = x of the surface area and returns the radius. iff mass increases density, insert factor here.
}

function density(m) {
    // Density is an arbitrary calculation based on an exponential equation.
    // y = 0.1 * x^2 + 1        modify the x multiplier to strengthen or weaken the effect.
    // This can be used to calculate compression of heavy bodies and ignition of super heavy bodies.

    return 0.1 * (m * m) + 1;
}


/*
 * --------------------------------------
 *   FUNCTIONS
 * --------------------------------------
 */

function clearCanvas(context, opaque) {
    if (opaque) {
        // opaqueness is created by a relatively intransparent clear effect and a clear counter, only working it every CLR iterations. this reduces grey traces.
        if (clear == CLR) {
            context.fillStyle='rgba(0,0,0,.1)'
            context.fillRect(0, 0, viewW, viewH);
            clear = 0;
        }
    } else {
        context.clearRect(0, 0, viewW, viewH);
    }
}

function drawBody(which) {
    thisBody = nbody[which];
    if (thisBody) {
        color = 'hsl('+thisBody.iStr/(thisBody.mass*INERTIA)*100+','+thisBody.iStr*60+'%, '+(thisBody.mass/4+40)+'%)';

        // Tracer
        ctx0.beginPath();
        ctx0.arc(thisBody.x * scale + offsetX,thisBody.y * scale + offsetY,.05,0,2*Math.PI);
        ctx0.strokeStyle = color;
        ctx0.fillStyle = color;
        ctx0.fill();
        ctx0.stroke();

        // Body
        ctx1.beginPath();
        ctx1.arc(thisBody.x * scale + offsetX, thisBody.y * scale + offsetY, thisBody.radius * scale,0,2*Math.PI);
        ctx1.strokeStyle = color;
        ctx1.fillStyle = color;
        ctx1.fill();
        ctx1.stroke();

    }
}

function mergeBodies(i, j) {

    // this routine regularly compares a body against itself, due to the shifts in the array.
    // since this simulation uses random masses, it will be highly unlikely that two bodies will
    // randomly have the exact same mass. so as a dirty fix, we do only merge bodies of non equal masses.
    if (pBody.mass > aBody.mass) {

        pBody.mass += aBody.mass;
        pBody.radius = radius(pBody.mass);
        sumDX = deltaX(pBody.iAng, pBody.iStr) + deltaX(aBody.iAng, aBody.iStr)
        sumDY = deltaY(pBody.iAng, pBody.iStr) + deltaY(aBody.iAng, aBody.iStr);
        pBody.iStr = dist(pBody.x, pBody.y, pBody.x + sumDX, pBody.y + sumDY);
        pBody.iAng = Math.PI * .5 - radian(pBody.x, pBody.y, pBody.x + sumDX, pBody.y + sumDY);

        //removing item by filtering array
        nbody = nbody.filter(c=>c!==nbody[j]);

    } else if (pBody.mass > aBody.mass) {

        aBody.mass += pBody.mass;
        aBody.radius = radius(aBody.mass);
        sumDX = deltaX(aBody.iAng, aBody.iStr) + deltaX(pBody.iAng, pBody.iStr)
        sumDY = deltaY(aBody.iAng, aBody.iStr) + deltaY(pBody.iAng, pBody.iStr);
        aBody.iStr = dist(aBody.x, aBody.y, aBody.x + sumDX, aBody.y + sumDY);
        aBody.iAng = Math.PI * .5 - radian(aBody.x, aBody.y, aBody.x + sumDX, aBody.y + sumDY);

        //removing item by filtering array
        nbody = nbody.filter(c=>c!==nbody[i]);
    }

    n = nbody.length;
}

// Click for Spawn
// change to trigger state on mousedown and remove state on mouseup for continuous spawn.
window.addEventListener('mousedown', function(event) {
    var myMass = 2 + Math.random() * 10;

    // x and y should also consider zoom level!
    nbody.push({
        x: event.clientX - viewW/2,
        y: event.clientY - viewH/2,
        iStr: 15 + Math.random() * 15,
        iAng: Math.random() * Math.PI * 2,
        mass: myMass,
        radius: radius(myMass),
        untouchable: 10
    });
    n = nbody.length;
    console.log(nbody[n-1]);
}, false);


// Scroll for Zoom
window.addEventListener('wheel', function(event) {
    var delta;
    if (event.wheelDelta){
        delta = event.wheelDelta;
        setZoom(delta, event);
    }else{
        delta = -1 * event.deltaY;
        setZoom(delta, event);
    }
    //setZoom(delta, window.event);
});

function setZoom(delta, mouse) {
    if (delta < 0 ) {
        // down
        scale *= 1.1;
    } else if (delta > 0 ) {
        // up
        scale *= 0.9;
    }

    // clear tracer canvas
    ctx0.clearRect(0, 0, viewW, viewH);

}


/*
 * --------------------------------------
 *   UPDATE FUNCTION
 * --------------------------------------
 */

function update() {
    output(n);

    // clear canvases
    clearCanvas(ctx0, true);
    clearCanvas(ctx1, false);


    // Outer Loop
    // ------------
    // we iterate through all bodies and for each we check what forces are applied by all other bodies
    for (var i = 0; i < n; i++) {
        pBody = nbody[i];

        if (pBody.untouchable == 0) {

            // Inner Loop
            // ------------
            // here we iterate through all bodies for each passive body and calculate forces on the passive body.
            for (var j = 0; j < n; j++) {
                aBody = nbody[j];

                if (aBody.untouchable == 0) {

                    // calculate distance vector between pBody and aBody
                    var thisDistance = dist(pBody.x, pBody.y, aBody.x, aBody.y);

                    // prevent calculating attraction of a body on itself. (would be infinite because 0 distance)
                    // prevent attraction Calc for distances > 500px.
                    // this is a dirty performance fix!
                    if ((i != j) && (thisDistance <= viewH * .75)) {

                        // This prevents NaN, undefined and false values for thisDistance
                        // The next line returns the expression to the right if the left side is falsy
                        thisDistance = thisDistance || 0;

                        // collision check, tests for touching bodies
                        if (thisDistance >= (pBody.radius + aBody.radius) ) {

                            // No Collision
                            // --------------

                            // calculate radian for distance vector between pBody and aBody
                            var thisRadian = radian(pBody.x, pBody.y, aBody.x, aBody.y);
                            // calculate attraction vector for aBody's effect on pBody
                            // This vector is only affecting pBody!
                            var thisAttraction = grav(pBody.mass, aBody.mass, thisDistance);

                            // draw attraction vector from aBody to pBody
                            // for some reason, deltaX and Y need to be reversed. #bug #bugfix
                            var attractionX = deltaY(thisRadian, thisAttraction);
                            var attractionY = deltaX(thisRadian, thisAttraction);

                            // Calculate vector product of pBody impulse vector and attraction vecor
                            var aStr = dist(pBody.x, pBody.y, pBody.x + deltaX(pBody.iAng, pBody.iStr) + attractionX, pBody.y + deltaY(pBody.iAng, pBody.iStr) + attractionY);
                            var aAng = Math.PI * .5 - radian(pBody.x, pBody.y, pBody.x + deltaX(pBody.iAng, pBody.iStr) + attractionX, pBody.y + deltaY(pBody.iAng, pBody.iStr) + attractionY);

                            // update pBody attraction vector.
                            // can't be done as part of the before statement because the aAng line references the previous pBody.iStr value!

                            pBody.iStr = aStr;
                            pBody.iAng = aAng;

                        } else {

                            // Collision
                            // -----------

                            // find out which is the larger object, that one will eat the smaller one.
                            // eventually, we'll do this gradually for a smoother visual effect.
                            // we could even simulate explosive collisions, but we need a cohesion calculation,
                            // based on impulse, mass and density as a simplified model.

                            mergeBodies(i, j);

                            pBody.iStr *= .9999999;
                        }

                    }

                }
            }
        }



        // Update Positions
        // updates x,y position based on impulse vector.
        pBody.x += deltaX(pBody.iAng, (pBody.iStr/2) / (pBody.mass * INERTIA));
        pBody.y += deltaY(pBody.iAng, (pBody.iStr/2) / (pBody.mass * INERTIA));

        drawBody(i);

        if (pBody.untouchable > 0) {
            pBody.untouchable--;
        }
    }

    // increment clear counter for opaque tracers
    clear++;
}



/*
 * --------------------------------------
 *   ANIMATION FRAME LOOP
 * --------------------------------------
 */


function animate() {

    stats.begin();

    update();

    stats.end();

    requestAnimationFrame( animate );

  }

  animate();


/*
 * --------------------------------------
 *   DOWNLOAD POSITIONS TO JSON
 * --------------------------------------
 */

function downloadJSON(){
  var nbody_json = JSON.stringify(nbody);
  var link = document.getElementById('downloadJSON');
  var data = "data:text/json;charset=utf-8," + nbody_json;

  link.setAttribute('href', data);
  link.setAttribute('download', 'nbody-export.json');
}

function showUpload() {
  var form = document.getElementById('uploadForm');
  form.style.display = "block";
}

console.log("OLD", nbody);
function uploadJSON() {
  var textarea = document.getElementById('uploadTextarea').value;
  var nbody = JSON.parse('[' + textarea + ']');
  console.log("new", nbody);
  return nbody;
  animate();

}
