Tempera
=========

Asynchronous Javascript template loader.

javascript templates in browsers, using promises, and template engine agnostic.

``` js
	$('#sidebar-placeholder').tempera('sidebar/recent-visitors', data).done(function(){
		console.log('render complete');
	});
```

requires jQuery >= 1.5, and it's < 2KB (min+gzip)

Promises
--------

``` js
	$.when($.ajax('/api/recent-visitors.json')).done(function(data){
		$('#sidebar-placeholder').tempera('sidebar/recent-visitors', data).done(function(){
			$('#sidebar-placeholder').fadeIn();
		}).fail(function(){
			console.log('recent visitors are not available');
		});
	});
```

Asynchronous resources
-----------

By using promises tempera can asynchronously load required resources to load a template right before render.

Given this code:

``` js
    $.tempera.templatesBaseUrl = '/templates/';
	$.tempera.defaultCompiler = 'hogan';
	$.tempera.templateRequires.push({
		filter: /forms\/.*/,
		name: 'jquery.validations'
    });
    $('#main').tempera('forms/feature-request', userData);
```

tempera will:
- ```require(['jquery.validations', 'hogan'])``` (if an AMD loader exists. eg: RequireJS)
- ajax load template from ```/templates/forms/feature-requests```
- compile and cache the template
- render and fill target DOM element
- call done/fail promise callbacks

Multiple loading strategies
--------------------------

templates can be loading using 3 different strategies with out any change to your templates or loading code. They can be combined according to your needs, tempera will attempt to find templates in this order:

### 1. Embedded in script tags

Load templates from ```script[type=text/html]``` tags embedded in the current page.

``` js
	# default configuration
    $.tempera.embeddedIdPrefix = 'tmp-';

    $('#placeholder').tempera('sidebar/recent-visitors', data);
```

Will look for a script tag like this:

``` html
	<script id="tmp-sidebar-recent-visitors" type="text/html">
		recent visitors: {{count}}
	</script>
```

### 2. AMD bundled precompiled templates

If you're precompiling your templates on server (eg. using a tool like [grunt-hogan](https://github.com/automatonic/grunt-hogan)) you can configure tempera to use AMD bundles based on template name patterns. 

``` js
	$.tempera.templateRequires.push({
		filter: /forms\/.*/,
		name: 'forms-templates',
		templates: true
    }, {
    	name: 'main-templates',
    	templates: true
    });

    # will load precompiled templates from AMD module 'main-templates' before looking for this template
    $('#placeholder').tempera('sidebar/recent-visitors', data);
    # will also load the module 'forms-templates'
    $('#placeholder').tempera('forms/contact-me', data);
```

All functions exposed by template AMD modules are added to template cache, finally if the template is still not found in the cache, the template is requested individually with next strategy.

### 3. Ajax individual templates

Each template gets requested from server using ajax, compiled and cached (on ```$.tempera.templates```).

``` js
	# default configuration
    $.tempera.templatesBaseUrl = '/templates/';
    $.tempera.templateExt = '.html';

    $('#placeholder').tempera('sidebar/recent-visitors', data);
```

will request for template source file at url: ```/templates/sidebar/recent-visitors.html```


Tempera will attempt to find templates in this different sources, according to configuration and transparently to your javascript code, and without any change to your template source files.


Template engine agnostic
------------------------

If you are using hogan.js or handlebars.js all you need is:

```
	$.tempera.defaultCompiler = 'hogan'; // or 'handlebars'
```

tempera will autodetect any template engine that exposes a browser global (```window.Enginename```) and exposes a ```compile``` function.

Also, tempera can choose the template compiler per template based on:
- if embedded script tag, using ```data-template-engine``` attribute
- if bundled, using ```_templateEngine``` module property (NOT IMPLEMENTED YET)
- if ajax requested (ie. not compiled) using a comment in first line (NOT IMPLEMENTED YET) or an http response header

On render time, if the template compiler is not found, tempera will try to load it on-the-fly using ```require(['engineName'])```.

