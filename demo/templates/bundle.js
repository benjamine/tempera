define(['hogan'], function(){
    'use strict';
	var compile = function(source){
		var compiled = Hogan.compile(source);
		return function(data) {
			return compiled.render(data);
		};
	};
	$.tempera.templates['bundle/example'] = compile('<div>Hello {{name}}!</div>');
});