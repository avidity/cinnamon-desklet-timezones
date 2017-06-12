/**
  Copyright (C) 2017 Avidity AB
  Author: Gunnar Hansson, code@avidity.se

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const St   = imports.gi.St;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const Mainloop = imports.mainloop;

function TimeZonesDesklet(metadata, id) {
  this._init(metadata, id);
}

TimeZonesDesklet.prototype = {
  __proto__: Desklet.Desklet.prototype,
  timer: null,
  timezones: [],

  _init: function(metadata, id) {
    Desklet.Desklet.prototype._init.call(this, metadata, id);

    this._cfg = { }
    this.ui = { };

    this.settings = new Settings.DeskletSettings(this._cfg, metadata.uuid, id)
    this.settings.bindProperty(Settings.BindingDirection.IN, 'rawTimezones', 'rawTimezones', this.readTimezoneConfig, null)
    this.settings.bindProperty(Settings.BindingDirection.IN, 'timeFormat', 'format', null, null)

    this.setupUI();
    this.readTimezoneConfig();
    this.updateTime();
  },

  readTimezoneConfig: function() {
    let zones = [];

    this._cfg.rawTimezones.split("\n").forEach(function(str) {
      let info = str.split('|');

      if(info[0] && info[1]) {
        zones.push({
          name: info[0],
          zone: info[1]
        });
      }
    });
    this.timezones = zones;
    this.resetTimeZoneList();
  },

  on_desklet_removed: function() {
    if(this.timer)
      Mainloop.source_remove(this.timer);
  },

  setupUI: function() {
    this.ui.arena = new St.BoxLayout( { vertical: true, style_class: 'tzd-arena' } );

    this.ui.ltContainer = new St.BoxLayout( { vertical: false, style_class: 'tzd-local-time-containter' } );
    this.ui.tzContainer = new St.BoxLayout( { vertical: true,  style_class: 'tzd-timezones-containter' } );


    this.ui.localTimeLabel = new St.Label({style_class: 'tzd-local-time-label'});
    this.ui.ltContainer.add(this.ui.localTimeLabel);

    this.ui.arena.add(this.ui.ltContainer);
    this.ui.arena.add(this.ui.tzContainer);

    this.resetTimeZoneList();
    this.setContent(this.ui.arena);
  },

  resetTimeZoneList: function() {
    // this.ui.tzContainer.destroy_children(); // FIXME: What to call to empty it?

    for(let i = 0; i < this.timezones.length; i++) {
      let tzLabelName = new St.Label( { text: this.timezones[i].name, style_class: 'tzd-tz-label-name' });
      let tzLabelZone = new St.Label( { style_class: 'tzd-tz-label-name' });

      let tzItem = new St.BoxLayout({ vertical: false })
      tzItem.add(tzLabelName, { x_align: St.Align.START, expand: true, x_fill: false });
      tzItem.add(tzLabelZone, { x_align: St.Align.END,   expand: true, x_fill: false });

      this.timezones[i].label = tzLabelZone;
      this.ui.tzContainer.add(tzItem);
    }
  },

  updateTime: function() {
    let now = GLib.DateTime.new_now_local();
    let format = this._cfg.format;

    this.ui.localTimeLabel.set_text(now.format(format));
    this.timezones.forEach(function(tz) {
      let text = "";
      let time = now.to_timezone(GLib.TimeZone.new(tz.zone));

      // FIXNE: Is there a tie-operator in js? would be a bit more elegant
      if(time.get_day_of_month() > now.get_day_of_month())
        text = "(+1) ";
      else if(time.get_day_of_month() < now.get_day_of_month())
        text = "(-1) ";

      text += time.format(format);

      tz.label.set_text(text);
    });

    this.timer = Mainloop.timeout_add_seconds(1, Lang.bind(this, this.updateTime));
  }
}

function main(metadata, id) {
  return new TimeZonesDesklet(metadata, id);
}
