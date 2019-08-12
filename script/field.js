/*
field.js
@author 
*/

/* TO DO List:
LAYOUT
1.	establish min. screen size
2.	establish min. field size -- put in form_submit()
3. 	dynamic resize canvas

FUNCTIONALITY 	(required):
1.	Add surfaces!
	a.	background
	b.	tiling? blending?
2.	Make scales < pref_hatch_spacing smaller fonts/small caps
3.	Metric toggle switch (form submission)?
4.	change cursor to crosshair 
*/

/********************************** CLASSES *********************************/
/*  @class Session: 
 *  	Contains information for the current client session, including duration, field and
 *  view.  A Session can be processed, resumed or transferred in a linearizable fashion.*/
 // TO DO:  interpreter hook
function Session() {
	this.start = Date.now();
	
	this.curr_field = null;
	this.curr_view = -1;
	this.views = null;
}

/*	@class Unit: 
 *  	A class containing all of the information neccessary to work with real-
 *	world distance units.   */
function Unit(name, pluralForm, abbrev, factor) {
    this.name = name;
	this.plural = (pluralForm == null) ? this.name + "s" : pluralForm;
    this.abbrev = abbrev;
	this.factor = factor;
	
	return Object.freeze(this);
}

/*	@class Field: 
 *  	A data object representing an athletic field.  A 'field' here is defined 
 *	as a relatively flat* rectangular surface that can be modified.    */
function Field(field_unit, units, length, width, surface) {
	this.field_unit = field_unit;
	this.units = units;
	this.length = length;
	this.width = width;
	this.surface = surface;
	
	//Get the scale for each unit
	this.unit_scales = new Uint32Array(this.units.length);
	for (var i = 0, j = 1; i < this.units.length - 1; j *= this.units[i].factor) {
		this.unit_scales[i++] = j;
	}
	
	return this;
}

/*	@class View: 
 *  	A rectangular view of the current field at a specific size, coordinate and 
 *  zoom.  In addition a view contains a list of scales and rulers for each scale, which 
 *  will be calculated as needed by the user.
 *  NOTE:    Must be called after canvas_resize()	*/
function View(init_unit, x1, y1, x2, y2) {
	this.canvas_interval = [
		[x1,y1],
		[x2,y2]
	];
	
	this.curr_unit = init_unit;
	this.curr_scale = null;
	this.curr_ruler = null;
	this.factors = Array.apply(null, Array(current_session.curr_field.units.length)).map(function () {});
	this.scales = Array.apply(null, Array(current_session.curr_field.units.length)).map(function () {});
	
	//Initialize scales for initial unit
	this.initialize_scale();
	
	return this;
}

/*  initialize_scale: retrieves the ruler for a specific view, or calculates if it has 
 *      not been previously used.  */
View.prototype.initialize_scale = function() {
	if (this.scales[this.curr_unit] == null) {
		this.scales[this.curr_unit] = canvas_getScales(this);
		this.scales[this.curr_unit][1][this.curr_scale] = this.curr_ruler = canvas_getRuler(this);
	} else if (this.scales[this.curr_unit][1][this.curr_scale] == null) {
		this.scales[this.curr_unit][1][this.curr_scale] = this.curr_ruler = canvas_getRuler(this);
	}
};

/*********************************** CONSTANTS ******************************************/
//Metric (SI) unit system
var METRIC_UNITS = Object.freeze(
[new Unit("millimeter",	null, 		"mm",	1),
 new Unit("centimeter",	null,		"cm",	10),
 new Unit("meter",		null,		"m",	100),
 new Unit("kilometer",	null,		"km",	1000)]);

//Imperial unit system
var IMPERIAL_UNITS = Object.freeze(
[new Unit("inch",		"inches",	"⅟",		1),
 new Unit("inch",		"inches", 	"in",	16),
 new Unit("foot",		"feet",		"ft",	12),
 new Unit("yard",		null,		"yd",	3),
 new Unit("mile",		null,		"mi",	1760)]);

//References to canvas contexts
var BIG_CANVAS_CTX;
var LIL_CANVAS_CTX;

/********************************* USER SETTINGS ****************************************/
var current_session;               //The session currently active
var orientation;                   //Orientation, where -1/0/1 = portrait/square/landscape
var lw_reversed;                   //Length/width may be swapped internally for simplicity
var font_height;                   //Height corresponding to 1em
var canvas_offset_dim = [0,0];     //Left, top offset of an element
var canvas_unit_delta = [0,0];     //Change in units per pixel
var menu_current_dropdown = null;  //Menu (if any) whose contents are currently displayed
var draw_mode = null;              //Currently selected drawing tool
var draw_color = "#FFFFFF";        //Currently selected color
var draw_thickness = 1;            //Currently selected thickness

