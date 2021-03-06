var data = require("sdk/self").data;
var password = require("password");
var logs = require('logs');
var blacklisting = require('blacklisting');
var whitelisting = require('whitelisting');
var utils = require('utils');
var panels = require("sdk/panel");
var tabs = require('sdk/tabs');
var tabsUtils = require('sdk/tabs/utils');
var pageMod = require('sdk/page-mod');
var ss = require('sdk/simple-storage');
var sbtoggle = require('sbtoggle');
var timeConstraints = require('timeConstraints');
var _ = require('sdk/l10n').get;
var stats = require('statistics');
var Request = require('sdk/request').Request;

var tbb,
	menu_panel,
	settings_worker,
	authenticated = false;

exports.main = main;
exports.onUnload = onUnload;

function main(options) {
	"use strict";

	//Check if the password has been set by the user, if not, show prompt
	if(!password.isDefinedPassword()) {
		authenticated = true;
		tabs.open(data.url('panels/settings.html'));
	}
	
	menu_panel = panels.Panel({
		width: 230,
		height: 102,
		contentURL: data.url("panels/menu.html"),
		contentScriptFile: [data.url("jquery-2.0.3.js"), data.url("panels/menu.js")],
		contentScriptOptions: {
			activate_ffc: _('menu-panel-activate'),
			deactivate_ffc: _('menu-panel-deactivate'),
		}
	});

	tbb = require("toolbarbutton").ToolbarButton({
		id: "FfC-start",
		label: "Firefox for children",
		image: data.url("logo-off.png"),
		panel: menu_panel
	});

	menu_panel.port.on('addBlacklist', function () {
		if(sbtoggle.isActivated()) {
			parentUI.auth.port.emit('addBlacklist');
			parentUI.auth.show();
		} else {
			openAddToListDialog('blacklist');
		}
		menu_panel.hide();
	});

	menu_panel.port.on('addWhitelist', function () {
		if(sbtoggle.isActivated()) {
			parentUI.auth.port.emit('addWhitelist'); 
			parentUI.auth.show();
		} else {
			openAddToListDialog('whitelist');
		}
		menu_panel.hide();
	});
	
	menu_panel.port.on('activate', function () {
		if(!sbtoggle.isActivated()) {
			if(!authenticated) {
				parentUI.auth.port.emit("isoff"); //tells auth form that safe browsing is now on
				parentUI.auth.show();
			} else {
				activateSafeBrowsing();
			}
			authenticated = false;
		}
		menu_panel.hide();
	});

	menu_panel.port.on('deactivate', function () {
		if(sbtoggle.isActivated()) {
			parentUI.auth.port.emit("ison"); //tells auth form that safe browsing is now off
			parentUI.auth.show();
		}
		menu_panel.hide();
	});

	menu_panel.port.on('options', function () {
		if(!authenticated) {
			parentUI.auth.port.emit("options"); //tells auth form that options panel should be shown next
			parentUI.auth.show();
		} else {
			menu_panel.hide();
			openSettingsTab();
		}
	});

	menu_panel.port.on('about', function () {
		menu_panel.hide();
		parentUI.about.show();
	});

	if(options.loadReason === 'install') {
		tbb.moveTo({
			toolbarID: "nav-bar",
			forceMove: false // only move from palette
		});
	}

	if(!ss.storage.statsId) {
		console.log('calling stats.init');
		stats.init();
	} else {
		console.log('ss.storage.statsId: ' + ss.storage.statsId);
	}
	
	// if safe navigation is enabled, disable it
	if(sbtoggle.isActivated()) {
		sbtoggle.deactivate();
	}

	pageMod.PageMod({
		include: data.url('panels/settings.html'),
		contentScriptFile: [
  			data.url('jquery-2.0.3.js'),
  			data.url('js/jquery-ui-1.10.4.min.js'),
			data.url('js/bootstrap.min.js'),
			data.url('js/bootstrap-select.min.js'),
			data.url('js/jquery.tablesorter.js'),
			data.url('js/jquery.tablesorter.widgets.js'),
			data.url('js/jquery.tablesorter.pager.js'),
			data.url('panels/settings.js'),
			data.url('panels/settings-password.js'),
			data.url('panels/settings-filtering.js'),
			data.url('panels/settings-lists.js'),
			data.url('panels/settings-reports.js'),
			data.url('panels/settings-time-constraints.js'),
			data.url('panels/settings-presentation-tour.js')
		],
		contentScriptOptions: {
			change_pass_value: _('settings-password-change-value'),
			set_private_question_value: _('settings-password-set-private-question-value'),
			page_size_title: _('settings-reports-history-page-size-title'),
			page_num_title: _('settings-reports-history-page-num-title'),
			search_blacklist: _('settings-lists-search-backlist'),
			url_add_prompt: _('settings-add-url-prompt'),
			blacklist: _('blacklist'),
			whitelist: _('whitelist'),
			new_category: _('settings-new-category'),
			no_category: _('settings-lists-no-category-defined'),
			password_change_success: _('settings-password-change-success'),
			welcome_text: _('settings-welcome-text'),
			welcome_advice: _('settings-welcome-advice'),
			filter_set: _('settings-filtering-set'),
			no_match: _('settings-lists-no-match'),
			no_category_error: _('settings-no-category-selected-error'),
			malformed_url: ('settings-malformed-url'),
			already_present_url: _('settings-already-present-url'),
			time_limit_type_set: _('settings-limit-time-type-set'),
			time_limit_set: _('settings-limit-time-limit-set'),
			hour_constraints_use_set: _('settings-hour-constraints-use-set'),
			hour_constraints_type_set: _('settings-hour-constraints-type-set'),
			hour_constraints_set: _('settings-hour-constraints-hours-set'),
			add_url: _('settings-add-url'),
			host_not_added: _('settings-host-not-added'),
			check_syntax: _('settings-check-syntax'),
			no_time_spent: _('settings-no-time-spent'),
			close_reactivate: _('settings-close-reactivate'),
			success: _('settings-reports-login-success'),
			fail: _('settings-reports-login-fail'),
			yes: _('yes'),
			no: _('no'),
			next: _('next'),
			end: _('end'),
			end_tour: _('settings-presentation-tour-end-tour'),
			panel_title: _('settings-presentation-tour-panel-title'),
			step0: _('settings-presentation-tour-step0'),
			step1: _('settings-presentation-tour-step1'),
			step2: _('settings-presentation-tour-step2'),
			step3: _('settings-presentation-tour-step3'),
			step4: _('settings-presentation-tour-step4'),
			step5: _('settings-presentation-tour-step5'),
			step6: _('settings-presentation-tour-step6'),
			step7: _('settings-presentation-tour-step7'),
			step8: _('settings-presentation-tour-step8'),
			step9: _('settings-presentation-tour-step9'),
			step10: _('settings-presentation-tour-step10'),
			step11: _('settings-presentation-tour-step11'),
			step12: _('settings-presentation-tour-step12'),
			step13: _('settings-presentation-tour-step13'),
			step14: _('settings-presentation-tour-step14'),
			step15: _('settings-presentation-tour-step15'),
			step16: _('settings-presentation-tour-step16'),
			step17: _('settings-presentation-tour-step17'),
		},
		onAttach: function (worker) {
			worker.tab.on('close', function () {
				authenticated = false;
			});
			if(!authenticated) {
				worker.tab.close();
			}
			if(!password.isDefinedPassword()) {
				worker.port.emit('set_first_password');
			} else {
				worker.port.emit('show_filtering');
			}
			worker.port.emit('is_activated', sbtoggle.isActivated());
			blacklisting.setPort(worker.port);
			whitelisting.setPort(worker.port);
			logs.setPort(worker.port);
			timeConstraints.setPort(worker.port);
			attachSettingsListeners(worker);
			settings_worker = worker;
		}
	});
}

