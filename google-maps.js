var map, markers, polygon
var placesMarkers = [];

function createStreetView(marker, info){
  var streetView = new google.maps.StreetViewService();
  var radius = 50;

  function getStreeView(data, status){
    if (status == google.maps.StreetViewStatus.OK){
      var nearLocation = data.location.latLng;
      var heading = google.maps.geometry.spherical.computeHeading(nearLocation, marker.position);
      info.setContent('<div>' + marker.title + '</div><div id="panorama"></div>');
      var panoramaOptions = {
        position: nearLocation,
        pov: {
          heading: heading,
          pitch: 30
        }
      };
      var panorama = new google.maps.StreetViewPanorama(document.getElementById('panorama'), panoramaOptions);
    }
    else{
      info.setContent('<div>' + marker.title + '</div><div>No panorama found ! :(</div>');
    }
  };

  streetView.getPanoramaByLocation(marker.position, radius, getStreeView);

  info.open(map, marker);
};

function drawOverMap(){
  var drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_LEFT,
      drawingModes: [google.maps.drawing.OverlayType.POLYGON]
    }
  });

  document.getElementById('toggle-drawing').addEventListener('click', function(){
    if (drawingManager.map){
      drawingManager.setMap(null);
      if(polygon)
        polygon.setMap(null);
    }
    else{
      drawingManager.setMap(map);
      hideListings(markers);
    }
  })

  drawingManager.addListener('overlaycomplete', function(event){
    if (polygon){
      polygon.setMap(null);
      hideListings(markers);
    }
    drawingManager.setDrawingMode(null);
    polygon = event.overlay;
    polygon.setEditable(true);
    searchWithinPolygon();

    polygon.getPath().addListener('set_at', searchWithinPolygon);
    polygon.getPath().addListener('insert_at', searchWithinPolygon);
  });
};

function searchWithinPolygon(){
  markers.forEach(function(m){
    if (google.maps.geometry.poly.containsLocation(m.position, polygon))
      m.setMap(map);
    else
      m.setMap(null);
  });

  var area = google.maps.geometry.spherical.computeArea(polygon.getPath());
  alert('Area is: ' + area + ' m^2');
};

function initMap(){
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 46.77121, lng: 23.623635 },
    zoom: 13
    });

  var oradeaCoord = { lat: 47.046501, lng: 21.918944 };
  var clujCoord = { lat: 46.77121, lng: 23.623635 };
  var markerIcon = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';

  markers = [ new google.maps.Marker({
    position: oradeaCoord,
    map: map,
    title: 'Here is Oradea !',
    label: 'H'
  }),
    new google.maps.Marker({
    position: clujCoord,
    map: map,
    title: 'Here is Cluj !',
    animation: google.maps.Animation.BOUNCE,
    icon: markerIcon
  })];

  var bounds = new google.maps.LatLngBounds();

  // populate info window
  markers.forEach(function(m){
    var info = new google.maps.InfoWindow();

    m.addListener('click', function(){
      createStreetView(m, info);
    });

    bounds.extend(m.position);
  });

  map.fitBounds(bounds);

  drawOverMap();

  var zoomAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById('zoom-to-area-text')
  );
  var timeAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById('search-within-time-text'),
    {
      types: ['establishment']
    }
  );

  var searchBox = new google.maps.places.SearchBox(
    document.getElementById('places-search')
  );
  searchBox.addListener('places_changed', function() {
    searchBoxPlaces(this);
  });

  document.getElementById('go-search-places').addEventListener('click', function() {
    hideListings(placesMarkers);
    var placesService = new google.maps.places.PlacesService(map);
    placesService.textSearch({
      query: document.getElementById('places-search').value
    }, function(results, status){
      if (status == google.maps.places.PlacesServiceStatus.OK)
        createPlacesMarkers(results);
    });
  });
}

function searchBoxPlaces(searchBox) {
    hideListings(placesMarkers);
    var places = searchBox.getPlaces();
    if (places.length == 0)
      window.alert('There are no places matching your query.');
    else
      createPlacesMarkers(places);
}

