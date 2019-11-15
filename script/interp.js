/*  ╔════════════════════════════════════════════════════════════════════════════════════════════════╗
 *  ║ interp.js                                                                              v 0.6.1 ║
 *  ║ Developer console for added field.js functionality and customization.                          ║
 *  ║                                                                                                ║
 *  ║ Licensed under the GNU GPL v3.0 @ https://github.com/snealblim/field/blob/master/LICENSE       ║ 
 *  ╠════════════════════════════════════════════════════════════════════════════════════════════════╣
 *  ║                                   by Samuel 'teer' Neal-Blim                                   ║
 *  ║                               site: http://www.prog.nealblim.com                               ║
 *  ║                           git:  https://github.com/snealblim/field/                            ║
 *  ╚════════════════════════════════════════════════════════════════════════════════════════════════╝
/* 

There are three types of symbols:
-   cvars
-   commands
-   operators
*/

/********************************** BASE CLASSES  ***************************************/
/*	@class Node:
 *		Base class of interior nodes for n-ary abstract syntax tree (AST).	*/ 
function Node(key, description, child_nodes) {
	this.key = key;
	this.description = description;
	this.children = ((child_nodes === null || child_nodes === 'undefined')) ? null : child_nodes;
	
	return this;
};
Node.prototype.get() = function(key) {
	
};
Node.prototype.toString = function() {
	return this.key;
};

/*	@class TerminalNode: 	
 *		TO DO.	*/
function TerminalNode(key, description, args) {
	Node.call(this, key, description, null);
	this.args = args;
	
	return this;
};
TerminalNode.prototype = Object.create(Node.prototype);
TerminalNode.prototype.constructor = TerminalNode;

/*********************************** LEAF NODES *****************************************/
/*	class CommandNode: */
function CommandNode(key, description, args) {
	TerminalNode.call(this, key, description, args);
}
CommandNode.prototype = Object.create(TerminalNode.prototype);
CommandNode.prototype.constructor = CommandNode;

/*	class CvarNode: 	*/
function CvarNode(key, description, args, default_val) {
	TerminalNode.call(this, key, description, args);
	this.default_value = Object.freeze(default_val);
	this.value = this.default_value;
		
	return this;
};
CvarNode.prototype = Object.create(TerminalNode.prototype);
CvarNode.prototype.constructor = CvarNode;
CvarNode.prototype.evaluate = function(text) {
	var val = this.args[0](text);
	
	if (val !== null) {
		this.value = val;	
		return true;
	}
	
	return false;
};
CvarNode.prototype.setValue = function(newVal) {
	if (this.evaluate(newVal) === true) {
		value = newVal;	
	}
};
CvarNode.prototype.toString = function() {
	return Object.getPrototypeOf(Node.prototype).toString.call(this) + ' ' + this.value;
};

/*	class OperatorNode: */
function OperatorNode(key, description, args) {
	TerminalNode.call(this, key, description, args);
}
OperatorNode.prototype = Object.create(TerminalNode.prototype);
OperatorNode.prototype.constructor = OperatorNode;


//Wrapper classes
/*	@class AliasNode:
 *      Wrapper for when a command/cvar aliases another */
function AliasNode(key, node) {
	Node.call(this, key, null);
	this.node = node;
	
	return Object.freeze(this);
}

/*	@class AxisNode:	 */
function AxisNode(keys, descriptions, default_values, values) {
	MultipleNode.call(this, ['x', 'y'], keys, descriptions, default_values, values);
	
	return this;
}
AxisNode.prototype = Object.create(MultipleNode.prototype);
AxisNode.prototype.constructor = AxisNode;

/*	class CompositeNode:	Shorthand for when root node prefix is also a command (e.g. in the case of 'user' */
function CompositeNode(prefix, description, evaluator, children) {
	Node.call(this, prefix, children);
	this.node = new TerminalNode(prefix, description, evaluator);
}

