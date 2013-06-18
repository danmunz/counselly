//Initialize some global variables
var myaddress = "";
var circleonce = false;
var results = [];
var markers = [];

//UPDATE THE ARRAY 'RESULTS' WITH RESULTS THAT MATCH THE FILTERS
function listUpdater() {

	//Grab form inputs and store them as values			
	var mapradius = Number($('#distance').val()) * 1609.34;
	var svcs = $(".chzn-select-svc").val();
	var langs = $(".chzn-select-lang").val();
				
	//Clear the existing results array
	results = []; 
	
	//Clear the map circle, if there is one already
	if (circleonce) {
		circle.setMap(null);
	}
				
	zoomscaler(Number($('#distance').val())); //Re-zoom the map to fit it, roughly
	
	map.setCenter(currentpos.getPosition().lat(), currentpos.getPosition().lng()); //Re-center the map around the original address marker
	
	circle = map.drawCircle({ //Draw a new circle representing the entered radius
		lat: map.getCenter().lat(),
		lng: map.getCenter().lng(),
		strokeWeight: 0,
		fillColor: '#9aaeaf',
		fillOpacity: 0.4,
		radius: mapradius
	});
	
	circleonce = true; //Indicate that there's an existing circle now
				
	//Add eligible agencies to the results array
	$.each(hudagencies.features, function (i, agency) {
		
		//Calculate the distance each one is from the original address marker
		var distance = calcDistance(currentpos.getPosition().lat(), currentpos.getPosition().lng(), parseFloat(agency.agc_ADDR_LATITUDE), parseFloat(agency.agc_ADDR_LONGITUDE));
		
		//Add any within-range centers to the 'results' array
		if (distance <= mapradius/1609.34){
		results.push(agency);
		} //Add any centers within range to 'results'
		
		return results;
			
	});
	
	console.log("After filtering just for distance there are " + results.length + " results.");
	
	if (svcs !== null){
		$.each(svcs, function (j, svc) { //Check if it matches the services selected
			results = _.filter(results, function (agency) {return agency.services.indexOf(svc) !== -1;});
		});
	}else{
		svcs = ["all services"];
	}

	console.log("After filtering for distance and service there are " + results.length + " results.");
	
	if (langs !== null){
		$.each(langs, function (k, lang) { //Check if it matches the languages selected
			results = _.filter(results, function (agency) {return agency.languages.indexOf(lang) !== -1;});
		});
	}else{
		langs = ["any language"];
	}
	
	console.log("After filtering for distance, service and language there are " + results.length + " results.");
	
	if (mapradius == 0){
		$('#madlib').html('Adjust the filters below to find housing counselors.');
	}else{
		$('#madlib').html('There are <span class="resultsnum">' + results.length + '</span> counseling agencies within <span class="radius">' + Math.round(mapradius/1609.34) + 'mi</span> who know about <span class="services">' + svcs.join(' and ') + '</span> and speak <span class="languages">' + langs.join(' and ') + '</span>.');
	}

	//Sort the results by distance
	results = _.sortBy(results, function(result){
	return calcDistance(currentpos.getPosition().lat(), currentpos.getPosition().lng(), parseFloat(result.agc_ADDR_LATITUDE), parseFloat(result.agc_ADDR_LONGITUDE));
	});
	
	//Hand off your sorted array of results
	return(results);
	
}

//DISPLAY THE UPDATED ARRAY ON THE LIST AND MAP
function mapUpdater() {
				
	$('#listing').empty();
	
	$.each(markers, function (i, marker) { //Clear the pins from the map!
		marker.setMap(null);	
	});
	markers = []; 
	
						
	$.each(results, function(i, agency){
	
		$('#listing').append('<li id="' + agency.agcid + '" class="result ' + agency.services.replace(/\,/g, ' ') + ' ' + agency.languages.replace(/\,/g, ' ') + '"><span class="result-title">' + agency.nme + '</span><span class="result-address-phone">'+ agency.adr1 + ' ' + agency.adr2 + '<br/>' + agency.city + ' ' + agency.statecd + ' ' + agency.zipcd + '<br/><a href="PHONE" class="phone">'+ agency.phone1 + '</a></span><span class="result-distance">about '+calcDistance(currentpos.getPosition().lat(), currentpos.getPosition().lng(), parseFloat(agency.agc_ADDR_LATITUDE), parseFloat(agency.agc_ADDR_LONGITUDE))+' mi away | <a href="URL" target="_blank">directions</a></span>					<span class="result-flags"></span></li>');
			
			//Add language flags
			var langs = agency.languages.split(",");				
			$.each(langs, function(j, language){
				var full_lang = _.findWhere(langsdict.languages, {key: language});
				$('#'+agency.agcid+' .result-flags').append('<span class="result-flag '+language+'"></span>');
				$('#'+agency.agcid+' .result-flags').append('<span class="result-flag">'+full_lang.value+'</span><br/>');
			});
			
			//Add URL or email, if there
			if (agency.weburl.toUpperCase() != "HTTP://N/A"){
				$('#'+agency.agcid+' .result-title').wrap('<a href="'+agency.weburl+'">');
			}else if (agency.email.toUpperCase() != "N/A"){
				$('#'+agency.agcid+' .result-title').wrap('<a href="mailto:'+agency.email+'">');					
			}

		resultmarker = map.addMarker({ //drop a pin
			lat: agency.agc_ADDR_LATITUDE,
			lng: agency.agc_ADDR_LONGITUDE,
			animation: google.maps.Animation.DROP,
			title: agency.nme,
			infoWindow: {
				content: '<span class="result-title">' + agency.nme + '</span><span class="result-address-phone">'+ agency.adr1 + ' ' + agency.adr2 + '<br/>' + agency.city + ' ' + agency.statecd + ' ' + agency.zipcd + '<br/><a href="PHONE" class="phone">'+ agency.phone1 + '</a></span><span class="result-distance">about '+calcDistance(currentpos.getPosition().lat(), currentpos.getPosition().lng(), parseFloat(agency.agc_ADDR_LATITUDE), parseFloat(agency.agc_ADDR_LONGITUDE))+' mi away | <a href="URL" target="_blank">directions</a></span>'
			},
			mouseover: function (e) {
				$('#' + agency.agcid).css('background', 'beige');
			},
			mouseout: function (e) {
				$('#' + agency.agcid).css('background', 'transparent');
			}
		});
		markers.push(resultmarker);
	});
}

