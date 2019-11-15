/*  ╔════════════════════════════════════════════════════════════════════════════════════════════════╗
 *  ║ field.js                                                                               v 0.6.1 ║
 *  ║ Web client for designing markings for athletic fields and exporting as an SVG.                 ║
 *  ║                                                                                                ║
 *  ║ Licensed under the GNU GPL v3.0 @ https://github.com/snealblim/field/blob/master/LICENSE       ║ 
 *  ╠════════════════════════════════════════════════════════════════════════════════════════════════╣
 *  ║                                   by Samuel 'teer' Neal-Blim                                   ║
 *  ║                               site: http://www.prog.nealblim.com                               ║
 *  ║                           git:  https://github.com/snealblim/field.js/                         ║
 *  ╚════════════════════════════════════════════════════════════════════════════════════════════════╝
/* 
TO DO List:
LAYOUT
1.	establish min. screen size
2.	establish min. field size -- put in form_submit()
3. 	dynamic resize canvas

FUNCTIONALITY 	(required):
1.	Add surfaces!
	a.	background
	b.	tiling? blending?
2.	Make scales < pref_hatch_spacing smaller fonts/small caps
3.	Metric toggle switch (form submission)
4.	change cursor to crosshair 
*/

/********************************** CLASSES *********************************/
/*	@class Field: 
 *  	A data object representing an athletic field.  A 'field' here is defined 
 *	as a relatively flat* rectangular surface that can be modified.    */
function Field(field_unit, unit_system, length, width, surface) {
	this.field_unit = field_unit;
	this.units = unit_system;
	this.length = length;
	this.width = width;
	this.surface = surface;
    
	//Get the scale for each unit
	this.unit_scales = new Uint32Array(this.units.length);
	for (var i = 0, j = 1; i < this.units.length; i++) {
		j *= this.units[i].factor;
		this.unit_scales[i] = j;
	}
	
	return this;
}

/*  @class Session: 
 *  	Contains information for the current client session, including duration, field and
 *  view. A Session can be processed, resumed or transferred in a linearizable fashion. */
function Session() { 	// TO DO:  interpreter hook
	var start = Date.now();

	this.curr_field = null;
	this.views = null;
	this.curr_view = -1;
}

/*  getCurrentView:
 *  	Returns the current view.	*/
Session.prototype.getCurrentView = function() {
	return this.views[this.curr_view];
}

/* @class Unit: 
 *  	A class containing all of the information neccessary to work with real-
 *	world distance units.   */
function Unit(name, pluralForm, abbrev, factor) {
    this.name = name;
	this.plural = (pluralForm == null) ? this.name + "s" : pluralForm;
	this.abbrev = abbrev;
	this.factor = factor;
	
	return Object.freeze(this);
}

/* @class View: 
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
	this.curr_grid = null;
	this.curr_ruler = null;
	this.curr_label = null;
	this.factors = Array.apply(null, Array(curr_sess.curr_field.units.length)).map(function () {});
	this.scales = Array.apply(null, Array(curr_sess.curr_field.units.length)).map(function () {});
	
	//Initialize scales for initial unit
	this.initializeScale();
	
	return this;
}
View.prototype.constructor = View;

/*  changeScale:
 *	TO DO
 *	@param index */
View.prototype.changeScale = function(index) {
	if (this.curr_scale !== index) {
		this.curr_scale = index;
		this.initializeScale();
		BIG_CANVAS_CTX.clearRect(0, 0, BIG_CANVAS_CTX.canvas.width, BIG_CANVAS_CTX.canvas.height);
		canvas_drawRuler(this.curr_ruler, this.curr_unit, this.scales[this.curr_unit][0][this.curr_scale], this.factors[this.curr_unit], this.canvas_interval);
	}
}

/*  changeUnit:
 *	TO DO
 *	@param index */
View.prototype.changeUnit = function(index) {
	if (this.curr_unit !== index) {
		this.curr_unit = index;
		this.initializeScale();
		BIG_CANVAS_CTX.clearRect(0, 0, BIG_CANVAS_CTX.canvas.width, BIG_CANVAS_CTX.canvas.height);
		canvas_drawRuler(this.curr_ruler, this.curr_unit, this.scales[this.curr_unit][0][this.curr_scale], this.factors[this.curr_unit], this.canvas_interval);
	}
}