function createPlacesMarkers(places) {
  places.forEach(function(place){
    var icon = {
      url: place.icon,
      size: new google.maps.Size(25, 25),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(15, 34)
    }

    var marker = new google.maps.Marker({
      map: map,
      icon: icon,
      title: place.name,
      position: place.geometry.location,
      id: place.id
    });

    var placeInfoWindow = new google.maps.InfoWindow();
    marker.addListener('click', function() {
      if(placeInfoWindow.marker != this)
        getPlaceDetails(this, place, placeInfoWindow);
    });

    placesMarkers.push(marker);
  });
}

function getPlaceDetails(marker, place, infoWindow){
  var service = new google.maps.places.PlacesService(map);
  service.getDetails(place, function(result, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK){
      infoWindow.marker = marker;
      var html = '<div>';
      if (result.name)
        html += '<strong>' + result.name + '</strong>';
      if (result.formatted_address)
        html += '<br>' + result.formatted_address;
      html += '</div>';
      infoWindow.setContent(html);
      infoWindow.open(map, marker);
      infoWindow.addListener('closeclick', function() {
        infoWindow.marker = null;
      });
    }
  })
}

document.getElementById('show-listings').addEventListener('click', function(){
  showListings();
});

document.getElementById('hide-listings').addEventListener('click', function(){
  hideListings(markers)
});

document.getElementById('zoom-to-area').addEventListener('click', function(){
  var geocoder = new google.maps.Geocoder();
  var address = document.getElementById('zoom-to-area-text').value;
  if (address == ''){
    alert('No address specified.');
  }
  else{
    geocoder.geocode({
      address: address,
      componentRestrictions: { locality: 'Cluj Napoca' }
    }, function(results, status){
      if (status == google.maps.GeocoderStatus.OK){
        map.setCenter(results[0].geometry.location);
        map.setZoom(15);
      }
      else{
        alert('Location could not be found !');
      }
    });
  }
});

document.getElementById('search-within-time').addEventListener('click', function(){
  var distanceMatrixService = new google.maps.DistanceMatrixService();
  var destination = document.getElementById('search-within-time-text').value;
  if (destination == ''){
    alert('No address specified.');
  }
  else{
    hideListings(markers);
    var origins = [];
    for(var i = 0; i < markers.length; i++){
      origins[i] = markers[i].position;
    }
    var mode = document.getElementById('mode').value;
    distanceMatrixService.getDistanceMatrix({
      origins: origins,
      destinations: [destination],
      travelMode: google.maps.TravelMode[mode],
      unitSystem: google.maps.UnitSystem.IMPERIAL
    }, function(response, status){
      if (status == google.maps.DistanceMatrixStatus.OK){
        displayMarkersWithin(response);
      }
      else
        alert('There was an error');
    });
  }
});

function displayMarkersWithin(response){
  var maxDuration = document.getElementById('max-duration').value;
  var origins = response.originAddresses;
  var destinations = response.destinationAddresses;
  var atLeastOne = false;
  for (var i = 0; i < origins.length; i++) {
    var results = response.rows[i].elements;
    for (var j = 0; j < results.length; j++) {
      var element = results[j];
      if (element.status === "OK") {
        var distanceText = element.distance.text;
        var duration = element.duration.value / 60;
        var durationText = element.duration.text;
        if (duration <= maxDuration) {
          markers[i].setMap(map);
          atLeastOne = true;
          var infowindow = new google.maps.InfoWindow({
            content: durationText + ' away, ' + distanceText
          });
          infowindow.open(map, markers[i]);
          markers[i].infowindow = infowindow;
          google.maps.event.addListener(markers[i], 'click', function() {
            this.infowindow.close();
          });
        }
      }
    }
  }
  if (!atLeastOne) {
    window.alert('We could not find any locations within that distance!');
  }
}

function hideListings(markers){
  markers.forEach(function(m){
    m.setMap(null);
  });
}

function showListings(){
  markers.forEach(function(m){
    m.setMap(map);
  });
}