//NOTE: The follow three (3) variables are a temporary measure; functionality will be 
//      replaced by interp.js
var DEFAULT_HASH_SPACING = 5;
var TEMP_SURFACE_VAL = -1;
var settings = {
	canvas_grid_line_color:				'#000000',
	canvas_grid_line_enabled:			true,
	canvas_grid_line_opacity:			0.05,
	canvas_grid_line_thickness:			1.0,
	canvas_ruler_border_color:			'#FF0000',
	canvas_ruler_border_enabled:		true,
	canvas_ruler_border_thickness:		2.0,
	canvas_ruler_enabled:				true,
	canvas_ruler_hash_color:			'#000000',
	canvas_ruler_hash_enabled: 			true,
	canvas_ruler_hash_length_factor:	0.4,
	canvas_ruler_hash_opacity:			1.0,
	canvas_ruler_hash_thickness:		1.0,
	canvas_ruler_max_hash_spacing:		10,
	canvas_ruler_min_hash_spacing:		2,
	canvas_ruler_pref_hash_spacing:		5,
	canvas_ruler_x_axis_width:			50,	
	canvas_ruler_y_axis_width:			50
};

/*****************************************************************************************
*                                  Window functionality                                  *
*****************************************************************************************/
/*	window.onclick(): If clicked and e is NOT current menu, close element referred to by 
 * 		menu_current_dropdown.  */
window.onclick = function(e) {
	if (!e.target.matches('.dropdown-menu-button')) {
		menu_current_dropdown.classList.add('hidden');
		menu_current_dropdown = null;
	}
};

/*	window.onload():
 *  Initialize session. */
window.onload = function() {
	current_session = new Session();
	
	BIG_CANVAS_CTX = Object.freeze(document.getElementById('big-canvas').getContext('2d'));
	LIL_CANVAS_CTX = Object.freeze(document.getElementById('little-canvas').getContext('2d'));

	//Initially blank the canvas coordinate display
	document.getElementById('display-coords').innerHTML = '';
	
	//Add 'ommouseover' for when user has one menu button clicked and moves over another
	var buttons = document.getElementsByClassName('dropdown-menu-button');
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener('mouseover', function(e) {
			if ((menu_current_dropdown !== null) && (e.target !== menu_current_dropdown.previousSibling)) {
				menu_current_dropdown.classList.add('hidden');
				menu_current_dropdown = document.getElementById('sub' + e.target.id);
				toggle_dropdown(e.target, menu_current_dropdown);
			}
		});
	}
};

/*	window.onresize():	
 *  If window is resized, canvas must be redrawn.  (TO DO) */
window.onresize = function(event) {
    unsupported_operation();
	//canvas_resize();
};

/*****************************************************************************************
*                                   Form functionality                                   *
*****************************************************************************************/
/*	form_submit: Evaluate form input; display warning if input is unacceptable.	
 *  	If user-provided input is valid, initialize data and GUI elements/contents. */
function form_submit() { 
	var val,
		field_dim = [0,0];

	val = parseFloat(document.getElementById('text-length').value);	
	if (!isNaN(val) && (val > 0)) {
		field_dim[0] = val;
		
		val = parseFloat(document.getElementById('text-width').value);
		if (!isNaN(val) && (val > 0)) {
			var unit_sys, 
				unit_index = null,
				selectBox = document.getElementById('select-field-units'),
				text = selectBox.options[selectBox.selectedIndex].text;

			text = text.substring(0, text.indexOf(' '));
			
			//Internally, length must always be greater than or equal to width
			lw_reversed = val > field_dim[0];
			field_dim[1] = (lw_reversed) ? field_dim[0] : val;
			field_dim[0] = (lw_reversed) ? val : field_dim[0];
			
			document.getElementById('field-wrapper').classList.remove('hidden');
			document.getElementById('field-wrapper').style.display = 'grid';
			
			//Get unit system/index of unit and add to 
			selectBox = document.getElementById('select-canvas-units');
			unit_sys = (text.indexOf('meter') < 0) ? IMPERIAL_UNITS : METRIC_UNITS;
			
			for (val = 0; val < unit_sys.length; val++) {
				var opt = document.createElement('option');
				opt.value = val;
				opt.innerHTML = unit_sys[val].abbrev;
				selectBox.appendChild(opt);
								
				if (unit_sys[val].plural.localeCompare(text) === 0) {
					unit_index = val;
					selectBox.selectedIndex = unit_index;
				}
			}
			
			current_session.curr_field = new Field(unit_index, unit_sys, field_dim[0], field_dim[1], TEMP_SURFACE_VAL);
			field_to_string(current_session.curr_field);
			
			canvas_resize(current_session);
			canvas_to_string(current_session.curr_field);
			
			var init_view = new View(unit_index, 0, 0, field_dim[0] * current_session.curr_field.unit_scales[unit_index], field_dim[1] * current_session.curr_field.unit_scales[unit_index]);
			current_session.views = [init_view];
			current_session.curr_view = 0;
			
			if (settings.canvas_ruler_enabled) {
				canvas_drawRuler(init_view.curr_ruler, init_view.curr_unit, init_view.curr_scale, init_view.factors[init_view.curr_unit], init_view.canvas_interval);
			}
		} else {
			document.getElementById('form-warning').innerHTML = 'Invalid width value: must be a valid, nonnegative and nonzero number.';
			return null;
		}
	} else {
		document.getElementById('form-warning').innerHTML = 'Invalid length value: must be a valid, nonnegative and nonzero number.';
		return null;
	}
}

