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
var CLR = 150;            // clear constant; every CLRth iteration, the screen is cleared with opaque black.

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