function onUnload(reason) {
	// delete all storages at uninstall
	if(reason === 'uninstall') {
		stats.extensionUninstalled();

		delete ss.storage.isActivated;
		delete ss.storage.pass;
		delete ss.storage.salt;
		delete ss.storage.privateQuestion;
		delete ss.storage.privateAnswer;

		delete ss.storage.removedDefaultBlacklistElements;
		delete ss.storage.customBlacklist;
		delete ss.storage.removedDefaultWhitelistElements;
		delete ss.storage.customWhitelist;

		delete ss.storage.history;
		delete ss.storage.timeReport;
		delete ss.storage.filter;
		
		delete ss.storage.timeConstraints;
	}
}

/**
 * This section initializes the different panels used by the extension
 */
var parentUI = (function () { //set up all the necessary panels in a "parentUI" object
	"use strict";
	var auth_panel = panels.Panel({ //auth_panel is used to ask the user for his password before proceeding
		width: 300,
		height: 250,
		contentURL: data.url('panels/authentication.html'),
		contentScriptFile: [data.url('jquery-2.0.3.js'), data.url('panels/authentication.js')],
		contentScriptOptions: {
			disable_safe_browsing: _('disable-safe-browsing'),
			enable_safe_browsing: _('enable-safe-browsing'),
			private_question_prompt: _('authentication-private-question-prompt'),
			password_reinitialized: _('authentication-password-reinitialized'),
			wrong_answer: _('wrong-answer'),
			privateQuestion: password.getPrivateQuestion(),
		}
	});

	var about_panel = panels.Panel({ //auth_panel is used to ask the user for his password before proceeding
		width: 490,
		height: 345,
		contentURL: data.url('panels/about.html'),
		contentScriptFile: [data.url('jquery-2.0.3.js'), data.url('js/jquery-ui-1.10.4.min.js'), data.url('js/jquery.flip.min.js'), data.url('panels/about.js')],
		contentScriptOptions: {

		}
	});

	return {auth: auth_panel, about: about_panel};
}());