/*****************************************************************************************
*                                  Canvas functionality                                  *
*****************************************************************************************/
/* 	canvas_resize:   resizes canvas to fit screen.  Called whenever either,
 * 		A) form submitted (initial input), or 
 * 		B) display resized.    
 * 	@param {Session} session, the session being implemented. */
 //TO DO:   parameter necessary, or just use current_session?
function canvas_resize(session) {
	var h, w, ratio, border_width;

	//Get font height before we hide it
	font_height = document.getElementById('text-length').clientHeight;

	//Hide directions and display field designer
	document.getElementById('field-wrapper').style.display = 'grid';
	document.getElementById('directions-wrapper').style.display = 'none';
	
	//Size both canvas elements, then display them
	h = document.getElementById('center-box').clientHeight;
	w = document.getElementById('field-wrapper').clientWidth - 
		document.getElementById('west-box').offsetWidth - font_height - 1;
	
	//Aspect ratio = smaller dimension/larger dimension
	ratio = (session.curr_field.length > session.curr_field.width) ? 
		parseFloat(session.curr_field.width / session.curr_field.length) : 
		parseFloat(session.curr_field.length / session.curr_field.width);
	
	//Is screen orientation portrait/landscape/square
	if (window.innerHeight < window.innerWidth) {
		orientation = 1;
		
		if (parseFloat(w * ratio) >= h) {
			h = Math.floor(h - font_height);
			w = Math.floor(h * parseFloat(1 / ratio));
		} else {	
			h =  Math.floor(parseFloat(w * ratio));
		}
	} else if (window.innerHeight >= window.innerWidth) {
		orientation = (window.innerHeight === window.innerWidth) ? 0 : -1;
		
		if (parseFloat(h * ratio) >= w) {
			h = Math.floor((w * parseFloat(1 / ratio)));
			w = Math.floor(w - parseFloat(font_height * 0.67));	
		} else {
			w =  Math.floor(parseFloat(h * ratio));
		}
	}
	
	BIG_CANVAS_CTX.canvas.height = h;
	BIG_CANVAS_CTX.canvas.width = w;

	border_width = Math.ceil(0.175 * font_height);

	LIL_CANVAS_CTX.canvas.height = h - settings.canvas_ruler_x_axis_width - 1;
	LIL_CANVAS_CTX.canvas.width = w - settings.canvas_ruler_y_axis_width + 1;
	LIL_CANVAS_CTX.canvas.style.left = (border_width + settings.canvas_ruler_y_axis_width - 2) + 'px';
	LIL_CANVAS_CTX.canvas.style.top = (border_width + 1) + 'px';

	canvas_offset_dim = getTotalOffset(LIL_CANVAS_CTX.canvas);
}

/*	canvas_getScaleList: Get a list of appropriate scales to choose from and map it to the 
 *      view and unit provided.	
 *  @param {View} view, the current View for which the ruler is being calculated.
 *  @returns {scale list}, an array of key-value pairs.  
 *  	The key is a signed interger array (negative/positive depending on if key is less 
 *  	than/greater than or equal to 1:1), and the value is a pointer to the ruler for 
 *  	that scale.
 *  	Rulers are initially null; the first ruler chosen is the smallest (finest) one 
 *  	that can fit all of the unit intervals in the current View.  */