/*  getCurrentScale:
 *	Returns the current scale.	*/
View.prototype.getCurrentScale = function() {
	this.scales[this.curr_unit][0][this.curr_scale]
}

/*  initializeScale:
 *	Retrieves the ruler for a specific view, or calculates if it has not been previously utilized.  */
View.prototype.initializeScale = function() {
	if (this.scales[this.curr_unit] == null) {
		this.scales[this.curr_unit] = canvas_getScales(this);
		this.scales[this.curr_unit][1][this.curr_scale] = this.curr_grid = this.curr_ruler = this.curr_label = canvas_getRuler(this);
	} else if (this.scales[this.curr_unit][1][this.curr_scale] == null) {
		this.scales[this.curr_unit][1][this.curr_scale] = this.curr_ruler = canvas_getRuler(this);
	} else {
		this.curr_ruler = this.scales[this.curr_unit][1][this.curr_scale];
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
var curr_sess;               		//The session currently active
var orientation;					//Orientation, where -1/0/1 = portrait/square/landscape
var lw_reversed;					//Length/width may be swapped internally for simplicity
var font_height;					//Height corresponding to 1em
var canvas_offset_dim = [0,0];		//Left, top offset of an element
var canvas_delta = 0;				//Change in units per pixel
var canvas_pixel_delta = [0,0,0];	//Change in units per pixel
var menu_current_dropdown = null;	//Menu (if any) whose contents are currently displayed
var draw_mode = null;				//Currently selected drawing tool
var draw_color = "#FFFFFF";			//Currently selected color
var draw_thickness = 1;				//Currently selected thickness

//NOTE: The follow three (3) variables are a temporary measure; functionality will be 
//      replaced by interp.js when it is ready.
var DEFAULT_HASH_SPACING = 5;
var TEMP_SURFACE_VAL = -1;
var settings = {
	canvas_grid_coord_enabled:			true,
	canvas_grid_coord_prec:				2,
	canvas_grid_line_color:				'#000000',
	canvas_grid_line_enabled:			true,
	canvas_grid_line_opacity:			0.05,
	canvas_grid_line_thickness:			1.0,
	canvas_ruler_border_color:			'#FF0000',
	canvas_ruler_border_enabled:		true,
	canvas_ruler_border_thickness:		2.0,
	canvas_ruler_enabled:				true,
	canvas_ruler_label_enabled:			true,
	canvas_ruler_label_font_name:		'Courier New',
	canvas_ruler_label_font_ratio:		0.008,
	canvas_ruler_label_precision:		0,
	canvas_ruler_hash_color:			'#000000',
	canvas_ruler_hash_enabled: 			true,
	canvas_ruler_hash_length_factor:	0.4,
	canvas_ruler_hash_opacity:			1.0,
	canvas_ruler_hash_thickness:		1.0,
	canvas_ruler_max_hash_spacing:		10,
	canvas_ruler_min_hash_spacing:		2,
	canvas_ruler_pref_hash_spacing:		5,
	canvas_ruler_x_axis_width:			60,	
	canvas_ruler_y_axis_width:			60
};

/*****************************************************************************************
*                                  Window functionality                                  *
*****************************************************************************************/
/*	window.onclick(): 
 *		If clicked and e is NOT current menu, close element referred to by 
 *	menu_current_dropdown.  */
window.onclick = function(e) {
	if (!e.target.matches('.dropdown-menu-button')) {
		menu_current_dropdown.classList.add('hidden');
		menu_current_dropdown = null;
	}
};

/*	window.onload():
 *  	Initialize session, load-time dependent constants. */
window.onload = function() {
	curr_sess = new Session();
	
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
 *  	If window is resized, canvas must be redrawn.  (TO DO elaborate) */
window.onresize = function(event) {
    unsupported_operation();
	//canvas_resize();
};

/*****************************************************************************************
*                                   Form functionality                                   *
*****************************************************************************************/
/*	form_submit: 
 *		Evaluate form input; display warning if input is unacceptable.	
 *  If user-provided input is valid, initialize data and GUI elements/contents. 	*/
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
			
			curr_sess.curr_field = new Field(unit_index, unit_sys, field_dim[0], field_dim[1], TEMP_SURFACE_VAL);
			print_field(curr_sess.curr_field);
			
			canvas_resize(curr_sess);
			print_canvas(curr_sess.curr_field);
			
			var init_view = new View(unit_index, 0, 0, Math.floor(field_dim[0] * curr_sess.curr_field.unit_scales[unit_index]), 
													   Math.floor(field_dim[1] * curr_sess.curr_field.unit_scales[unit_index]));
			//print_view(init_view);
			curr_sess.views = [init_view];
			curr_sess.curr_view = 0;
			
			if (settings.canvas_ruler_enabled) {
				canvas_drawRuler(init_view.curr_ruler, init_view.curr_unit, init_view.scales[init_view.curr_unit][0][init_view.curr_scale], init_view.factors[init_view.curr_unit], init_view.canvas_interval);
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
/* 	canvas_resize:   
 *		Resizes canvas to fit screen.  Called whenever:
 * 	A) form submitted (initial input), or 
 * 	B) display is resized.    
 * 	@param {Session} session, the session being implemented. */
function canvas_resize(session) { 	//TO DO:   parameter necessary, or just use curr_sess?
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

	//Set font for ruler labels
	BIG_CANVAS_CTX.font = Math.floor(settings.canvas_ruler_label_font_ratio * BIG_CANVAS_CTX.canvas.width) + 'px ' + settings.canvas_ruler_label_font_name;	

	canvas_offset_dim = getTotalOffset(LIL_CANVAS_CTX.canvas);
}

/* canvas_getScaleList: 
 *  	Get a list of appropriate scales to choose from and map it to the 
 *  view and unit provided.
 *  @param {View} view, the current View for which the ruler is being calculated.
 *  @returns {scale list}, an array of key-value pairs.  
 *  	Note: The key is a signed interger array (negative/positive depending on if key is less 
 *  than/greater than or equal to 1:1), and the value is a pointer to the ruler for 
 *  that scale.  Rulers are initially null; the first ruler chosen is the smallest (finest) one 
 *  that can fit all of the unit intervals in the current View.  */
function canvas_getScales(view) {
	var intervals,
		interval_size,
		max_ruler_intervals,
		lessThanOne,
		factor = 1,
		ret;
	
	//Get the real-world interval size, and the interval size in pixels (on the shortest dimension)
	if (orientation < 0) {
		interval_size = Math.floor((view.canvas_interval[1][0] - view.canvas_interval[0][0]) / 
                         			curr_sess.curr_field.unit_scales[view.curr_unit]);
		max_ruler_intervals = Math.floor(LIL_CANVAS_CTX.canvas.width / 
                              			 settings.canvas_ruler_pref_hash_spacing);
	} else {
		interval_size = Math.floor((view.canvas_interval[1][1] - view.canvas_interval[0][1]) / 
                        			curr_sess.curr_field.unit_scales[view.curr_unit]);
		max_ruler_intervals = Math.floor(LIL_CANVAS_CTX.canvas.height / 
                              			 settings.canvas_ruler_pref_hash_spacing);
	}
	
	alert(interval_size + ", " + max_ruler_intervals + "..." + LIL_CANVAS_CTX.canvas.height);
	//Too many units to fit 1:1
	if (interval_size > max_ruler_intervals) {	
		//Break into factors of 100 or 1000?
		if (Math.floor(interval_size / 100) <= max_ruler_intervals) {
			if ((curr_sess.curr_field.units === METRIC_UNITS) || (view.curr_unit >= 2)) {
				//DEBUG alert('A');
				intervals = getFactors(100);
			} else {
				//DEBUG alert('B');
				intervals = getFactors(curr_sess.curr_field.units[view.curr_unit + 1].factor);
				factor *= 10;
			}
		} else {
			//DEBUG alert('C');
			intervals = getFactors(1000);
			for (; Math.floor(interval_size / (10 * factor * intervals[0])) < max_ruler_intervals; factor *= 10);
		}
		
		//Copy scales to array, save index of preferable 
		for (var i = 0; i < intervals.length; i++) {
			if (parseFloat(interval_size / (factor * intervals[i])) <= max_ruler_intervals) {		
				ret = new Int16Array(intervals.length);
				ret[0] = i;
				break;
			}
		}
		
		lessThanOne = true;
	//More than enough room for multiple fractions of unit per ruler interval
	} else {
		if (interval_size * 2 <= max_ruler_intervals) {	//Can at the very least add half marks
			//DEBUG alert('D');
			intervals = getFactors(curr_sess.curr_field.units[view.curr_unit > 0 ? view.curr_unit - 1 : view.curr_unit].factor);
			
			if ((intervals[intervals.length - 1] * 10) < max_ruler_intervals) {
				for (; (interval_size * factor * intervals[0] * 10) < max_ruler_intervals; factor *= 10);	
			}
		} else {	//1:1
			//DEBUG alert('E');
			intervals = (view.curr_unit > 0) ? getFactors(curr_sess.curr_field.units[view.curr_unit].factor * curr_sess.curr_field.units[view.curr_unit - 1].factor) :
											   getFactors(curr_sess.curr_field.units[view.curr_unit].factor);
		}
		
		//Copy scales to array, save index of preferable scale
		//DEBUG alert('intervals before: ' + intervals.toString()); 
		for (var i = intervals.length - 1; i >= 0; i--) {
			//DEBUG alert(factor + ', ' + intervals[i]);
			if (parseFloat(interval_size * factor * intervals[i]) <= max_ruler_intervals) {
				ret = new Int16Array(((i < intervals.length - 1) && ((interval_size * factor * intervals[i]) < Math.floor((max_ruler_intervals * settings.canvas_ruler_pref_hash_spacing) / settings.canvas_ruler_min_hash_spacing))) ? i + 1 : i);
				ret[0] = i;
				break;
			}
		}
		//DEBUG alert('intervals after: ' + intervals.toString()); 
		
		lessThanOne = false;
	}
	
	//Populate scales list
	var selectedScale = ret[0],
		selectBox = document.getElementById('select-canvas-scale');

	selectBox.options.length = 0;			//Clear scales dropdown box
	for (var i = 0; i < ret.length; i++) {	//Now populate with current scales
		var opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = (lessThanOne) ? intervals[i] + ':1' : '1:' + intervals[i];
		selectBox.appendChild(opt);
		
		ret[i] = (lessThanOne) ? -1 * intervals[i] : intervals[i];
	}
	//DEBUG alert('ret: ' + ret.toString());
	
	//Add option for addition of user-specified custom scales
	var opt = document.createElement('option');
	opt.value = intervals.length;
	opt.innerHTML = "...";
	selectBox.appendChild(opt);
	
	//Set current scale
	selectBox.selectedIndex = selectedScale;
	view.curr_scale = selectedScale;
	view.factors[view.curr_unit] = factor;

	return [ret, Array.apply(null, Array(curr_sess.curr_field.units.length)).map(function() {})];
}

/*	canvas_getRuler:	
 *  	A 'ruler' is an unsigned integer array corresponding to the marks on a ruler, where 
 *  each successive interval (in increments of smallest units) represents a successively-
 *  longer/thicker hatch mark.
 *  E.g. 
 *  >	10, 40, 200 would correspond to marks every 10, 40 and 200mm on a metric ruler.
 *  >	192, 960, 1920 would correspond to marks every 1, 5, and 10 feet (192 being the 
 *      number of 1/16ths of an inch in each foot, and 960/1920 being multiples of 192).
 *  @param {View} view, the current View for which the ruler is being calculated.   
 *  @returns {ruler} an unsigned 16-bit integer array of the respective intervals 
 *      corresponding to the hash marks.	*/
function canvas_getRuler(view) {
	var intervals = [],
		interval_size = (orientation < 0) ? (view.canvas_interval[1][0] - view.canvas_interval[0][0]) :
											(view.canvas_interval[1][1] - view.canvas_interval[0][1]),
		scale = view.scales[view.curr_unit][0][view.curr_scale];
	
	//Scale is less than or equal to 1:1
	if (scale < 0) {
		var abs_scale = Math.abs(scale) * view.factors[view.curr_unit] * curr_sess.curr_field.unit_scales[view.curr_unit];
		//DEBUG alert(abs_scale + ", " + view.curr_unit + ", " + view.curr_scale);
		//Can fit at least one ruler on interval
		if (interval_size >= abs_scale) {
			alert('W');
			intervals.push(Math.abs(scale));
			for (var i = view.curr_scale, j = view.curr_scale + 1; j < view.scales[view.curr_unit][0].length; j++) {
				//DEBUG alert("[" + i + ", " + j + "] ... " + view.scales[view.curr_unit][0][i] + ", " + view.scales[view.curr_unit][0][j] + " ... " + intervals.toString());
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
			alert('Y');
			intervals.push(scale);
			
			loop:
			for (var i = view.scales[view.curr_unit][0].length - 2; i >= 1; i--) {
				for (var j = intervals.length - 1; j >= 0; j--) {
					if ((intervals[j] % view.scales[view.curr_unit][0][i]) !== 0) {
						continue loop;
					}
				}
				
				intervals.push(view.scales[view.curr_unit][0][i]);
			}
			
			intervals.push(1);
		} else {
			alert('Z');	
		}
	}
	
	//DEBUG alert("intervals: " + intervals);
	return new Uint16Array(intervals);
}

/*	canvas_drawRuler: 
 *		Draws a given ruler for a given view/context on the canvas.	
 *	@param 
 *	@param 
 *	@param 
 *	@param 
 *	@param 
 */
function canvas_drawRuler(ruler, ruler_unit, scale, ruler_factor, ruler_interval) {
	var x,
		y,
		max_length,
		label_font_size,
		lessThanOne = ruler[0] < ruler[ruler.length - 1];

	//Set the interval increment amount for both axis
	canvas_delta = lessThanOne ? curr_sess.curr_field.unit_scales[ruler_unit] * ruler_factor * ruler[0] :
						 		 Math.floor(curr_sess.curr_field.unit_scales[ruler_unit] / (ruler_factor * ruler[0]));
	//DEBUG alert('delta ' + canvas_delta + ', ' + curr_sess.curr_field.unit_scales[curr_sess.views[curr_sess.curr_view].curr_unit] + ', ' + ruler_factor + ', ' + ruler[ruler.length - 1]);
	
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
		y = BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width + 1;
		max_length = parseFloat(settings.canvas_ruler_y_axis_width * settings.canvas_ruler_hash_length_factor);
		canvas_pixel_delta[1] = parseFloat(LIL_CANVAS_CTX.canvas.height / ((ruler_interval[1][1] - ruler_interval[0][1]) / canvas_delta));
		
		//Set ruler label font align (if applicable)
		if (settings.canvas_ruler_label_enabled) {
			BIG_CANVAS_CTX.textAlign = 'right';
			BIG_CANVAS_CTX.textBaseline = 'middle';	
		}
		
		for (var interval = ruler_interval[0][1]; interval < ruler_interval[1][1]; y -= canvas_pixel_delta[1], interval += canvas_delta) {
			var grid_thickness = settings.canvas_grid_line_thickness,
				grid_opacity = settings.canvas_grid_line_opacity,
				hash_thickness = settings.canvas_ruler_hash_thickness,
				hash_length,
				y_offset = 0.5;
		
			if (lessThanOne) {
				for (hash_length = 1; (hash_length < ruler.length) && ((interval % (ruler_factor * curr_sess.curr_field.unit_scales[ruler_unit] * ruler[hash_length])) == 0); hash_length++);
			} else {
				for (hash_length = 1; (hash_length < ruler.length) && ((interval % (curr_sess.curr_field.unit_scales[ruler_unit] / ruler[hash_length])) == 0); hash_length++);
			}
			
			if ((Math.round(canvas_pixel_delta[1]) >= settings.canvas_ruler_pref_hash_spacing) && (hash_length == ruler.length)) {
				y_offset = 0;
				hash_thickness++;
				grid_thickness++;
				grid_opacity *= 2;
				
				if (settings.canvas_ruler_label_enabled) {
					BIG_CANVAS_CTX.fillText((interval / curr_sess.curr_field.unit_scales[ruler_unit]).toFixed(settings.canvas_ruler_label_precision), parseFloat(x - max_length - parseFloat(max_length / 4)), Math.floor(y) + y_offset);
				}
			}
			
			if ((settings.canvas_grid_line_enabled) && (interval > ruler_interval[0][1])) {
				if ((hash_thickness === 1) && (hash_length > 1)) {
					grid_opacity *= 2;
				}
				
				BIG_CANVAS_CTX.beginPath();
				BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_grid_line_color, grid_opacity);
				BIG_CANVAS_CTX.lineWidth = grid_thickness;
				BIG_CANVAS_CTX.moveTo(BIG_CANVAS_CTX.canvas.width, Math.floor(y) + y_offset);
				BIG_CANVAS_CTX.lineTo(settings.canvas_ruler_y_axis_width - 1, Math.floor(y) + y_offset);
				BIG_CANVAS_CTX.stroke();
				BIG_CANVAS_CTX.closePath();
			}
			
			hash_length *= parseFloat(1 / ruler.length);
			BIG_CANVAS_CTX.beginPath();
			BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_ruler_hash_color, settings.canvas_ruler_hash_opacity);
			BIG_CANVAS_CTX.lineWidth = hash_thickness;
			BIG_CANVAS_CTX.moveTo(x, Math.floor(y) + y_offset);
			BIG_CANVAS_CTX.lineTo(parseFloat(x - (max_length * hash_length)), Math.floor(y) + y_offset);
			BIG_CANVAS_CTX.stroke();
			BIG_CANVAS_CTX.closePath();
		}
		
		//Lastly, draw the x-axis hatch marks
		x = settings.canvas_ruler_y_axis_width - 1;
		y = BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width + 2;
		max_length = parseFloat(settings.canvas_ruler_x_axis_width * settings.canvas_ruler_hash_length_factor);
		canvas_pixel_delta[0] = parseFloat(LIL_CANVAS_CTX.canvas.width / ((ruler_interval[1][0] - ruler_interval[0][0]) / canvas_delta));
		
		//Set ruler label font align (if applicable)
		if (settings.canvas_ruler_label_enabled) {
			BIG_CANVAS_CTX.textAlign = 'center';
			BIG_CANVAS_CTX.textBaseline = 'bottom';	
		}
	
		for (var interval = ruler_interval[0][0]; interval < ruler_interval[1][0]; x += canvas_pixel_delta[0], interval += canvas_delta) {
			var grid_thickness = settings.canvas_grid_line_thickness,
				grid_opacity = settings.canvas_grid_line_opacity,
				hash_thickness = settings.canvas_ruler_hash_thickness,
				hash_length,
				x_offset = 0.5;
		
			if (lessThanOne) {
				for (hash_length = 1; (hash_length < ruler.length) && ((interval % (ruler_factor * curr_sess.curr_field.unit_scales[ruler_unit] * ruler[hash_length])) == 0); hash_length++);
			} else {
				for (hash_length = 1; (hash_length < ruler.length) && ((interval % (curr_sess.curr_field.unit_scales[ruler_unit] / ruler[hash_length])) == 0); hash_length++);
			}
			
			if ((Math.round(canvas_pixel_delta[0]) >= settings.canvas_ruler_pref_hash_spacing) && (hash_length == ruler.length)) {
				x_offset = 0;
				hash_thickness++;
				grid_thickness++;
				grid_opacity *= 2;
				
				if (settings.canvas_ruler_label_enabled) {
					BIG_CANVAS_CTX.fillText((interval / curr_sess.curr_field.unit_scales[ruler_unit]).toFixed(settings.canvas_ruler_label_precision), Math.floor(x) + x_offset, parseFloat(y + parseFloat(max_length * 1.5) + parseFloat(max_length / 4)));
				}
			}
			
			if ((settings.canvas_grid_line_enabled) && (interval > ruler_interval[0][0])) {
				if ((hash_thickness === 1) && (hash_length > 1)) {
					grid_opacity *= 2;
				}
				
				BIG_CANVAS_CTX.beginPath();
				BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_grid_line_color, grid_opacity);
				BIG_CANVAS_CTX.lineWidth = grid_thickness;
				BIG_CANVAS_CTX.moveTo(Math.floor(x) + x_offset, 0);
				BIG_CANVAS_CTX.lineTo(Math.floor(x) + x_offset, BIG_CANVAS_CTX.canvas.height - settings.canvas_ruler_x_axis_width);
				BIG_CANVAS_CTX.stroke();
				BIG_CANVAS_CTX.closePath();
			}
			
			hash_length *= parseFloat(1 / ruler.length);
			BIG_CANVAS_CTX.beginPath();
			BIG_CANVAS_CTX.strokeStyle = toRGBA(settings.canvas_ruler_hash_color, settings.canvas_ruler_hash_opacity);
			BIG_CANVAS_CTX.lineWidth = hash_thickness;
			BIG_CANVAS_CTX.moveTo(Math.floor(x) + x_offset, y);
			BIG_CANVAS_CTX.lineTo(Math.floor(x) + x_offset, parseFloat(y + (max_length * hash_length)));
			BIG_CANVAS_CTX.stroke();			
			BIG_CANVAS_CTX.closePath();
		}			
	}
	
	//Set info for coordinate display on canvas mouseOver
	if (canvas_pixel_delta[0] > scale) {
		canvas_pixel_delta[0] = Math.abs(canvas_pixel_delta[0] / scale);
		canvas_pixel_delta[1] = Math.abs(canvas_pixel_delta[1] / scale);
		canvas_pixel_delta[2] = -1;
	} else {
		canvas_pixel_delta[0] = canvas_pixel_delta[0] * scale;
		canvas_pixel_delta[1] = canvas_pixel_delta[1] * scale;
		canvas_pixel_delta[2] = 25;
	}
}

/*	canvas_zoomIn:
 *		TO DO 	*/
function canvas_pan() {
	
}

/*	canvas_zoomIn:
 *		TO DO 	*/
function canvas_zoomIn() {
	
}

/*	canvas_zoomOut:
 *		TO DO 	*/
function canvas_zoomOut() {
	
}

/*	canvas_changeUnits: 
 *		Change the units being displayed.
 *	Called when 'select-canvas-units' onChange() even is fired.	*/
function canvas_changeUnits() {
	var view = curr_sess.views[curr_sess.curr_view];
	view.changeUnit(document.getElementById('select-canvas-units').selectedIndex);
	LIL_CANVAS_CTX.canvas.focus();
}

/*	canvas_changeScaleType:
 *  	Changes whether the ruler/grid scale is being displayed and can be changed.
 * Called when 'select-canvas-scale-type' onChange() even is fired.	*/
function canvas_changeScaleType() {
	
}

/*	canvas_changeScale: 
 *  	TO DO 	*/
function canvas_changeScale() {
	var view = curr_sess.views[curr_sess.curr_view];
	
	if (document.getElementById('select-canvas-scale').selectedIndex < document.getElementById('select-canvas-scale').options.length - 1) {
		//DEBUG alert("current scale: " + view.curr_scale + " ... " + document.getElementById('select-canvas-scale').selectedIndex);
		view.changeScale(document.getElementById('select-canvas-scale').selectedIndex);
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
	}
}

/***** Canvas mouse events *****/
/*	canvas_mouseMove: 
 *		TO DO 	*/
function canvas_mouseMove(e) {
	var x = (e.clientX - canvas_offset_dim[0]) / canvas_pixel_delta[0];
	var y = (LIL_CANVAS_CTX.canvas.height - (e.clientY - canvas_offset_dim[1]) - 1) / canvas_pixel_delta[1];
	
	if (canvas_pixel_delta[2] > 0) {
		x = (Math.floor(x) + Math.floor((x - Math.floor(x)) * canvas_pixel_delta[2]) / canvas_pixel_delta[2]).toFixed(settings.canvas_grid_coord_prec);
		y = (Math.floor(y) + Math.floor((y - Math.floor(y)) * canvas_pixel_delta[2]) / canvas_pixel_delta[2]).toFixed(settings.canvas_grid_coord_prec);
	} else {
		x = Math.floor(x);
		y = Math.floor(y);
	}
	
	document.getElementById('display-coords').innerHTML = x + ', ' + y;
}

/*	canvas_mouseOut(): TO DO 	*/
function canvas_mouseOut() {
	document.getElementById('display-coords').innerHTML = '';
}
/***************************************************************************************************************
*												Menu buttons												   *
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

/*	toggle_dropdown:
 *		Shows/hides the submenu if it is hidden/shown (resp).	*/
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
/*	menu_draw_line:	
 *		TO DO	*/
function menu_draw_line() {
	unsupported_operation();
}

/*	menu_draw_arc:
 *		TO DO	*/
function menu_draw_arc() {
	unsupported_operation();
}

/*	menu_draw_rect:
 *		TO DO	*/
function menu_draw_rect() {
	unsupported_operation();
}

/*	menu_draw_circle:
 *		TO DO	*/
function menu_draw_circle() {
	unsupported_operation();
}

/*	menu_draw_poly_line:
 *		TO DO	*/
function menu_draw_poly_line() {
	unsupported_operation();
}

/*	menu_pick_thickness:
 *		TO DO	*/
function menu_pick_thickness() {
	unsupported_operation();
}

/*	menu_pick_color:	
 *		TO DO	*/
function menu_pick_color() {
	unsupported_operation();
}

/*	toggleConsole:	
 *		TO DO	*/
function toggleConsole() {
	document.getElementById('text-console').classList.contains('hidden') ? document.getElementById("text-console").classList.remove('hidden') : 
																		   document.getElementById("text-console").classList.add('hidden');
}
/***************************************************************************************************************
*											Utility functions
***************************************************************************************************************/
/* 	getFactors: 
		Calculates all positive integer factors of a number n between one and n (inclusive).
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

/*  getTotalOffset: 
 *		Determines the total left and top offset of an element by adding the
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

/*  merge: 
 *		Merge the second integer array into the first, while maintaining their sorted order.	
 *	@param {array} arr1, the array receiving elements.
 *	@param {array} arr2, the array being merged.
 */
function merge(arr1, arr2) {
	//Ensure that both array parameters are non-null and non-empty
	if ((arr1 != null) && (arr1.length > 0) && (arr2 != null) && (arr2.length > 0)) {
		for (var i = 0; i < arr1.length; i++) {
			for (var j = 0; j < arr2.length; j++) {
				if (arr2[j] > arr1[i]) {
					arr1[i].splice(i + 1, 0, arr2[j++]);
				}
			}
		}
	}
}

/*	toRGBA:
 *		Converts a long-typed color value to its RGBA equivalent.
 *  @param {number} color, a valid color between #000000 and #FFFFFF.
 *  @param {number} alpha, a valid positive float value between 0.0 and 1.0.
 *  @returns {string} a string with the parameterized values in rgba(r,g,b,a) form, (such 
 *  	that can be understood in the context of changes to an element's style).   */
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

function print_field(field) {
	alert("field: " + field.field_unit + ", [" + field.width + ", " + field.length + "]");
}

function print_canvas(field) {
	alert("canvas: " + LIL_CANVAS_CTX.canvas.width + ", " + LIL_CANVAS_CTX.canvas.height + ", [" + field.width + ", " + field.length + "]");
}

function print_view(view) {
	alert('view: [(' + view.canvas_interval[0,0] + ', ' + view.canvas_interval[0,1] + '), (' + view.canvas_interval[1,0] + ', ' + view.canvas_interval[1,1] + ')]\n' + 
		  '      unit: ' + curr_sess.curr_field.units[view.curr_unit].name + ', scale: ' + view.curr_scale + ', ruler: ' + view.curr_ruler.toString() + '\n' +
		  scale_list_to_string(view.scales));
}

function scale_list_to_string(scale_list) {
	var ret;

	if (scale_list == null) {
		ret = 'null';
	} else {
		ret = '';
		
		for (var i = 0; i < scale_list.length; i++) {
			var spacing = 8 + curr_sess.curr_field.units[i].name.length;
			//alert('@ ' + scale_to_string(scale_list[i], spacing) + ', ' + spacing);
			
			ret += i + '. ' + curr_sess.curr_field.units[i].name + ': ' + scale_to_string(scale_list[i], spacing) + '';
			//alert('A: ' + i + ', {' + ret + '}');
			
			if (i < (scale_list.length - 1)) {
				ret += '\n';
			}
		}
	}
	
	return ret;
}

function scale_to_string(scale, whitespace_len) {
	var ret;
	
	if (scale == null) {
		ret = 'null';
	} else {
		ret = '';
		var temp = (whitespace_len == null) ? '' : ' '.repeat(whitespace_len);
		
		//alert('!' + scale[0].length);
		for (var i = 0; i < scale[0].length; i++) {
			//alert('!: ' + i + ', {' + ret + '}');
			ret += (i < 1) ? '' : temp;
			ret += (scale[0][i] < 0) ?  Math.abs(scale[0][i]) + ':1 [' :
									   '1:' + scale[0][i] + ' [';
			//alert('!!: ' + i + ', ' + temp);
			if (scale[1][i] != null) {
				//alert('!!' + scale[1][i].toString());	
			} else {
				//alert('?');	
			}
			ret += (scale[1][i] == null) ? 'null]' : scale[1][i].toString() + ']';
			
			if (i < (scale[0].length - 1)) {
				ret += '\n';
			}
			//alert('--\n' + ret);
		}
	}
	
	//alert('B: ' + ret);
	return ret;
}
