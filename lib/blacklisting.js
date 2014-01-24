// module interfaces
exports.init = init;
exports.destroy = destroy;
exports.toggle = toggle;

// import required modules
var data = require('sdk/self').data;
var pageMod = require('sdk/page-mod');
var fileHandler = require('fileHandler');

// declare variables
var blacklistPageMod;
var activated = false;

/*
 * Init the blacklisting 
 */
function init() {
	// open file with default sites and apply callback
	fileHandler.streamFile('blacklist.txt', callback);
}

/**
 * Callback called when reading the blacklist file
 * 
 * @param {string} fileData
 */ 
function callback(fileData) {
	var blacklist = fileData.split('\r\n');
	
	// create a page mod to prevent the content of the blacklisted pages from displaying
	blacklistPageMod = pageMod.PageMod({
		include: blacklist,
		contentScriptFile: data.url('blacklisted.js'),
		contentScriptWhen: 'start',
	});
	
	activated = true;
}

/**
 * Destroy the blacklisting
 */
function destroy() {
	// destroy the page-mod
	blacklistPageMod.destroy();
	activated = false;
}

/**
 * Test if the blacklisting is activated
 * 
 * @returns {boolean} activated
 */
function isActivated() {
	return activated;
}

/**
 * Toggle the blacklisting
 */
function toggle() {
	if(!isActivated()) {
		// if not activated, activate
		init();
	} else {
		// else destroy
		destroy();
	}
}