function canvas_getScales(view) {
	var intervals,
		interval_size,
		max_ruler_intervals,
		lessThanOne,
		factor = 1,
		ret;
	
	//Get the real-world interval size, and the interval size in pixels (on the shortest dimension)
	if (orientation < 0) {
		interval_size = (view.canvas_interval[1][0] - view.canvas_interval[0][0]) / 
                         current_session.curr_field.unit_scales[view.curr_unit];
		max_ruler_intervals = Math.floor(LIL_CANVAS_CTX.canvas.width / 
                              settings.canvas_ruler_pref_hash_spacing);
	} else {
		interval_size = (view.canvas_interval[1][1] - view.canvas_interval[0][1]) / 
                        current_session.curr_field.unit_scales[view.curr_unit];
		max_ruler_intervals = Math.floor(LIL_CANVAS_CTX.canvas.height / 
                              settings.canvas_ruler_pref_hash_spacing);
	}
	
	alert(interval_size + ", " + max_ruler_intervals + "..." + LIL_CANVAS_CTX.canvas.height);
	//Too many units to fit 1:1
	if (interval_size > max_ruler_intervals) {	
		//Break into factors of 100 or 1000?
		if (Math.floor(interval_size / 100) <= max_ruler_intervals) {
			if ((current_session.curr_field.units === METRIC_UNITS) || (view.curr_unit >= 2)) {
				//DEBUG alert('A');
				intervals = getFactors(100);
			} else {
				//DEBUG alert('B');
				intervals = getFactors(current_session.curr_field.units[view.curr_unit + 1].factor);
				factor *= 10;
			}
		} else {
			//DEBUG alert('C');
			intervals = getFactors(1000);
			for (; Math.floor(interval_size / (10 * factor * intervals[0])) < max_ruler_intervals; factor *= 10);
		}
		
		lessThanOne = true;
	//More than enough room for multiple fractions of unit per ruler interval
	} else {		
		if ((interval_size * 2) > max_ruler_intervals) {	//Can't even add half-marks
			//DEBUG alert('D');
			intervals = (interval_size <= 1000) ? getFactors(100) : getFactors(1000);
		} else {
			//DEBUG alert('E');
			intervals = (view.curr_unit > 0) ? getFactors(current_session.curr_field.units[view.curr_unit].factor * current_session.curr_field.units[view.curr_unit - 1].factor) :
									   	       getFactors(current_session.curr_field.units[view.curr_unit].factor);
		}
		
		lessThanOne = false;
	}	
	
    //Copy scales to array
	for (var i = 0; i < intervals.length; i++) {
		if (parseFloat(interval_size / (factor * intervals[i])) <= max_ruler_intervals) {		
			ret = new Int16Array(intervals.length);
			ret[0] = i;
			break;
		}
	}
	
	//Populate scales list
	var selectedScale = ret[0],
		selectBox = document.getElementById('select-canvas-scale');

	selectBox.options.length = 0;					//Clear scales dropdown box
	for (var i = 0; i < intervals.length; i++) {	//Now populate with current scales
		var opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = (lessThanOne) ? '1:' + intervals[i] : intervals[i] + ':1';
		selectBox.appendChild(opt);
		
		ret[i] = (lessThanOne) ? -1 * intervals[i] : intervals[i];
	}
	
	//Add option for addition of user-specified custom scales
	var opt = document.createElement('option');
	opt.value = intervals.length;
	opt.innerHTML = "...";
	selectBox.appendChild(opt);
	
	//Set current scale
	selectBox.selectedIndex = selectedScale;
	view.curr_scale = selectedScale;
	view.factors[view.curr_unit] = factor;

	return [ret, Array.apply(null, Array(current_session.curr_field.units.length)).map(function() {})];
}

/*	canvas_getRuler:	
 *  A 'ruler' is an unsigned integer array corresponding to the marks on a ruler, where 
 *  each successive interval (in increments of smallest units) represents a successively-
 *  longer/thicker hatch mark.
 *  E.g. 
 *      >10, 40, 200 would correspond to marks every 10, 40 and 200mm on a metric ruler.
 *      >192, 960, 1920 would correspond to marks every 1, 5, and 10 feet (192 being the 
 *       number of 1/16ths of an inch in each foot, and 960/1920 being multiples of 192).
 *  @param {View} view, the current View for which the ruler is being calculated.   */