/**
 * Respond to events triggered by user input in the panels
 */ 
parentUI.auth.on('show', function () {
	parentUI.auth.port.emit('show');
});

parentUI.auth.port.on("answer", function (text) { //text contains password given by user
	passwordAnswer(text);
});

parentUI.auth.port.on("answer-lock", function (text) { //text contains password given by user
	passwordAnswer(text, 'lock');
});

parentUI.auth.port.on("answer-unlock", function (text) { //text contains password given by user
	passwordAnswer(text, 'unlock');
});

parentUI.auth.port.on("answer-options", function (text) { //text contains password given by user
	passwordAnswer(text, 'options');
});

parentUI.auth.port.on("answer-addBlacklist", function (text) { //text contains password given by user
	passwordAnswer(text, 'addBlacklist');
});

parentUI.auth.port.on("answer-addWhitelist", function (text) { //text contains password given by user
	passwordAnswer(text, 'addWhitelist');
});

parentUI.auth.port.on('private_answer', function (answer) {
	var result = password.checkPrivateAnswer(answer);
	if(result) {
		password.reinitializePass();
	}
	parentUI.auth.port.emit('private_answer_result', result);
});

/**
 * Open the "add to list" dialog
 */
function openAddToListDialog(listType) {
	var data = require('sdk/self').data,
		tabs = require('sdk/tabs');
	var win = require('sdk/window/utils').openDialog({
		features: Object.keys({
			chrome: true,
			centerscreen: true,
			resizable: true,
			scrollbars: true
		}).join() + ',width=370,height=250',
		name: 'Add site to ' + listType
	});
	win.addEventListener('load', function () {
		tabs.activeTab.on('ready', function (tab) {
			var worker = tab.attach({
				contentScriptFile: [
					data.url('jquery-2.0.3.js'),
					data.url('js/bootstrap.min.js'),
					data.url('js/bootstrap-select.min.js'),
					data.url('panels/addList.js')
				],
				contentScriptOptions: {
					listType: listType,
					listName: _(listType),
					addTo: _('add-list-add-to'),
					newCategoryPrompt: _('add-list-new-category-prompt'),
					alreadyExists: _('add-list-category-already-exists'),
					selectCategory: _('add-list-select-category-advice')
				}
			});

			switch(listType) {
				case 'blacklist':
					worker.port.on('add_blacklist', function(category) {
						'use strict';
						blacklisting.addActiveURIToWhitelist(category);
						tab.close();
					});
					worker.port.emit('categories', blacklisting.customBlacklistCategories());
					break;
				case 'whitelist':
					worker.port.on('add_whitelist', function(category) {
						'use strict';
						whitelisting.addActiveURIToWhitelist(category);
						tab.close();
					});
					worker.port.emit('categories', whitelisting.customWhitelistCategories());
			}
		});
		tabs.activeTab.url = data.url('panels/addList.html');
	});
}

