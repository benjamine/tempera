Tempera
=========

Asynchronous Javascript template loader.

javascript templates in browsers, using promises, and template engine agnostic.

``` js
	$('#sidebar-placeholder').tempera('sidebar/recent-visitors', data).done(function(){
		console.log('render complete');
	});
```

Features
-------

- asynchronous loading of templates, templates bundles and template engines (using jQuery.Deferred)
- template engine agnostic
	- most engines get detected automatically
	- configure default using ```$.tempera.defaultCompiler``` (hogan is used if present)
	- engine (template compiler) can be specified on template source
	- if not found an attempt to ```require([compilername])``` is done
- supports multiple template sources:
	- individual html files loaded with ajax (use ```$.tempera.templatesBaseUrl```)
	- amd bundles of precompiled templates (use ```$.tempera.modules.myamdmodule = /^prefix.*/```)
	- embedded templates in ```script[type=text/html]``` tags (by default '#tmp-<template-name>' is used if found, ```/``` is converted ```-```)