function canvas_getRuler(view) {
	var intervals = [],
		interval_size = (orientation < 0) ? (view.canvas_interval[1][0] - view.canvas_interval[0][0]) :
											(view.canvas_interval[1][1] - view.canvas_interval[0][1]),
		scale = view.scales[view.curr_unit][0][view.curr_scale];
	
	//Scale is less than or equal to 1:1
	if (scale < 0) {
		var abs_scale = Math.abs(scale) * view.factors[view.curr_unit] * current_session.curr_field.unit_scales[view.curr_unit];
		alert(abs_scale + ", " + view.curr_unit + ", " + view.curr_scale);
		//Can fit at least one ruler on interval
		if (interval_size >= abs_scale) {
			alert('W');
			intervals.push(Math.abs(scale));
			for (var i = view.curr_scale, j = view.curr_scale + 1; j < view.scales[view.curr_unit][0].length; j++) {
				alert("[" + i + ", " + j + "] ... " + view.scales[view.curr_unit][0][i] + ", " + view.scales[view.curr_unit][0][j] + " ... " + intervals.toString());
				if ((view.scales[view.curr_unit][0][j] % view.scales[view.curr_unit][0][i]) == 0) {
					intervals.push(Math.abs(view.scales[view.curr_unit][0][j]));
					i = j;
				}
			}
			
		} else {
			alert('X');	
		}
	} else {
		if (interval_size >= scale) {
			alert('Y ' + scale + ", " + view.curr_unit + ", " + view.curr_scale);
			intervals.push(scale);
			
		} else {
			alert('Z');	
		}
	}
	
	alert("intervals: " + intervals);
	return new Uint16Array(intervals);
}

