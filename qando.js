/* jshint node: true, devel: true */
'use strict';

const 
request = require('request');

var sessions = {};

function processInput(senderID, input, callback) {
	var session = sessions[senderID];
	if(!session) {
		sessions[senderID] = {location1: null, location2: null, title1: null, title2: null};	
		callback('Where do you want to start from, oida?');
	} else {
		if(!session.location1){
			searchLocation(input, function(answer) {
				sessions[senderID].location1 = answer.name;
				sessions[senderID].title1 = answer.title;
				callback('Where do you want to go?');
			}, function() {
				callback('Oida, I could not find a matching station, please try again.');
			});	       	
		} else {
			searchLocation(input, function(answer) {
				sessions[senderID].location2 = answer.name;
				sessions[senderID].title2 = answer.title;
				var location1 = sessions[senderID].location1;
				var title1 = sessions[senderID].title1;
				var location2 = sessions[senderID].location2;
				var title2 = sessions[senderID].title2;
				callback('Looking for a route between ' + title1 + ' and ' + title2);
				// call routes
				getRoute(location1, location2, function(answer) {
					callback(answer);
					delete sessions[senderID];	
				}, function() {
					delete sessions[senderID];	
					callback('Oida, something went wrong, please try again.');
				});
			}, function() {
				callback('Oida, I could not find a matching station, please try again.');
			});
		}
	}
}

function searchLocation(input, callback, error_cb) {
	var url = 'http://m.qando.at/wl_qando_mobileweb/ws/location?search=' + input;
	var answer = null;
	request(url, function(error, response, body) {
		if(!error && response.statusCode == 200) {
			var responseObj = JSON.parse(body);
			var name = (((responseObj.data || {}).pois || [])[0] || {}).location.properties.name;
			var title = (((responseObj.data || {}).pois || [])[0] || {}).location.properties.title;
			if(name && title) {
				callback({name: name, title: title});
			} else { error_cb(); }
		} else {
			error_cb();
		}
	});
}



function getRoute (from, to, callback, error_cb) {
	//var today = Date.now();
	//var now = Date.now();
	var url = "http://m.qando.at/wl_qando_mobileweb/ws/route?ptV=ptTrainR&ptV=ptTrainS&ptV=ptMetro&ptV=ptTram&ptV=ptBusCity&ptV=ptBusNight&ptV=ptBusRegion&ptV=ptTaxi&ptV=ptAirportBus&ptV=ptTrainCAT&modality=pt&aPP=1&aSS=1&ptRO=ptMinTime&ptMWT=15&ptWS=ptNormal&ptMC=3&aflT=1&walkMT=15&version=1.1&from=" + from + "&to=" + to;
	request(url, function(error, response, body) {
		if(!error && response.statusCode == 200) {

			var responseObj = JSON.parse(body);
			var trip = (((responseObj.data || {}).route || {}).trips || [])[0] || {};
			var totalDuration = trip.durationMinutes;
			var segments = trip.segments || [];
			if(segments.length == 0) { error_cb(); } else {
				var outcome = "The whole trip will take " + totalDuration + " minutes. \n";
				if(totalDuration > 20) outcome = outcome + "That long? Oida. They probably had too much spritzwein. \n"
				segments.forEach( function (segment) {
					if (segment.vehicle.name === "Fussweg") {
						outcome = outcome + "Walk (oida!) to " + segment.locationTo.properties.title + " for " + segment.durationMinutes + " minutes.\n";
					} else {
						var sentence = "Get on " + segment.vehicle.name + ", direction " + segment.vehicle.towards + "."
						outcome = outcome + sentence + "\n";	
					}
				});
				callback(outcome);
			}
		} else { error_cb(); }
	});
}


var qando = {
	processInput: processInput
};

module.exports = qando;


