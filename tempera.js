var moduleFactory = function(exports) {
    'use strict';
    var $ = window.jQuery;
    var tmp = $.tempera = exports;
    tmp.templates = {};
    tmp.templateRequires = [];
    tmp.compilers = {
        noop: {
            compile: function(source){
                return function(){
                    return source;
                };
            }
        }
    };
    tmp.templatesBaseUrl = '/templates/';
    tmp.templateExt = '.html';
    tmp.embeddedIdPrefix = 'tmp-';

    tmp.findEngine = function(name, candidate) {
        var engine = window[name] || window[name.substr(0, 1).toUpperCase() + name.substr(1)];
        if (candidate && typeof candidate.compile === 'function') {
            engine = candidate;
        }
        if (!engine) {
            return;
        }
        if (typeof engine.compile === 'function') {
            try {
                var test = engine.compile('');
                if (test) {
                    if (typeof test === 'function') {
                        return {
                            engine: engine,
                            compile: function compile(source) {
                                return engine.compile(source);
                            }
                        };
                    }
                    if (typeof test.render === 'function') {
                        return {
                            engine: engine,
                            compile: function compile(source){
                                var compiled = engine.compile(source);
                                return function render() {
                                    return compiled.render.apply(compiled, arguments);
                                };
                            }
                        };
                    }
                }
            } catch(err) {
                return;
            }
        }
    };

    tmp.compiler = function (name) {
        return $.Deferred(function (defer) {
            if (!name) {
                return defer.resolve(tmp.compilers.noop);
            }
            var compiler = tmp.compilers[name];
            if (compiler) {
                return defer.resolve(compiler);
            }
            compiler = tmp.findEngine(name);
            if (compiler) {
                tmp.compilers[name] = compiler;
                return defer.resolve(compiler);
            }
            if (window.require) {
                /* global require */
                require([name], function(engine){
                    compiler = tmp.compilers[name] || tmp.findEngine(name, engine);
                    if (compiler) {
                        tmp.compilers[name] = compiler;
                        return defer.resolve(compiler);
                    }
                    defer.reject(new Error('template compiler load failed: ' + name));
                }, defer.reject);
                return;
            }
            defer.reject(new Error('template compiler not found: ' + name));
        }).promise();
    };

    tmp.getCompilerName = function(source) {
        if (!source) {
            return null;
        }
        // if hogan is present, use it as default
        if (!tmp.defaultCompiler && window.Hogan) {
            tmp.defaultCompiler = 'hogan';
        }
        return tmp.defaultCompiler;
    };

    tmp.getTemplateUrl = function(name) {
        var isAbsolute = /^(\/|https?\:)/i.test(name);
        return isAbsolute ? name : tmp.templatesBaseUrl + name + tmp.templateExt;
    };

    tmp.requireModulesFor = function(name) {
        return $.Deferred(function (defer) {
            if (!tmp.templateRequires) {
                return defer.resolve();
            }
            var names = [];
            var modules = [];
            var i, length = tmp.templateRequires.length;
            var module;
            for (i = 0; i < length; i++) {
                module = tmp.templateRequires[i];
                if (!module.loaded && !module.filter || module.filter.test(name)) {
                    names.push(module.name);
                    modules.push(module);
                }
            }
            if (names.length < 1) {
                return defer.resolve();
            }
            require(names, function(){
                length = arguments.length;
                for (i = 0; i < length; i++) {
                    module = modules[i];
                    if (module.loaded) continue;
                    module.loaded = true;
                    if (module.templates) {
                        $.extend(tmp.templates, arguments[i]);
                    }
                }
                defer.resolve();
            }, defer.reject);
        }).promise();
    };

    var loadTemplateHttp = function(defer, name){
        $.ajax({ url: tmp.getTemplateUrl(name) }).then(function (source) {
            tmp.compiler(tmp.getCompilerName(source)).then(function (compiler) {
                try {
                    var render = tmp.templates[name] = compiler.compile(source);
                    defer.resolve(render);
                } catch (err) {
                    defer.reject(err);
                }
            }, defer.reject);
        }, defer.reject);
    };

    var loadTemplateFromElement = function(defer, name, element){
        var source = element.html();
        tmp.compiler(element.data('template-engine') || tmp.getCompilerName(source)).then(function (compiler) {
            try {
                var render = tmp.templates[name] = compiler.compile(source);
                defer.resolve(render);
            } catch (err) {
                defer.reject(err);
            }
        }, defer.reject);
    };

    tmp.template = function (name) {
        return $.Deferred(function (defer) {
            var render = tmp.templates[name];
            if (render) {
                return defer.resolve(render);
            }
            tmp.requireModulesFor(name).then(function(){
                render = tmp.templates[name];
                if (render) {
                    return defer.resolve(render);
                }
                var templateElement = $('#' + (tmp.embeddedIdPrefix + name).replace(/\//g, '-'));
                if (templateElement.length && templateElement.prop('tagName') === 'SCRIPT') {
                    return loadTemplateFromElement(defer, name, templateElement);
                }
                return loadTemplateHttp(defer, name);
            }, defer.reject);
        }).promise();
    };

    tmp.render = function (name, data) {
        return $.Deferred(function (defer) {
            var cachedRender = tmp.templates[name];
            if (cachedRender) {
                try {
                    defer.resolve(cachedRender(data));
                } catch (err) {
                    defer.reject(err);
                }
                return;
            }
            return tmp.template(name).then(function (render) {
                try {
                    defer.resolve(render(data));
                } catch (err) {
                    defer.reject(err);
                }
            }, defer.reject);
        }).fail(function(err){
            err.temperaError = err.message;
            err.templateName = name;
            err.templateData = data;
            if (!window.console || !window.console.error) { return; }
            /* global console */
            console.error(err);
        }).promise();
    };

    tmp.renderTo = function (element, name, data) {
        return $.Deferred(function (defer) {
            try {
                var html = tmp.tryCachedRender(name, data);
                if (typeof html !== 'undefined') {
                    $(element).html(html);
                    return defer.resolve();
                }
            } catch (err) {
                defer.reject(err);
            }
            return tmp.render(name, data).then(function (html) {
                $(element).html(html);
                defer.resolve();
            }, defer.reject);
        }).done(function(){
            $(element).trigger('render.tempera');
        }).fail(function(err){
            $(element).trigger('rendererror.tempera', err);
        }).promise();
    };

    tmp.tryCachedRender = function(name, data) {
        var render = tmp.templates[name];
        if (render) {
            return render(data);
        }
    };

    tmp.renderSync = function(name, data) {
        var render = tmp.templates[name];
        if (!render) {
            throw new Error('template not found: ' + name);
        }
        return render(data);
    };

    tmp.renderSyncTo = function(element, data) {
        element.html(this.renderSync(name, data));
    };

    $.fn.tempera = function (name, data) {
        return tmp.renderTo(this, name, data);
    };

    $.fn.temperaSync = function (name, data) {
        return tmp.renderSyncTo(this, name, data);
    };

};
if (typeof require === 'undefined') {
    moduleFactory(window.tempera = {});
} else {
    /* global define */
    define(['exports'], moduleFactory);
}