/*	canvas_drawRuler: draws a given ruler for a given view/context.	*/
function canvas_drawRuler(ruler, ruler_unit, ruler_scale, ruler_factor, ruler_interval) {
	var x,
		y, 
		delta,
		delta_pixels,
		max_length;

	//Set the interval increment amount for both axis
	delta = ruler_factor * current_session.curr_field.unit_scales[ruler_unit] * ruler[0];
	alert(delta);

	if (settings.canvas_ruler_border_enabled) {
		BIG_CANVAS_CTX.beginPath();
		BIG_CANVAS_CTX.strokeStyle = settings.canvas_ruler_border_color;
		BIG_CANVAS_CTX.lineWidth = settings.canvas_ruler_border_thickness;
		BIG_CANVAS_CTX.moveTo(settings.canvas_ruler_y_axis_width - 1, 0);
		BIG_CANVAS_CTX.lineTo(settings.canvas_ruler_y_axis_width - 1, BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width + 1);
		BIG_CANVAS_CTX.lineTo(BIG_CANVAS_CTX.canvas.width + 1, BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width + 1);
		BIG_CANVAS_CTX.stroke();
	}

	if (settings.canvas_ruler_hash_enabled) {	
		//Draw the hatch marks on the y-axis
		x = settings.canvas_ruler_y_axis_width - 2;
		y = BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width;
		max_length = parseFloat(settings.canvas_ruler_y_axis_width * settings.canvas_ruler_hash_length_factor);
		delta_pixels = parseFloat(LIL_CANVAS_CTX.canvas.height / ((ruler_interval[1][1] - ruler_interval[0][1]) / delta));
		canvas_unit_delta[1] = delta_pixels / ruler[0];
		
		for (var interval = ruler_interval[0][1]; interval < ruler_interval[1][1]; y -= delta_pixels, interval += delta) {
			var y_inc = 0.5,
				hash_length,
				hash_thickness = settings.canvas_ruler_hash_thickness,
				grid_thickness = settings.canvas_grid_line_thickness,
				grid_opacity = settings.canvas_grid_line_opacity;
	
			for (hash_length = 1; (hash_length < ruler.length) && ((parseFloat(interval / (ruler_factor * current_session.curr_field.unit_scales[ruler_unit])) % ruler[hash_length]) == 0); hash_length++);
				
			if ((delta_pixels >= settings.canvas_ruler_pref_hash_spacing) && (hash_length === ruler.length)) {
				y_inc = 0;
				hash_thickness++;
				grid_thickness++;
				grid_opacity *= 2;
			}
			
			if ((settings.canvas_grid_line_enabled) && (interval > ruler_interval[0][1])) {
				BIG_CANVAS_CTX.beginPath();
				BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_grid_line_color, grid_opacity);
				BIG_CANVAS_CTX.lineWidth = grid_thickness;
				BIG_CANVAS_CTX.moveTo(BIG_CANVAS_CTX.canvas.width, Math.floor(y) + y_inc);
				BIG_CANVAS_CTX.lineTo(settings.canvas_ruler_y_axis_width - 1, Math.floor(y) + y_inc);
				BIG_CANVAS_CTX.stroke();
				BIG_CANVAS_CTX.closePath();
			}
			
			hash_length *= parseFloat(1 / ruler.length);
			BIG_CANVAS_CTX.beginPath();
			BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_ruler_hash_color, settings.canvas_ruler_hash_opacity);
			BIG_CANVAS_CTX.lineWidth = hash_thickness;
			BIG_CANVAS_CTX.moveTo(x, Math.floor(y) + y_inc);
			BIG_CANVAS_CTX.lineTo(parseFloat(x - (max_length * hash_length)), Math.floor(y) + y_inc);
			BIG_CANVAS_CTX.stroke();
			BIG_CANVAS_CTX.closePath();
		}
		
		//Lastly, draw the x-axis hatch marks
		x = settings.canvas_ruler_y_axis_width - 1;
		y = BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width + 2;
		max_length = parseFloat(settings.canvas_ruler_x_axis_width * settings.canvas_ruler_hash_length_factor);
		delta_pixels = parseFloat(LIL_CANVAS_CTX.canvas.width / ((ruler_interval[1][0] - ruler_interval[0][0]) / delta));
		canvas_unit_delta[0] = delta_pixels / ruler[0];
	
		for (var interval = ruler_interval[0][0]; interval < ruler_interval[1][0]; x += delta_pixels, interval += delta) {
			var x_inc = 0.5,
				hash_length,
				hash_thickness = settings.canvas_ruler_hash_thickness,
				grid_thickness = settings.canvas_grid_line_thickness,
				grid_opacity = settings.canvas_grid_line_opacity;
		
			for (hash_length = 1; (hash_length < ruler.length) && ((parseFloat(interval / (ruler_factor * current_session.curr_field.unit_scales[ruler_unit])) % ruler[hash_length]) == 0); hash_length++);
			
			if ((delta_pixels >= settings.canvas_ruler_pref_hash_spacing) && (hash_length === ruler.length)) {
				x_inc = 0;
				hash_thickness++;
				grid_thickness++;
				grid_opacity *= 2;
			}
			
			if ((settings.canvas_grid_line_enabled) && (interval > ruler_interval[0][0])) {
				BIG_CANVAS_CTX.beginPath();
				BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_grid_line_color, grid_opacity);
				BIG_CANVAS_CTX.lineWidth = hash_thickness;
				BIG_CANVAS_CTX.moveTo(Math.floor(x) + x_inc, 0);
				BIG_CANVAS_CTX.lineTo(Math.floor(x) + x_inc, BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width);
				BIG_CANVAS_CTX.stroke();
				BIG_CANVAS_CTX.closePath();
			}
			
			hash_length *= parseFloat(1 / ruler.length);
			BIG_CANVAS_CTX.beginPath();
			BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_ruler_hash_color, settings.canvas_ruler_hash_opacity);
			BIG_CANVAS_CTX.lineWidth = hash_thickness;
			BIG_CANVAS_CTX.moveTo(Math.floor(x) + x_inc, y);
			BIG_CANVAS_CTX.lineTo(Math.floor(x) + x_inc, parseFloat(y + (max_length * hash_length)));
			BIG_CANVAS_CTX.stroke();
			BIG_CANVAS_CTX.closePath();
		}
	}
}

/*	canvas_zoomIn(): TO DO 	*/
function canvas_pan() {
	
}

/*	canvas_zoomIn(): TO DO 	*/
function canvas_zoomIn() {
	
}

/*	canvas_zoomOut(): TO DO 	*/
function canvas_zoomOut() {
	
}

/*	canvas_changeUnits(): TO DO 	*/
function canvas_changeUnits() {
	var view = current_session.views[current_session.curr_view];
	view.curr_unit = document.getElementById('select-canvas-units').selectedIndex;
	view.initialize_scale();
	
	BIG_CANVAS_CTX.clearRect(0, 0, BIG_CANVAS_CTX.canvas.width, BIG_CANVAS_CTX.canvas.height);
	canvas_drawRuler(view);
	LIL_CANVAS_CTX.canvas.focus();
}

/*	canvas_changeScaleType(): TO DO 	*/
function canvas_changeScaleType() {
	
}