/**
 * Open the settings tab
 */
function openSettingsTab() {
	var settingsTabs = utils.getTabsFromURL(data.url('panels/settings.html'));
	if(settingsTabs.length === 0) {
		tabs.open(data.url('panels/settings.html'));
	} else {
		settingsTabs[0].activate();
	}
}

/**
 * Manage password answer
 *
 * @param {string} the password answer
 */
function passwordAnswer(text, param) {
	"use strict";
	var success;
	if(password.checkPass(text)) { //Proceed and open choice_panel if password ok
		success = true;
		parentUI.auth.hide();
		switch(param) {
			case 'lock':
				activateSafeBrowsing();
				break;
			case 'unlock':
				sbtoggle.deactivate();
				menu_panel.port.emit('deactivated');
				break;
			case 'options':
				openSettingsTab();
				break;
			case 'addBlacklist':
				openAddToListDialog('blacklist');
				break;
			case 'addWhitelist':
				openAddToListDialog('whitelist');
				break;
		}
		parentUI.auth.port.emit("auth_success");
	} else {
  		success = false;
		//If password was wrong, keep auth_panel open, with an error message displayed
		parentUI.auth.port.emit("auth_fail");
	}
  	authenticated = success;
  	logs.addToLoginLog(success);
}

function activateSafeBrowsing() {
	// close options tab if opened
	if(settings_worker && settings_worker.tab) {
		settings_worker.tab.close();
	}
	sbtoggle.activate();
	menu_panel.port.emit('activated');
}