/*	class LineNode:	 */
function LineNode(node) {
	
}

/*	@class MultipleNode: 	
 *		Shorthand for nodes whose keys are identical save for their prefix.	
 *	TO DO: description wildcards.	*/
function MultipleNode(prefixes, keys, descriptions, args, default_values) {
	this.prefixes = prefixes;
	this.keys = keys;
	this.descriptions = descriptions;
	
	return this;
};
MultipleNode.prototype = Object.create(CvarNode.prototype);
MultipleNode.prototype.constructor = MultipleNode;
MultipleNode.prototype.get() = function(key) {
	
};

/*	class MaxMinPrefNode:	 */
function MaxMinPrefNode(keys, descriptions, args, default_values) {
	return MultipleNode(['max', 'min', 'pref'], keys, descriptions, args, default_values);
}
/*********************************** DATA TYPES *****************************************/
/*	class Color:	 */
function Color(r, g, b) {
	var vals = new Uint8Array(3);
	vals[0] = r;
	vals[1] = g;
	vals[2] = b;
	
	return this;
}

/********************************** INTERPRETER *****************************************/
function Interpreter() {
	/*  constants*/
	var KEY_ENABLE	 	= Object.freeze('enable');
	var KEY_COLOR	 	= Object.freeze('color');
	var KEY_OPACITY		= Object.freeze('opacity');
	var KEY_THICKNESS	= Object.freeze('thickness');
	var COLOR_BLACK 	= Object.freeze(new Color(0, 0, 0));
	var COLOR_RED		= Object.freeze(new Color(255, 0, 0));

	var AST_MAP_ROOT = Object.freeze(new Node('', [
		new OperatorNode('?',											'',																																	null),				//?
		new CommandNode('about',										'Display	',																														null),				//about
		new CommandNode('alias',										'Assign an alias to a command.',																									null),				//alias
		new Node('audio', 												'',																																						//audio_																																		
		   [new CvarNode(KEY_ENABLE,									'Assign an alias to a command.',																									null)]),			//audio_enable
		new CommandNode('bind',											'Binds an action to a keyboard or mouse event.',																					null),				//bind
		new CommandNode('close',										'',																																	null),				//close
		new Node('dev', 												'',																																						//dev_
		   [new CommandNode('bug', 										'',																																	null)]),			//dev_bug
		new Node('draw', 												'',																																						//draw_
		   [new CommandNode('line', 									'',																																	null),				//draw_line
			new CommandNode('arc', 										'',																																	null),				//draw_arc
			new CommandNode('rect', 									'',																																	null),				//draw_rect
			new CommandNode('circle', 									'',																																	null),				//draw_circle
			new CommandNode('polyline',									'',																																	null)]),			//draw_polyline
		new CommandNode('echo',											'Echo string to console.',																											null),				//echo
		new CommandNode('exit',											'',																																	null),				//exit
		new CommandNode('export',										'',																																	null),				//export
		new CommandNode('find',											'',																																	null),				//find
		new Node('gui',													'',																																						//gui_																																																		
		   [new Node('canvas',											'',																																						//gui_canvas_
			   [new Node('grid', 										'',																																						//gui_canvas_grid_
				   [new CvarNode(KEY_ENABLE, 							'',																																	null),				//gui_canvas_grid_enable
					new CvarNode(KEY_COLOR, 							'',																																	null),				//gui_canvas_grid_color
					new CvarNode(KEY_COLOR, 							'',																																	null),				//gui_canvas_grid_opacity
					new CvarNode(KEY_THICKNESS, 						'',																																	null)]),			//gui_canvas_grid_thickness
				new Node('ruler',										'',																																						//gui_canvas_ruler_
				   [new CvarNode(KEY_ENABLE, 							'',																																	null),				//gui_canvas_ruler_enable
				   	new Node('border', 									'',																																						//gui_canvas_ruler_border
					   [new CvarNode(KEY_ENABLE, 						'',																																	null),				//gui_canvas_ruler_border_enable
						new CvarNode(KEY_COLOR, 						'',																																	null),				//gui_canvas_ruler_border_color
						new CvarNode(KEY_COLOR, 						'',																																	null),				//gui_canvas_ruler_border_opacity
						new CvarNode(KEY_THICKNESS, 					'',																																	null)]),			//gui_canvas_ruler_border_thickness
					new Node('mark', 									'',																																						//gui_ruler_mark_
					   [new CvarNode(KEY_ENABLE, 						'',																																	null),				//gui_canvas_ruler_mark_enable
						new CvarNode(KEY_COLOR, 						'',																																	null),				//gui_canvas_ruler_mark_color
						new CvarNode(new TerminalNode('hash_length',	'',																																	null)),				//gui_canvas_ruler_mark_length
						new CvarNode(KEY_COLOR, 						'',																																	null),				//gui_canvas_ruler_mark_opacity
						new CvarNode(KEY_THICKNESS, 					'',																																	null)]),			//gui_canvas_ruler_mark_thickness
					new MaxMinPrefNode('spacing',						'',																																	null),
					new AxisNode(new TerminalNode('axis_width'),		'',																																	null)])])]),
		new CommandNode('help',											'',																																	null),
		new CommandNode('import',										'',																																	null),				//import
		new CommandNode('list',											'',																																	null),				//list
		new CompositeNode('log',										'',																																	null, [				//log
			null]),
		new CommandNode('name',											'Prints the current user\'s name.',																									null),				//name
		new CommandNode('open',											'',																																	null),				//open
		new CommandNode('quit',											'',																																	null),				//quit
		new CommandNode('redo',											'',																																	null),				//redo
		new CommandNode('restart',										'',																																	null),				//restart
		new CompositeNode('save',										'',																																	null, [				//save
			null]),
		new CompositeNode('session',									'',																																	null, [				//session
            null]),
		new CommandNode('stats',										'Prints statistical information about the given parameter.',																		null),				//stats
		new CommandNode('unbind',										'',																																	null),				//unbind
		new CommandNode('undo',											'',																																	null),				//undo
		new CompositeNode('user',										'',																																	null, [				//user
			new CommandNode('info',										'Prints information about the current user.',																						null)]),			//user_info
		new CommandNode('verbose',										'Prints verbose information.',																										null),				//verbose
        new CommandNode('version',										'Prints current version.',																											null)				//version
    ]));

	this.search = function(text) {
		if (typeof text === 'string' || text instanceof String) {
		var curr_node = this.AST_MAP_ROOT,
			words = text.split(' '),
			tokens = words[0].split('_'),
			text_path = '';		//DEBUG ONLY

			//DEBUG alert(words + '[' + tokens + '] ' + curr_node + ':' + curr_node.children);
			for (var i = 0; (i < tokens.length) && (curr_node.children !== null); i++) {
				var ast_min = 0, 
					ast_max = curr_node.children.length - 1,
					ast_mid = parseInt(ast_max / 2),
					comp_val;
				//DEBUG alert('start ' + i + ': [' + ast_min + ', ' + ast_mid + ', ' + ast_max + ']');
				while ((ast_min < ast_max) && ((comp_val = curr_node.children[ast_mid].key.localCompare(tokens[ast_mid])) !== 0)) {
					if (comp_val > 0) {
						ast_max = ast_mid - 1;
					} else {
						ast_min = ast_mid + 1;
					}

					ast_mid = ast_max / 2;
				}

				if (comp_val === 0) {
					curr_node = curr_node.children[ast_mid];
					text_path.concat(curr_node.key, (i === (tokens.length - 1)) ? '' : '_');		//DEBUG ONLY
				} else { 
					break;
				}
			}
		}

		return null;
	};

	return Object.freeze(this);
}
Interpreter.prototype.interpret = function(text) {
	
};
