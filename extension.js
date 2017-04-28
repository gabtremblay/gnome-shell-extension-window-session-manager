const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
//const Extension = ExtensionUtils.getCurrentExtension();
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
// this produces errors
//const GFile = imports.gi.GFile;
const Gio = imports.gi.Gio;

const HOME_PATH = GLib.get_home_dir();
const LWSM_PATH = HOME_PATH + '/.lwsm';
const LWSM_CFG_FILE_PATH = HOME_PATH + '/.lwsm/config.json';
const LWSM_SESSION_PATH = LWSM_PATH + '/sessionData';
const LWSM_CMD = HOME_PATH + '/.local/share/gnome-shell/extensions/lwsm@johannes.super-productivity.com/lwsm';
const DEFAULT_INDICATOR_TEXT = 'ws';

const WindowSessionIndicator = new Lang.Class({
  Name: 'WindowSessionIndicator',
  Extends: PanelMenu.Button,

  _init: function () {
    this.parent(0.0, 'Window Session Indicator', false);
    this._buildUi();
    //this._refresh();
  },

  _buildUi: function () {
    let button = new St.Bin({
      style_class: 'panel-button',
      reactive: true,
      can_focus: true,
      x_fill: true,
      y_fill: false,
      track_hover: true
    });
    let icon = new St.Icon({
      icon_name: 'system-run-symbolic',
      style_class: 'system-status-icon'
    });
    button.set_child(icon);

    this.statusLabel = new St.Label({
      y_align: Clutter.ActorAlign.CENTER,
      text: DEFAULT_INDICATOR_TEXT
    });
    this.statusLabel.add_style_class_name('window-session-indicator-label');

    let topBox = new St.BoxLayout();
    //topBox.add_actor(button);
    topBox.add_actor(this.statusLabel);
    this.actor.add_actor(topBox);
    topBox.add_style_class_name('window-session-indicator');

    this._sessionItems = [];
    this._sessionSection = new PopupMenu.PopupMenuSection();
    this.menu.addMenuItem(this._sessionSection);
    global.log('super, SUPER--------------------------------------------------------------------------');

    this._createMenuItems();
  },

  _createMenuItems: function () {
    this.lwsmSessionDir = Gio.file_new_for_path(LWSM_SESSION_PATH);
    const enumeratedChildren = this.lwsmSessionDir.enumerate_children('*', 0, null, null);

    let fileInfo;
    let files = [];
    while ((fileInfo = enumeratedChildren.next_file(null, null)) !== null) {
      if (!fileInfo.get_is_hidden() && !isDirectory(fileInfo)) {
        files.push(fileInfo);
      }
    }
    enumeratedChildren.close(null, null);

    files.forEach(Lang.bind(this, function (file) {
      this._sessionSection.addMenuItem(this.createItem(file));
    }));
  },

  createItem: function (fileInfo) {
    const fileName = fileInfo.get_display_name().replace('.json', '');
    const item = new PopupMenu.PopupMenuItem('Load ' + fileName);
    item.connect('activate', Lang.bind(this, function () {
      this._activateSession(fileName);
    }));
    return item;
  },

  _activateSession: function (sessionName) {
    global.log('super', sessionName);

    const result = this._startSession(sessionName);
    global.log('super RESULT', JSON.stringify(result));
  },

  _startSession: function (sessionName) {
    const that = this;
    //global.log('super Return Val', returnVal);
    this.statusLabel.set_text('loading "' + sessionName + '"');

    let [success, pid] = GLib.spawn_async(null,
      [LWSM_CMD, 'restore', sessionName],
      null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
      null);

    if (!success) {
      global.log('super ERROR NO SUCCESS');
      that.statusLabel.set_text('ERROR');
    } else {
      GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, function (pid, status) {
        GLib.spawn_close_pid(pid);
        if (status !== 0 && status !== '0') {
          global.log('super ERROR');
          that.statusLabel.set_text('ERROR');
        }
        else {
          global.log('super SUCCESS', status);
          that.statusLabel.set_text(DEFAULT_INDICATOR_TEXT);
        }
      });
    }
  }
});

let wsMenu;

function init() {
}

function enable() {
  wsMenu = new WindowSessionIndicator;
  Main.panel.addToStatusArea('ws-indicator', wsMenu);
}

function disable() {
  wsMenu.stop();
  wsMenu.destroy();
}

function isDirectory(file) {
  return Gio.FileType.DIRECTORY === file.get_file_type();
}