function attachSettingsListeners(worker) {
	worker.port.on('save_settings', function () {
		worker.tab.close();
	});

	worker.port.on("tab_choice", function (choice) {
		"use strict";
		switch (choice) {
			case "filtering":
				worker.port.emit("current_filter", ss.storage.filter);
				break;
			case "pass":
				break;
			case "lists":
				break;
			case "reports":
				break;
			case "limit_time":
				break;
		}
	});

	worker.port.on("update_pass", function (pwords) {
		"use strict";
		//this is triggered when the user submits the change password form in the settings
		var result = password.changePass(pwords.oldpass, pwords.newpass);
		worker.port.emit("change_pass_result", result);
	});

	worker.port.on('set_private_question', function (question, answer) {
		password.setPrivateQuestion(question, answer);
		parentUI.auth.port.emit('private_question_set', question);
	});

	worker.port.on('filter', function (val) { //update filtering settings
		if(['none', 'wlist', 'blist'].indexOf(val) !== -1) {
			ss.storage.filter = val;
			worker.port.emit('filter_save_success');
		}
	});

	// Init lists when tabs are clicked
	worker.port.on('lists_tab_choice', function (val) {
		'use strict';
		switch(val) {
			case 'default-blacklist':
				blacklisting.init();
				break;
			case 'default-whitelist':
				whitelisting.init();
				break;
			case 'custom-blacklist':
				blacklisting.initCustomBlacklist();
				break;
			case 'custom-whitelist':
				whitelisting.initCustomWhitelist();
				break;
		}
	});

	worker.port.on('default_blacklist_search', function (searchQuery) {
		blacklisting.searchInDefaultBlacklist(searchQuery);
	});

	worker.port.on('remove_default_blacklist', function (elements, category) {
		blacklisting.removeElementsFromDefaultBlacklist(elements, category);
	});

	worker.port.on('add_default_blacklist', function (elements, category) {
		blacklisting.addElementsToDefaultBlacklist(elements, category);
	});

	worker.port.on('remove_default_whitelist', function (elements, category) {
		whitelisting.removeElementsFromDefaultWhitelist(elements, category);
	});

	worker.port.on('add_default_whitelist', function (elements, category) {
		whitelisting.addElementsToDefaultWhitelist(elements, category);
	});

	worker.port.on('remove_custom_blacklist', function (elements, category) {
		blacklisting.removeElementsFromCustomBlacklist(elements, category);
	});

	worker.port.on('add_custom_blacklist', function (uri, category) {
		blacklisting.addElementToCustomBlacklist(uri, category);
	});

	worker.port.on('remove_custom_whitelist', function (elements, category) {
		whitelisting.removeElementsFromCustomWhitelist(elements, category);
	});

	worker.port.on('add_custom_whitelist', function (uri, category) {
		whitelisting.addElementToCustomWhitelist(uri, category);
	});

	worker.port.on('add_custom_blacklist_category', function (category) {
		blacklisting.addCustomBlacklistCategory(category);
	});

	worker.port.on('add_custom_whitelist_category', function (category) {
		whitelisting.addCustomWhitelistCategory(category);
	});

	worker.port.on('remove_custom_blacklist_category', function (category) {
		blacklisting.removeCustomBlacklistCategory(category);
	});

	worker.port.on('remove_custom_whitelist_category', function (category) {
		whitelisting.removeCustomWhitelistCategory(category);
	});

	// Init lists when tabs are clicked
	worker.port.on('reports_tab_choice', function (val) {
		'use strict';
		switch(val) {
			case 'login':
				logs.getLoginLog();
				break;
			case 'history':
				logs.getHistoryLog();
				break;
			case 'time':
				logs.getTimeLog();
				break;
		}
	});

	// Clear logs
	worker.port.on('clear_log', function (logType) {
		'use strict';
		switch(logType) {
			case 'login':
				logs.clearLoginLog();
				break;
			case 'history':
				logs.clearHistoryLog();
				break;
			case 'time':
				logs.clearTimeLog();
				break;
		}
	});

	worker.port.on('time-constraints_tab_choice', function (val) {
		'use strict'
		timeConstraints.init();
		switch(val) {
			case 'limit-time':
				worker.port.emit('limit_time_type', ss.storage.limitTimeType);
				break;
			case 'hour-constraints':
				worker.port.emit('hour_constraints_use', ss.storage.useHourConstraints);
				worker.port.emit('hour_constraints_type', ss.storage.hourConstraintsType);
				break;
		}
	});

	worker.port.on('limit_time_type_set', function (val) {
		if(['overall', 'categories'].indexOf(val) !== -1) {
			ss.storage.limitTimeType = val;
			worker.port.emit('limit_time_type_save_success');
		}
	});

	worker.port.on('limit_time_choice', function (category, value) {
		timeConstraints.setLimit(category, value);
	});

	worker.port.on('hour_constraints_use_set', function (val) {
		ss.storage.useHourConstraints = val;
		worker.port.emit('hour_constraints_use_save_success');
	});

	worker.port.on('hour_constraints_type_set', function (val) {
		if(['overall', 'categories'].indexOf(val) !== -1) {
			ss.storage.hourConstraintsType = val;
			worker.port.emit('hour_constraints_type_save_success');
		}
	});

	worker.port.on('hour_constraint_change', function (category, day, period, values) {
		timeConstraints.setHourConstraint(category, day, period, values);
	});
}
