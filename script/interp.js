/*  ╔════════════════════════════════════════════════════════════════════════════════════════════════╗
 *  ║                         by Sam 'teer' Neal                                                     ║
 *  ║                      http://www.prog.nealblim.com                                              ║
 *  ║                                github                                                          ║
 *  ╠════════════════════════════════════════════════════════════════════════════════════════════════╣
 *  ║                                                                                                ║
 *  ╚════════════════════════════════════════════════════════════════════════════════════════════════╝


There are three types of symbols:
-   cvars
-   commands
-   operators
*/

/********************************** BASE CLASSES  ***************************************/
/*	class Node:		base class of interior nodes for n-ary abstract syntax tree (AST).	*/
function Node(key, description, child_nodes) {	
	this.key = key;
	alert('base: ' + key + ', ' + (child_nodes === null));
	this.children = (child_nodes === null) ? null : child_nodes;
	alert('base: ' + key + ', ' + this.children);
		
	return Object.freeze(this);
}
Node.prototype.toString = function() {
	return this.key;
};

/*	class TerminalNode: 	*/
function TerminalNode(key, description, evaluator) {
	//alert('leaf: ' + key.toString());
	Node.call(this, key, null);
	
	this.desc = description;
	this.evaluator = evaluator;
	
	return Object.freeze(this);
}

/*********************************** LEAF NODES *****************************************/
/*	class CvarNode: 	*/
function CvarNode(key, desc, evaluator, default_val) {
	Node.call(this, key, desc, evaluator);
	this.default_value = Object.freeze(default_val);
	this.value = this.default_value;
	
	return this;
}

/*	class CommandNode: */
function CommandNode(key, evaluator) {
	TerminalNode.call(this, key, evaluator);
	return Object.freeze(this);
}

/*	class OperatorNode: */
function OperatorNode(key, evaluator) {
	TerminalNode.call(this, key, evaluator);
	return Object.freeze(this);
}

//Wrapper classes
/*	@class AliasNode:
 *      Wrapper for when a command/cvar aliases another */
function AliasNode(key, node) {
	Node.call(this, key, null);
	this.node = node;
	
	return Object.freeze(this);
}

/*	@class AxisNode:	 */
function AxisNode(key, node) {
	Node.call(this, key, null);
	this.node = node;
	
	return Object.freeze(this);
}

/*	class CompositeNode:	Shorthand for when root node prefix is also a command (e.g. in the case of 'user' */
function CompositeNode(prefix, description, evaluator, children) {
	Node.call(this, prefix, children);
	this.node = new TerminalNode(prefix, description, evaluator);
}

/*	class LineNode:	 */
function LineNode(node) {
	
}

/*	class MaxMinPrefNode:	 */
function MaxMinPrefNode(keys, descriptions, evaluators, default_values) {
	if (true) { //to do
		var arr = ['max', 'min', 'pref'];
        
        arr.forEach(function(x) {
            return new Node()
			keys.forEach(function(y) {
                ret.push();
            })
		});
        
		return  arr;
    }
	
	return null;	
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

			alert(words + '[' + tokens + '] ' + curr_node + ':' + curr_node.children);
			for (var i = 0; (i < tokens.length) && (curr_node.children !== null); i++) {
				var ast_min = 0, 
					ast_max = curr_node.children.length - 1,
					ast_mid = parseInt(ast_max / 2),
					comp_val;
				alert('start ' + i + ': [' + ast_min + ', ' + ast_mid + ', ' + ast_max + ']');
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