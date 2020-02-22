/* ╔═══════════════════════════════════════════════╦═════════════════════════╦══════════╗
 * ║ interp.js                                     ║ Created:    7 Jun. 2019 ║ v0.9.1.1 ║
 * ║                                               ║ Last mod.: 22 Feb. 2020 ╚══════════╣
 * ╠═══════════════════════════════════════════════╩════════════════════════════════════╣
 * ║                                                                                    ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ For the latest version of this snippet, report a bug, or to contribute, please     ║ 
 * ║ visit:     github.com/snealbli/field.js                                            ║
 * ║    or:     robot.nealblim.com/field.js                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║                             by Samuel 'teer' Neal-Blim                             ║
 * ║                                                                                    ║
 * ║                              Site: prog.nealblim.com                               ║
 * ║                              Git:  github.com/snealbli                             ║
 * ║                         JSfiddle:  jsfiddle.net/user/teeer                         ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */
/********************************** BASE CLASSES  ***************************************/
/*	@class Node:
 *		Base class of interior nodes for n-ary abstract syntax tree (AST).	*/ 
class AbstractNode { 
	constructor(key, description) {
		this.key = key;
    	this.desc = description;
	}
}

/*	@class Node:
 *		Base class of interior nodes for n-ary abstract syntax tree (AST).	*/ 
class Node extends AbstractNode {
	constructor(key, description, children) {
		super(key, description);
    	this.children = children;
	}
}

/*********************************** LEAF NODES *****************************************/
/*	@class CommandNode:
 *	  */ 
class CommandNode extends AbstractNode {
	constructor(key, description, args) {
		super(key, description, args);
	}
}

/*	@class CvarNode:
 *		Base class of interior nodes for n-ary abstract syntax tree (AST).	*/ 
class CvarNode extends AbstractNode {
	constructor(key, description, type, default_value) {
		super(key, description, null);
		this.type = type;
		this.default_value = Object.freeze(default_value);
		this.value = this.default_value;
	}
	
	evaluate(text) {
		var val = this.args[0](text);
		
		if (val !== null) {
			this.value = val;	
			return true;
		}
		
		return false;
	}
}

/*	@class CompositeNode:
 *		Shorthand for when root Node prefix is also a command (e.g. in the case of 'user' */
class CompositeNode extends Node {
	constructor(key, description, args, children) {
		
	}
}


/*	class OperatorNode: */
class OperatorNode extends CommandNode {
	constructor(key, description, args) {
		super(key, description, args);
	}
}

//Wrapper classes
/*	@class AliasNode:
 *      Wrapper for when a command/cvar aliases another */
class AliasNode extends Node {
	constructor(node_aliased, alias) {
		this.alias = alias;
		this.Node = node_aliased;
	}
}

/*********************************** DATA TYPES *****************************************/
/*	class Color:	 
 * */
class Color {
	constructor(r, g, b, a) {
		this.vals = new Uint8Array(3);
		this.vals[0] = r;
		this.vals[1] = g;
		this.vals[2] = b;
		
		this.alpha = (typeof a === 'undefined' || isNaN(a) || a < 0 || a > 1) ? 1 : 0;
	}
}