function GetLatLongFromAddr(myaddress) { //Get lat/long from entered address
	GMaps.geocode({
		address: myaddress,
		callback: function (results, status) {
			if (status == 'OK') {

				$('#locate').slideToggle(); //hide step 1
				$('#findfilter').slideToggle(); //show step 2

				map = new GMaps({
					div: '#map',
					zoom: 3,
					lat: 39.50,
					lng: -98.35,
					enableNewStyle: true
				});

				var latlng = results[0].geometry.location;
				map.setCenter(latlng.lat(), latlng.lng()); //re-center the map
				map.setZoom(10); //zoom in
				currentpos = map.addMarker({ //drop a pin
					lat: latlng.lat(),
					lng: latlng.lng(),
					animation: google.maps.Animation.DROP,
					icon: "http://www.dreamrealty.com/images/blue_dot_circle.png"
				});					
			} else {
				alert('Something went wrong. Try again.');
			}
		}
	});
}

function calcDistance(fromLat, fromLng, toLat, toLng) { //Calculate distance between two lat/long pairs in miles, and round it
	return Math.round(google.maps.geometry.spherical.computeDistanceBetween(
		new google.maps.LatLng(fromLat, fromLng), new google.maps.LatLng(toLat, toLng)) * 0.000621371);
}

function zoomscaler(number) { //Get lat/long from entered address
	if (number >= 600 && number <= 1200) {
		map.setZoom(4);
	}
	if (number >= 300 && number <= 600) {
		map.setZoom(5);
	}
	if (number >= 150 && number <= 300) {
		map.setZoom(6);
	}
	if (number >= 75 && number <= 150) {
		map.setZoom(7);
	}
	if (number >= 38 && number <= 75) {
		map.setZoom(8);
	}
	if (number >= 16 && number <= 38) {
		map.setZoom(9);
	}
	if (number >= 8 && number <= 16) {
		map.setZoom(10);
	}
	if (number >= 4 && number <= 8) {
		map.setZoom(11);
	}
	if (number >= 2 && number <= 4) {
		map.setZoom(12);
	}
	if (number >= 1 && number <= 2) {
		map.setZoom(13);
	}
	if (number >= 0 && number <= 1) {
		map.setZoom(14);
	}
}


$(document).ready(function () {
	//Initialize Geocoder and Chosen forms
	$("#geocoder").geocodify({
		onSelect: function (result) {
			GetLatLongFromAddr(result.formatted_address);
		},
		regionBias: "US",
		initialText: "Begin typing here to find an address or zip code."
	});

	//Add service choices to chosen dropdown
	$.each(svcsdict.services, function(i, service) {   
	     $('.chzn-select-svc').append('<option value="'+service.key+'">'+service.value+'</option>');
	});
	
	//Add language choices to chosen dropdown
	$.each(langsdict.languages, function(j, language) {   
	     $('.chzn-select-lang').append('<option value="'+language.key+'">'+language.value+'</option>');
	});

	$(".chzn-select-svc").chosen();
	$(".chzn-select-lang").chosen();
	
	//Catch changes in distance
	$('#distance').keyup(function () {
		listUpdater();
		mapUpdater();
	});
	
	//Catch chosen selections
	$(".chzn-select-svc,.chzn-select-lang").chosen().change(function () {
		listUpdater();
		mapUpdater();
	});
}); //end document.ready