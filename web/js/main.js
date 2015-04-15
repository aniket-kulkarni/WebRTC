require.config({

	baseUrl:"js",
	paths : {
		jquery : "../vendor/jquery/jquery-2.1.1",
		foundation : "../vendor/foundation/js/foundation.min",
		backbone : "../vendor/backbone/backbone",
		underscore : "../vendor/backbone/underscore",
		text : "../vendor/backbone/text",
		templates : "../templates"
	},
	shim : {
		"foundation" : ["jquery"],
		'underscore': {
			exports: '_'
		},
		'backbone': {
			deps: ['underscore', 'jquery'],
			exports: 'Backbone'
		}
	}

});

require(["app"],function(app) {

	$(document).ready(function() {
		app.init();		
	});

});