/*	canvas_changeUnits(): TO DO 	*/
function canvas_changeScale() {
	var view = current_session.views[current_session.curr_view];
	
	if (document.getElementById('select-canvas-scale').selectedIndex < document.getElementById('select-canvas-scale').options.length - 1) {
		view.curr_scale = document.getElementById('select-canvas-scale').selectedIndex;
		
		if (view.scales[view.curr_unit][1][view.curr_scale] == null) {
			view.scales[view.curr_unit][1][view.curr_scale] = canvas_getRuler(view);
		}
		view.curr_ruler = view.scales[view.curr_unit][1][view.curr_scale];
		//alert("current ruler: " + view.curr_ruler);
	} else {
		var prompt_text = ["Please enter a scale separated by a colon (e.g. '1:4 or 2:3')", ""],
			val,
			parsed_val;
			
		do {
			val = prompt(prompt_text[0] + prompt_text[1], "").split(":");
			
			if (val.length !== 2) {
				prompt_text[1] = "\nInvalid entry; must be a valid ratio separated by a colon (':').";
			} else {
				parsed_val = parseFloat(val.pop());
				
				if (!isNaN(parsed_val) && (parsed_val > 0)) {
					val.push(parsed_val);
					parsed_val = parseFloat(val.pop());
					
					if (!isNaN(parsed_val) && (parsed_val > 0)) {
						val.push(parsed_val);
					} else {
						prompt_text[1] = "\nInvalid entry; must be a valid ratio separated by a colon (':').";
					}
				} else {
					prompt_text[1] = "\nInvalid entry; must be a valid ratio separated by a colon (':').";
				}
			}
						
		} while (input !== null);
		
		//alert(val.toString());
	}
	
	BIG_CANVAS_CTX.clearRect(0, 0, BIG_CANVAS_CTX.canvas.width, BIG_CANVAS_CTX.canvas.height);
	canvas_drawRuler(view.curr_ruler, view.curr_unit, view.curr_scale, view.factors[view.curr_unit], view.canvas_interval);
}

/*	Canvas mouse events		*/
/*	canvas_mouseMove(): TO DO 	*/
function canvas_mouseMove(e) {
	var x = Math.floor((e.clientX - canvas_offset_dim[0]) / canvas_unit_delta[0]);
	var y = Math.floor((LIL_CANVAS_CTX.canvas.height - (e.clientY - canvas_offset_dim[1]) - 1) / canvas_unit_delta[1]);
	
	document.getElementById('display-coords').innerHTML = x + ', ' + y;
}

/*	canvas_mouseOut(): TO DO 	*/
function canvas_mouseOut() {
	document.getElementById('display-coords').innerHTML = '';
}
/***************************************************************************************************************
*												Menu buttons
***************************************************************************************************************/
/***** File *****/
function menu_file_dropdown() {
	menu_current_dropdown = document.getElementById('submenu-file');
	toggle_dropdown(document.getElementById('menu-file'), menu_current_dropdown);
}

function submenu_file_new() {
	unsupported_operation();
}

function submenu_file_open() {
	unsupported_operation();
}
						
function submenu_file_close() {
	unsupported_operation();
}
						 
function submenu_file_save() {
	unsupported_operation();
}
						
function submenu_file_save_as() {
	unsupported_operation();
}
						
function submenu_file_import() {
	unsupported_operation();
}
						
function submenu_file_export() {
	unsupported_operation();
}
						
function submenu_file_exit() {
	unsupported_operation();
}		

/***** Edit *****/
function menu_edit_dropdown() {
	menu_current_dropdown = document.getElementById('submenu-edit');
	toggle_dropdown(document.getElementById('menu-edit'), menu_current_dropdown);
}

function submenu_edit_undo() {
	unsupported_operation();
}

function submenu_edit_redo() {
	unsupported_operation();
}

/***** View *****/
function menu_view_dropdown() {
	menu_current_dropdown = document.getElementById('submenu-view');
	toggle_dropdown(document.getElementById('menu-view'), menu_current_dropdown);
}

/***** Options *****/
function menu_options_dropdown() {
	menu_current_dropdown = document.getElementById('submenu-options');
	toggle_dropdown(document.getElementById('menu-options'), menu_current_dropdown);
}

function submenu_options_grid() {
	unsupported_operation();
}

function submenu_options_ruler() {
	unsupported_operation();
}

/***** Help *****/
function menu_help_dropdown() {
	menu_current_dropdown = document.getElementById('submenu-help');
	toggle_dropdown(document.getElementById('menu-help'), menu_current_dropdown);
}

function submenu_help_display() {
	unsupported_operation();
}

function submenu_help_commands() {
	unsupported_operation();
}

function submenu_help_about() {
	unsupported_operation();
}