/********************************** INTERPRETER *****************************************/
export default class FieldInterp {
	constructor(flags) {
		/*  constants*/
		const KEY_ENABLE	= 'enable';
		const KEY_COLOR	 	= 'color';
		const KEY_OPACITY	= 'opacity';
		const KEY_THICKNESS	= 'thickness';
		const COLOR_BLACK 	= new Color(0, 0, 0);
		const COLOR_RED		= new Color(255, 0, 0);
		
		const AST_MAP_ROOT = new Node('', '', [
			new OperatorNode('?',											'',																																	null),				             //?
			new CommandNode('about',										'Display	',																														null),				             //about
			new CommandNode('alias',										'Assign an alias to a command.',																									null),				             //alias
			new Node('audio', 												'',																																						             //audio_																																		
			   [new CvarNode(KEY_ENABLE,									'Assign an alias to a command.',																									null)]),			             //audio_enable
			new CommandNode('bind',											'Binds an action to a keyboard or mouse event.',																					null),				             //bind
			new CommandNode('close',										'',																																	null),				             //close
			new CompositeNode('copy',										'',																																	null),				             //close
				new CommandNode('cut',										'',																																	null),				             //close
			new Node('dev', 												'',																																						             //dev_
			   [new CommandNode('bug', 										'',																																	null)]),			             //dev_bug
			new Node('draw', 												'',																																						             //draw_
			   [new CommandNode('line', 									'',																																	null),				             //draw_line
				new CommandNode('arc', 										'',																																	null),				             //draw_arc
				new CommandNode('rect', 									'',																																	null),				             //draw_rect
				new CommandNode('circle', 									'',																																	null),				             //draw_circle
				new CommandNode('polyline',									'',																																	null)]),			             //draw_polyline
			new CommandNode('echo',											'Echo string to console.',																											null),				             //echo
			new CommandNode('exit',											'',																																	null),				             //exit
			new CommandNode('export',										'',																																	null),				             //export
			new CommandNode('find',											'',																																	null),				             //find
			new Node('gui',													'',																																						             //gui_																																																		
			   [new Node('canvas',											'',																																						             //gui_canvas_
				   [new Node('grid', 										'',																																						             //gui_canvas_grid_
					   [new CvarNode(KEY_ENABLE, 							'',																																	null, 		true), 				 //gui_canvas_grid_enable
						new CvarNode(KEY_COLOR, 							'',																																	null,		'#000000'),			 //gui_canvas_grid_color
						new CvarNode(KEY_COLOR, 							'',																																	null,		0.05),	             //gui_canvas_grid_opacity
						new CvarNode(KEY_THICKNESS, 						'',																																	null,		1.0)]),			     //gui_canvas_grid_thickness
					new Node('ruler',										'',																																						             //gui_canvas_ruler_
					   [new CvarNode(KEY_ENABLE, 							'',																																	null,		true),	             //gui_canvas_ruler_enable
					   	new Node('border', 									'',																																						             //gui_canvas_ruler_border
						   [new CvarNode(KEY_ENABLE, 						'',																																	null,		true),	             //gui_canvas_ruler_border_enable
							new CvarNode(KEY_COLOR, 						'',																																	null,		'#FF0000'),          //gui_canvas_ruler_border_color
							new CvarNode(KEY_OPACITY, 						'',																																	null),				             //gui_canvas_ruler_border_opacity
							new CvarNode(KEY_THICKNESS, 					'',																																	null)]),			             //gui_canvas_ruler_border_thickness
						new Node('hash', 									'',																																						             //gui_ruler_hash_
						   [new CvarNode(KEY_ENABLE, 						'',																																	null,		true),	             //gui_canvas_ruler_hash_enable
							new CvarNode(KEY_COLOR, 						'',																																	null,		'#000000'),	         //gui_canvas_ruler_hash_color
							new CvarNode('length_factor',					'',																																	null,		0.4),				 //gui_canvas_ruler_hash_length
							new CvarNode(KEY_OPACITY, 						'',																																	null,		1.0),	             //gui_canvas_ruler_hash_opacity
							new CvarNode(KEY_THICKNESS, 					'',																																	null,		1.0)]),	             //gui_canvas_ruler_hash_thickness
						new CvarNode('min_spacing',							'',																																	null,		10),				 //gui_canvas_ruler_max_spacing
						new CvarNode('max_spacing',							'',																																	null,		2),				 	 //gui_canvas_ruler_min_spacing
						new CvarNode('pref_spacing',						'',																																	null,		10),				 //gui_canvas_ruler_pref_spacing
						new CvarNode('x_axis_width',						'',																																	null,		60),				 //gui_canvas_ruler_x_axis_width
						new CvarNode('y_axis_width',						'',																																	null,		60)])])]),	         //gui_canvas_ruler_y_axis_width
			new CommandNode('help',											'',																																	null),                           
			new CommandNode('import',										'',																																	null),				             //import
			new CommandNode('list',											'',																																	null),				             //list
			new CompositeNode('log',										'',																																	null, [				             //log
				null]),                                                                                                                                                                                                                          
			new CommandNode('name',											'Prints the current user\'s name.',																									null),				             //name
			new CompositeNode('open',										'',																																	null, [				             //open
				new CommandNode('recent',									'',																																	null),				             //open_recent
				null]),                                                                                                                                                                                                                          
		    new CommandNode('paste',										'',																																	null),	                         
			new CommandNode('quit',											'',																																	null),				             //quit
			new CommandNode('redo',											'',																																	null),				             //redo
			new CommandNode('restart',										'',																																	null),				             //restart
			new CompositeNode('save',										'',																																	null, [				             //save
				null]),                                                                                                                                                                                                                          
			new CompositeNode('session',									'',																																	null, [				             //session
	            null]),                                                                                                                                                                                                                          
			new CommandNode('stats',										'Prints statistical information about the given parameter.',																		null),				             //stats
			new CommandNode('unbind',										'',																																	null),				             //unbind
			new CommandNode('undo',											'',																																	null),				             //undo
			new CompositeNode('user',										'',																																	null, [				             //user
				new CommandNode('info',										'Prints information about the current user.',																						null)]),			             //user_info
			new CommandNode('verbose',										'Prints verbose information.',																										null),				             //verbose
	        new CommandNode('version',										'Prints current version.',																											null)				             //version
	    ]);
		
		AST_MAP_ROOT.forEach(Object.freeze);
	}
	
	search(text) {
		if (typeof text === 'string' || text instanceof String) {
			var curr_node = this.AST_MAP_ROOT,
				words = text.split(' '),
				tokens = words[0].split('_'),
				text_path = '';		//DEBUG ONLY

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
	}
}