/*	toggle_dropdown():	TO DO	*/
function toggle_dropdown(menu_button, submenu) {
	if (submenu.classList.contains('hidden')) {
		submenu.style.left = menu_button.offsetLeft + "px";
		submenu.style.top = menu_button.clientTop + menu_button.clientHeight + "px";
		submenu.classList.remove('hidden');
	} else {
		submenu.classList.add('hidden');
	}
}

/*	Top icon menu*/
/*	menu_draw_line():	TO DO	*/
function menu_draw_line() {
	unsupported_operation();
}

/*	menu_draw_arc():	TO DO	*/
function menu_draw_arc() {
	unsupported_operation();
}

/*	menu_draw_rect():	TO DO	*/
function menu_draw_rect() {
	unsupported_operation();
}

/*	menu_draw_circle():	TO DO	*/
function menu_draw_circle() {
	unsupported_operation();
}

/*	menu_draw_poly_line():	TO DO	*/
function menu_draw_poly_line() {
	unsupported_operation();
}

/*	menu_pick_thickness():	TO DO	*/
function menu_pick_thickness() {
	unsupported_operation();
}

/*	menu_pick_color():	TO DO	*/
function menu_pick_color() {
	unsupported_operation();
}

/*	toggleConsole():	TO DO	*/
function toggleConsole() {
	document.getElementById('text-console').classList.contains('hidden') ? document.getElementById("text-console").classList.remove('hidden') : 
																		   document.getElementById("text-console").classList.add('hidden');
}
/***************************************************************************************************************
*											Utility functions
***************************************************************************************************************/
/* 	getFactors(): calculates all positive integer factors of a number n between one and n 
 *  (inclusive).
 *  @param {number} num, a positive integer. 	
 *  @param {number} starting_val (optional), a positive integer between 1 and num.  If no
 *  	second parameter is provided, then the starting value is presumed to be 1.
 *  @returns {array} an array of sorted integers corresponding to the factors of num.*/
function getFactors(num, starting_val) {
    var mid = Math.floor(num / 2),
        factors = [1, num],
        i, j, k;
		
	//Determine our increment value for the loop and starting point.
    if (num % 2 === 0) {
		i = 2;
		j = (starting_val == null) ? 1 : starting_val;
	} else {
		i = 3;
		j = (starting_val == null) ? 2 : starting_val;
	}

    for (; i <= mid; i += j) {
		if (num % i === 0) {
			k = 0;
			while ((k < factors.length) && (factors[k] < i)) {
				k++;
			}
			
			factors.splice(k, 0, i);
		}
    }

  	return factors;
}

/*  getTotalOffset(): determines the total left and top offset of an element by adding the
 *  offset of successive parent containers until the root parent container is reached.
 *  @param {element} elem, the
 *  @returns {array} a length-2 array of positive integers corresponding to the total 
 *  respective left and top offset of the element parameter (in pixels). */
function getTotalOffset(elem) {
	var a = elem, 
		b = 0, 
		c = 0;
	
	while (a) {
		b += a.offsetLeft;
		c += a.offsetTop;
		a = a.offsetParent;
	}
	
	return [b, c];
}

/*	toRGBA():   converts a long-typed color value to its RGBA equivalent.
 *  @param {number} color, a valid color between #000000 and #FFFFFF.
 *  @param {number} alpha, a valid positive float value between 0.0 and 1.0.
 *  @returns {string} a string with the parameterized values in rgba(r,g,b,a) form, (such 
 *  that can be understood in the context of changes to an element's style).   */
function toRGBA(color, alpha) {
	var r = (color >> 16) & 255,
		g = (color >> 8) & 255,
		b = color & 255;
	return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

/*****************************************************************************************
*                                      DEBUG                                             *
*                              (remove before release)                                   *
*****************************************************************************************/
function unsupported_operation() {
	alert("This feature is not yet supported.\n" +
          "If you are debugging, and you think that this is a bug, please report it!" +
          "\n\nThank you for your help!");
}

function field_to_string(field) {
	alert("field: " + field.field_unit + ", [" + field.width + ", " + field.length + "]");
}

function canvas_to_string(field) {
	alert("canvas: " + LIL_CANVAS_CTX.canvas.width + ", " + LIL_CANVAS_CTX.canvas.height + ", [" + field.width + ", " + field.length + "]");
}

function view_to_string(view) {
	alert("canvas interval: [(" + view.canvas_interval[0,0] + ", " + view.canvas_interval[0,1] + "), (" + view.canvas_interval[1,0] + ", " + view.canvas_interval[1,1] + ")], scale: " + view.unit_scale);
}