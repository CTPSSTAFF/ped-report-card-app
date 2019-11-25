// Pedestrian Report Card Application - location detail page
// Author:  Ben Krepp
// Date:    May-August 2019
//
// General Comments
// ================
// Please see header comments in pedReportCard.js
//

// Google Maps map object
var map = {};    

// Color codes for drawaing boundaries of MPO and MAPC subregions
var subregionBoundaryColor = '#000080';
var mpoBoundaryColor = '#000080'; 
// Color code for rendering scored location (intersection or road segment)
var defaultLocationColor = '#0070ff';

// Global "database" of point, line, and polygon features read from GeoJSON data sources
// Point features - intersection locations
// Line features - road segment locations
// Polygon features - overlay layers
var DATA = { 'points'   : null, 
             'lines'    : null,
             'overlays' : { 'te_priority': null,
                            'low_income' : null,
                            'minority'   : null,
                            'elderly'    : null,
                            'zvhh'       : null,
                            'school_buf' : null
             }
}; // DATA {}

// N.B. overlays are not visible when page loads
var style_te_priority = {   'invisible' : function(feature) {
                                                var priorityLevel = feature.getProperty('PriorityLe');
                                                var color;
                                                switch (priorityLevel) {
                                                case 'High':
                                                    color = '#c2005b';
                                                    break;
                                                case 'Moderate':
                                                    color = '#ff7070';
                                                    break;
                                                case 'Low':
                                                    color = '#ffbdbe';
                                                    break;
                                                default:
                                                    color = 'white';
                                                    break;
                                                }
                                                var StyleOptions = {
                                                    fillColor: color, fillOpacity: 0.5, strokeColor : color, strokeOpacity: 0.5, strokeWeight: 1.0, visible: false 
                                                };
                                                return StyleOptions;
                                          },
                            'visible'   : function(feature) {
                                                var priorityLevel = feature.getProperty('PriorityLe');
                                                var color;
                                                switch (priorityLevel) {
                                                case 'High':
                                                    color = '#c2005b';
                                                    break;
                                                case 'Moderate':
                                                    color = '#ff7070';
                                                    break;
                                                case 'Low':
                                                    color = '#ffbdbe';
                                                    break;
                                                default:
                                                    color = 'white';
                                                    break;
                                                }
                                                var StyleOptions = {
                                                    fillColor: color, fillOpacity: 0.5, strokeColor : color, strokeOpacity: 0.5, strokeWeight: 1.0, visible: true 
                                                };
                                                return StyleOptions;
                                          }
};
var overlayStyles = {    'te_priority'  :  style_te_priority['invisible'],
                        'low_income'    : { fillColor: '#66c2a5', fillOpacity: 0.5, strokeColor : '#66c2a5', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'minority'      : { fillColor: '#fc8d62', fillOpacity: 0.5, strokeColor : '#fc8d62', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'elderly'       : { fillColor: '#8da0cb', fillOpacity: 0.5, strokeColor : '#8da0cb', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'zvhh'          : { fillColor: '#e78ac3', fillOpacity: 0.5, strokeColor : '#e78ac3', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'school_buf'    : { fillColor: '#a6d854', fillOpacity: 0.8, strokeColor : '#a6d854', strokeOpacity: 0.9, strokeWeight: 1.0, visible: false }
}; // overlayStyles {}

var pointsURL = 'app_data/intersections_fc.geojson';
var linesURL  = 'app_data/roadseg_fc.geojson';  
var te_priorityURL = 'app_data/te_priority.geojson';
var low_incomeURL = 'app_data/low_income_TAZ.geojson';
var minorityURL = 'app_data/minority_TAZ.geojson';
var elderlyURL = 'app_data/elderly_TAZ.geojson';
var zvhhURL = 'app_data/zero_vehicle_hh_TAZ.geojson';
var schoolURL = 'app_data/school_college_buffer.geojson';
var mpo_boundaryURL = 'app_data/ctps_boston_region_mpo_97_land_arc.geojson';
var mapc_subregionsURL = 'app_data/ctps_mapc_subregions_97_land_arc.geojson';

// Stuff to support labeling (centroids of) MAPC subregions
var subregionCentroids = {
    'ICC'       :  { name:  'ICC',      lng: -71.09714487, lat:	42.36485871 },
    'ICC/TRIC-1':  { name:  'ICC/TRIC', lng: -71.0843212,  lat: 42.24126261 },  // Milton
    'ICC/TRIC-2':  { name:  'ICC/TRIC', lng: -71.2410838,  lat: 42.28136977 },  // Needham
    'MAGIC'     :  { name:  'MAGIC',    lng: -71.42223145, lat:	42.45586713 },
    'MWRC'      :  { name:  'MWRC',     lng: -71.42305069, lat: 42.30381133 },
    'NSPC'      :  { name:  'NSPC',     lng: -71.12358836, lat:	42.52346751 },
    'NSTF'      :  { name:  'NSTF',     lng: -70.85369176, lat:	42.60673553 },
    'SSC'       :  { name:  'SSC',      lng: -70.85128535, lat: 42.17717592 },
    'SWAP'      :  { name:  'SWAP',     lng: -71.42819003, lat:	42.13804556 },
    'TRIC'      :  { name:  'TRIC',     lng: -71.20413265, lat:	42.16445925 },
    'TRIC/SWAP' :  { name:  'TRIC/SWAP',lng: -71.28420378, lat:	42.2366124  }
}; 
// Array of labels rendered using GoogleMaps V3 Utility Library
var mapLabels = [];

$(document).ready(function() {
    // Arm event handlers for buttons
    $('#about_button').click(function(e) {
        var url = 'About.html'
        window.open(url,'popUpWindow','height=700,width=800,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes')
    }); 
    $('#comment_button').click(function(){
		window.open('http://www.ctps.org/contact','_blank');      
	});
/*
    // Enable jQueryUI tabs
    $('#tabs_div').tabs({ 'heightStyle' : 'content', 'active' : 0 });
*/
    
    // Utility function to return the value of the parameter named 'sParam' from the window's URL
    function getURLParameter(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        var i;
        for (i = 0; i < sURLVariables.length; i++ ) {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] == sParam) {
                return sParameterName[1];
            }
        }
        // If we get here, parameter not found
        return('');
    } // gtetURLParameter() 
    
     var getJson = function(url) {
        var tmp = $.get(url, null, 'json');
        return tmp;
    };

    $.when(getJson(pointsURL), 
           getJson(linesURL),
           getJson(mpo_boundaryURL),
           getJson(mapc_subregionsURL)
    ).done(function(points, 
                    lines,
                    mpo_boundary,
                    mapc_subregions) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more requests to load JSON data failed. Exiting application.");
            return;         
        }
        DATA.points = JSON.parse(points[0]);;
        DATA.lines = JSON.parse(lines[0]);
        DATA.mpo_boundary = JSON.parse(mpo_boundary[0]);
        DATA.mapc_subregions = JSON.parse(mapc_subregions[0]);
        
        initializeMap(DATA);
        
        var loc;
        var loc_id = +(getURLParameter('loc_id'));
        if (loc_id < 1000) {
            loc = _.find(DATA.lines.features, function(feature) { return feature.properties['Id'] === loc_id; });
        } else {
            loc = _.find(DATA.points.features, function(feature) { return feature.properties['Id'] === loc_id; });
        }
        if (loc == null) {
            alert('No location with id ' + loc_id + ' found. Exiting.');
            return;
        }
         console.log('Rendering detail page for location ' + loc_id + '.');
         displayLocationDetail(loc);
    }); // handler for 'when loading of data is done' event  

    function initializeMap(data) {
        // Initialize the Google Map
        var regionCenterLat = 42.345111165; 
        var regionCenterLng = -71.124736685;
        var initialZoomLev = 10;
        var mapOptions = {
            center: new google.maps.LatLng(regionCenterLat, regionCenterLng),
            zoom: initialZoomLev,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControlOptions: {'style': google.maps.MapTypeControlStyle.DROPDOWN_MENU},
            panControl: false,
            streetViewControl: false,
            zoomControlOptions: {'style': 'SMALL'},
            scaleControl: true,
            overviewMapControl: false,
            mapTypeId: 'terrain'
        };   
        map = new google.maps.Map(document.getElementById("map"), mapOptions);    

        // START of petite hacque to set scale bar units to miles/imperial instead of km/metric:
        // See: https://stackoverflow.com/questions/18067797/how-do-i-change-the-scale-displayed-in-google-maps-api-v3-to-imperial-miles-un
        // and: https://issuetracker.google.com/issues/35825255
        var intervalTimer = window.setInterval(function() {
            var elements = document.getElementById("map").getElementsByClassName("gm-style-cc");
            for (var i in elements) {
                // look for 'km' or 'm' in innerText via regex https://regexr.com/3hiqa
                if ((/\d\s?(km|(m\b))/g).test(elements[i].innerText)) {
                    // The following call effects the change of scale bar units
                    elements[i].click();
                    window.clearInterval(intervalTimer);
                }
            }
        }, 500);
        window.setTimeout(function() { window.clearInterval(intervalTimer) }, 20000 );
        // END of peitie hacque to set scale bar units to miles/imperial instead of km/metric       

        // Deuxième petite hacque, this one to get the map's "bounds_changed" event to fire.
        // Believe it or not: When a Google Maps map object is created, its bounding
        // box is undefined (!!). Thus calling map.getBounds on a newly created map
        // will raise an error. We are compelled to force a "bounds_changed" event to fire.
        // Larry and Sergey: How did you let this one through the cracks??
        map.setCenter(new google.maps.LatLng(regionCenterLat + 0.000000001, regionCenterLng + 0.000000001));        
        
        // Add static (non-toggle-able) overlay layers to Google Map
        // Draw MAPC subregions on Google Map - note: this FC consists of MULTIPLE features
        var i, lineFeature;
        for (i = 0; i < data.mapc_subregions.features.length; i++) {
            lineFeature = data.mapc_subregions.features[i];
            drawPolylineFeature(lineFeature, map, { strokeColor : subregionBoundaryColor, strokeOpacity : 1.0, strokeWeight: 1.5 });
        }
        // Draw MPO boundary on Google Map - this FC consists of a single feature
        var lineFeature = data.mpo_boundary.features[0];
        drawPolylineFeature(lineFeature, map, { strokeColor : mpoBoundaryColor, strokeOpacity : 0.7, strokeWeight: 4.5 });     

    // Label the centroids of the MAPC subregions using the MapLabel class from the Google Maps v3 Utility Library
    var mapLabel, latlng;
    for (var subregion in subregionCentroids) {
        latlng = new google.maps.LatLng(subregionCentroids[subregion].lat, subregionCentroids[subregion].lng);
        mapLabel = new MapLabel( { text:       subregionCentroids[subregion].name,
                                   position:   latlng,
                                   map:        map,
                                   fontSize:   10,
                                   fontStyle:  'italic',
                                   fontColor:  '#ff0000',
                                   align:      'center'
                   });
        mapLabel.set('position', latlng);
        mapLabels.push(mapLabel);
    }
    // Fiddle with the font size of the labels, so they appear to "zoom"
    // Between zoom levels 10 and 16, it looks like the zoom level itself can be used pretty well as the font size!
    google.maps.event.addListener(map, "zoom_changed", 
        function zoomChangedHandler(e) { 
            var i, zoomLev = map.getZoom();
            // console.log('Zoom level is: ' + zoomLev);
            for (i = 0; i < mapLabels.length; i++) {
                if (zoomLev <= 10) { 
                    mapLabels[i].setOptions({'fontSize' : 10});
                } else if (zoomLev > 10 && zoomLev <= 16) {
                    // Just in case (undocumented setOptions API requires literals for option values
                    // Not sure if this is the case or not ...
                    switch(zoomLev) {
                    case 11:
                        mapLabels[i].setOptions({'fontSize' : 11});
                        break;
                    case 12:
                        mapLabels[i].setOptions({'fontSize' : 12});
                        break;
                    case 13:
                        mapLabels[i].setOptions({'fontSize' : 13});
                        break;
                    case 14:
                        mapLabels[i].setOptions({'fontSize' : 14});
                        break;
                    case 15:
                        mapLabels[i].setOptions({'fontSize' : 15});
                        break;
                    case 16:
                        mapLabels[i].setOptions({'fontSize' : 16});
                        break;
                    default:
                        // Shouldn't get here - arbitrary choice of font size
                        mapLabels[i].setOptions({'fontSize' : 16});
                        break;
                    }
                } else {
                    mapLabels[i].setOptions({'fontSize' : 16});
                }
            }
        } );  
     
        // Add toggle-able overlay layers to the GoogleMap - AFTER the base map has loaded
        // The JSON payload for these is large and delays map rendering at app start up
        $.when(getJson(te_priorityURL),
               getJson(low_incomeURL),
               getJson(minorityURL),
               getJson(elderlyURL),
               getJson(zvhhURL),
               getJson(schoolURL)
        ).done(function(te_priority,
                        low_income,
                        minority,
                        elderly,
                        zvhh,
                        school_buf) {
            var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
            if (ok === false) {
                alert("One or more requests to load JSON data for map overlays failed. Exiting application.");
                return;   
            }
            [{ data  : te_priority,  name : 'te_priority'},
             { data  : low_income,   name : 'low_income' },
             { data  : minority,     name : 'minority'   },
             { data  : elderly,      name : 'elderly'    }, 
             { data  : zvhh,         name : 'zvhh'       },
             { data  : school_buf,   name : 'school_buf' }
            ].forEach(
                function addMapOverlay(lyr) {
                    DATA.overlays[lyr.name] = new google.maps.Data();
                    DATA.overlays[lyr.name].addGeoJson(JSON.parse(lyr.data[0]));
                    DATA.overlays[lyr.name].setStyle(overlayStyles[lyr.name]);
                    DATA.overlays[lyr.name].setMap(map);           
                });
         }); // Logic to add map overlay layers    
         
        // on-change handler for map overlay layer selection checkboxes
        // Toggle visibility of indicated overlay layer
        $('.layer_toggle').change(function(e) {
            var target_id = e.target.id;
            var layer_name = target_id.replace('_toggle','');
            var state = $('#' + target_id).prop('checked');  
            var style;
            if (layer_name !== 'te_priority') {
                style = DATA.overlays[layer_name].getStyle();
                style.visible = state;
                DATA.overlays[layer_name].setStyle(style);
            } else {
                // The te_priority layer is styled feature-by-feature via a function...
                if (state === true) {
                    style = style_te_priority['visible'];
                } else {
                    style = style_te_priority['invisible'];
                }
                DATA.overlays[layer_name].setStyle(style);
            }
        });
    } // initializeMap()

    function displayLocationDetail(feature) {      
        // Nested helper function to map a report card location
        function mapLocation(feature) {
            var gmPolyline = {},  aFeatCoords = [], point = {}, aAllPoints = [], bbox = [], googleBounds = {}, loc = {}, marker = {};
            var i, j, aCoord;
            var colour = defaultLocationColor; // Really, a 'const'
            var featureKind = feature.geometry['type'];
            if (featureKind === 'Point') {
                console.log('Rendering Point feature with location ID  ' + feature.properties['Location_ID']);
                loc = new google.maps.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0])
                marker = new StyledMarker({
                        styleIcon   : new StyledIcon(StyledIconTypes.MARKER,{color : colour}),
                        position    : loc,
                        map         : map
                    });  
                map.setCenter(loc);
                map.setZoom(17);
            } else if (featureKind === 'MultiLineString' || featureKind === 'LineString') {
                if (featureKind === 'MultiLineString') {
                    console.log('Rendering MultiLintString feature with location ID  ' + feature.properties['Location_ID']);
                    aFeatCoords = feature.geometry.coordinates;
                    for (i = 0; i < aFeatCoords.length; i++) {
                        aAllPoints = [];
                        // Render each LineString in the MultiLineString individually
                        for (j = 0; j < aFeatCoords[i].length; j++) {
                            aCoord = aFeatCoords[i][j];
                            point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
                            aAllPoints.push(point);
                        } // for j in aFeatCoords[i]                       
                        gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                                map             : map,
                                                                strokeColor     : colour,
                                                                strokeOpacity   : 0.7,
                                                                strokeWeight    : 6 });
                    } // for i in aFeatureCoords.length
                } else {
                    // featureKind === 'LineString'
                    console.log('Rendering LineString feature with location ID  ' + feature.properties['Location_ID']);
                    aFeatCoords = feature.geometry.coordinates;
                    for (i = 0; i < aFeatCoords.length; i++ ) {
                        aCoord = aFeatCoords[i];
                        point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
                        aAllPoints.push(point);
                        gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                                map             : map,
                                                                strokeColor     : colour,
                                                                strokeOpacity   : 0.7,
                                                                strokeWeight    : 6 });
                    } // for i in aFeatureCoords.length   
                } // end-if-else MultiLineString / LineString
                // Pan/zoom map to bounding box of LineString/MultiLineString feature
                bbox = turf.bbox(feature);
                // Return value of turf.bbox() has the form: [minX, minY, maxX, maxY]
                // Morph this into a form Google Maps can digest
                googleBounds = new google.maps.LatLngBounds();
                googleBounds.extend({ lat : bbox[1], lng : bbox[0] });
                googleBounds.extend({ lat : bbox[3], lng : bbox[2] });
                map.fitBounds(googleBounds);                
            } else {
                console.log('Feature ' + feature.properties['Location_Id'] + ' has unrecognized geometry type: ' + featureKind + '.');
                return;
            }
        } // mapLocation()
               
        // Nested helper function to map a "score" value encoded to an integer to the corresponding human-readable string
        // These "ratings" appear in the Safety and Capacity Management and Mobility detail tables
        function scoreEncodingToString(encoding) {
            var retval;
            if (encoding != null) {
                if (encoding >= 0 && encoding <= 1.7) {
                    retval = 'Poor';
                } else if (encoding > 1.7 && encoding <= 2.3) {
                    retval = 'Fair';
                } else if (encoding > 2.3 && encoding <= 3.0) {
                    retval = 'Good';
                } else {
                    retval = '';   
                }
            } else {
                retval = '';
            }
            return retval;
        } // scoreEncodingToString()
        
        // Body of displayLocationDetail() begins here
        // N.B. The data presented for intersections and road segments differs (but not completely)
        //      Please read comments in the code and take note of "if (featureKind == ...)" statements, below.
        //
        mapLocation(feature);
        var featureKind = feature.geometry['type'];
        var props = feature.properties; 
        
        // Clear out any previous data about intersections or roadsegs
        $('.intersection_data').html('');
        $('.roadseg_data').html('');
        
        // Location: intersection OR road segment
        var tmpStr;
        if (featureKind == 'Point') {
            tmpStr = props['Location_Description'] + ' - ' + props['Municipality'];
            tmpStr += (props['Municipality_2'] != 'N/A') ? ' and ' + props['Municipality_2'] : '';
            tmpStr += ', MA';
            // featureKind == 'Point' ==> intersection
            $('#detail_page_caption').html(tmpStr);
            $('.roadseg_data_table').hide();
            $('.intersection_data_table').show();
        } else {
            // featureKind == LineString || MultiLineString ==> road segment
            // Note: for road segs we display the 'Location' (i.e., road name) before
            //       the 'Location_Description' (i.e., start and end points of the segment)
            tmpStr = props['Location'] + ': ';
            tmpStr += props['Location_Description'] + ' - ' + props['Municipality'];
            tmpStr += (props['Municipality_2'] != 'N/A') ? ' and ' + props['Municipality_2'] : '';
            tmpStr += ', MA';        
            $('#detail_page_caption').html(tmpStr);
            $('.intersection_data_table').hide();
            $('.roadseg_data_table').show();
        }
        
        // Overview summary table
        $('#safety_score').html(props['Safety'] != null ? props['Safety'].toFixed(2)  : '');
        $('#safety_rating').html(props['Safety_Notes'] != null ? props['Safety_Notes'] : '');
        $('#sys_preservation_score').html(props['System_Preservation'] != null ? props['System_Preservation'].toFixed(2)  : '');
        $('#sys_preservation_rating').html(props['System_Preservation_Notes'] != null ? props['System_Preservation_Notes'] : '');
        $('#cmm_score').html(props['Capacity_Management_and_Mobility'] != null ? (props['Capacity_Management_and_Mobility']).toFixed(2) : '');
        $('#cmm_rating').html(props['Capacity_Management_and_Mobility_Notes'] != null ? props['Capacity_Management_and_Mobility_Notes'] : '');
        $('#economic_vitality_score').html(props['Economic_Vitality'] != null ? props['Economic_Vitality'].toFixed(2) : '');
        $('#economic_vitality_rating').html(props['Economic_Vitality_Notes'] != null ? props['Economic_Vitality_Notes'] : '');
        
        // Transportation Equity summary tables
        // The fact that we have to do string comparisons here suxx mucho
        var htmlCheck = '&#10004'; // Really a 'const', but not clear if all extant versions of IE support JS 'const' - yeech
        var propVal = props['Transportation_Equity_Priority'];
        if (propVal === 'High Priority') {
            $('#te_high_priority').html(htmlCheck);
        } else if (propVal === 'Moderate Priority') {
            $('#te_moderate_priority').html(htmlCheck);
        } else if (propVal === 'Not a Priority Area') {
            $('#te_not_priority').html(htmlCheck);
        } else {
           // Leave all 3 cells blank
        }
        
        // populateScoreAndRating - helper/utility function to populate 'Score' and 'Rating' fields 
        //                          (formerly 'Rating' and 'Weighted Score') for a given scoring property;
        //                          the use of this function saves much repetitive code
        // parameters:  1. propName - name of property to read from 'props' object for 'Score';
        //                            the name of the property to read for 'Rating' is propName + '_Rating'
        //              2. htmlPrefix - prefix of HTML elements /to which values will be written;
        //                              Value will be WRTTEN to htmlPrefix = '_score' and htmlPrefix + '_rati      
        //              3. score - number of digits of precision in which to render 'Score'
        function populateScoreAndRating(propName, htmlPrefix, precsion) {
            var score = parseFloat(props[propName]).toFixed(precsion);     
            $('#' + htmlPrefix + '_score').html(score);        
            var rating = props[propName + '_Rating'];
            $('#' + htmlPrefix + '_rating').html(rating);
        } // populateScoreAndRating()
        
        // Detail tables
        //
        var weight, rating, weightedScore;
        //
        // Safety detail table - DIFFERENT structure for intersections and roadsegs!
        if (featureKind == 'Point') {
            // Intersection - Sufficient Crossing Time 
            populateScoreAndRating('Sufficient_Crossing_Time_Index', 'intersection_suff_xing_time', 0);
            // Intersection - Pedestrian Crashes
            populateScoreAndRating('Pedestrian_Crashes', 'intersection_ped_crashes', 0);
            // Intersection - Pedestrian Signal Presence
            populateScoreAndRating('Pedestrian_Signal_Presence', 'intersection_ped_sig_presence', 0);
            // Intersection - Vehicle Travel Speed
            populateScoreAndRating('Average_Vehicle_Travel_Speed', 'intersection_veh_travel_speed', 0);
            // Intersection - Safety Total
            populateScoreAndRating('Safety', 'intersection_safety_total', 2);
        } else {
            // Roadseg - Pedestrian Crashes
            populateScoreAndRating('Pedestrian_Crashes', 'roadseg_ped_crashes', 0);
            // Roadseg - Pdestrian/vehicle Buffer
            populateScoreAndRating('Pedestrian_Vehicle_Buffer', 'roadseg_ped_veh_buffer', 0);
            // Roadseg - Vehicle Travel Speed
            populateScoreAndRating('Vehicle_Travel_Speed', 'roadseg_veh_travel_speed', 0);
            // Roadseg - Safety Total
            populateScoreAndRating('Safety', 'roadseg_safety_total', 2);    
        }
        
        // System Preservation detail table - SAME structure for intersections and roadsegs
        $('#sidewalk_condition_percentage').html('100%');
        populateScoreAndRating('Sidewalk_Condition', 'sidewalk_condition', 2);

          
        // Capacity Management and Mobility detail table - DIFFERENT structure for intersections and roadsegs!
        if (featureKind == 'Point') {   
            // Intersection - Pedestrian Delay
            populateScoreAndRating('Pedestrian_Delay', 'intersection_pedestrian_delay', 0);
            // Intersection - Sidewalk Presence
            populateScoreAndRating('Sidewalk_Presence', 'intersection_sidewalk_presence', 0);
            // Intersection - Curb Ramp Presence
            populateScoreAndRating('Curb_Ramp_Presence', 'intersection_curb_ramp_presence', 0);
            // Intersection - Crosswalk Presence
            // NOTE: Difference between property name in JSON and 'display name' - was this an oversight?
            populateScoreAndRating('Crossing_Opportunities', 'intersection_crosswalk_presence', 0);
            // Intesection - Capacity Management and Mobility Total
            // *** TBD: open question here
            populateScoreAndRating('Capacity_Management_and_Mobility', 'intersection_cmm_total', 2);
        } else {
            // Roadseg - Sidewalk Presence
            populateScoreAndRating('Sidewalk_Presence', 'roadseg_sidewalk_presence', 0);
            // Roadseg - Crosswalk Presence
            // NOTE: Difference between property name in JSON and 'display name' - was this an oversight?
            populateScoreAndRating('Crossing_Opportunities', 'roadseg_crosswalk_presence', 0);
            // Roadseg - Walkway Width
            populateScoreAndRating('Walkway_Width', 'roadseg_walkway_width', 0);
            // Roadseg - Capacity Management and Mobility Total
            populateScoreAndRating('Capacity_Management_and_Mobility', 'roadseg_cmm_total', 2);
        }
       
        // Economic Vitality detail table -  - DIFFERENT structure for intersections and roadsegs!  
        if (featureKind == 'Point') {
            // Intersection - Pedestrian Volumes
             $('#intersection_ped_volumes_percentage').html('100%');
            populateScoreAndRating('Pedestrian_Volumes', 'intersection_ped_volumes', 2);
        } else {
            // Roadseg - Pedestrian Volumes
            $('#roadseg_ped_volumes_percentage').html('50%');
            populateScoreAndRating('Pedestrian_Volumes', 'roadseg_ped_volumes', 0);
            // Roadseg - Adjacent Bicycle Accommodations
            populateScoreAndRating('Adjacent_Bicycle_Accommodations', 'roadseg_adj_bike_accommodations', 0);
            // Roadseg - Economic Vitality Total
            populateScoreAndRating('Economic_Vitality', 'roadseg_econ_total', 2);
        }
        
        // Transportation Equity detail table - SAME structure for intersections and roadsegs
        //
        $('#low_income_pop').html(props['Low_Income'] != null ? props['Low_Income'] : '');       
        $('#minority_pop').html(props['Minority'] != null ? props['Minority'] : '');
        $('#over_75').html(props['High_Prop__of_Pop__Over_75_Years'] != null ? props['High_Prop__of_Pop__Over_75_Years'] : '');
        $('#zero_vehicle_hhs').html(props['High_Prop__of_Pop__without_Vehicle'] != null ? props['High_Prop__of_Pop__without_Vehicle'] : '');        
        $('#school_quarter_mile').html(props['Quarter_Mile_of_School_or_College'] != null ? props['Quarter_Mile_of_School_or_College'] : '');
        
        $('#output_div').show();
    } // displayLocationDetail()    
}); // end of document-ready event handler

// *** Temp home of utility function
function drawPolylineFeature(lineFeature, gMap, style) {
    var gmPolyline = {}, aFeatCoords = [], point = {}, aAllPoints = [];
    var i, j;
    if (lineFeature.geometry.type === 'MultiLineString') {
        // console.log('Rendering MultiLintString feature.');
        aFeatCoords = lineFeature.geometry.coordinates;
        for (i = 0; i < aFeatCoords.length; i++) {
            aAllPoints = [];
            // Render each LineString in the MultiLineString individually
            for (j = 0; j < aFeatCoords[i].length; j++) {
                aCoord = aFeatCoords[i][j];
                point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
                aAllPoints.push(point);
            } // for j in aFeatCoords[i]
            gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                    map             : gMap,
                                                    strokeColor     : style.strokeColor,
                                                    strokeOpacity   : style.strokeOpacity,
                                                    strokeWeight    : style.strokeWeight });
        } // for i in aFeatureCoords.length
    } else if (lineFeature.geometry.type === 'LineString') {
        // console.log('Rendering LineString feature.');
        aFeatCoords = lineFeature.geometry.coordinates;
        for (i = 0; i < aFeatCoords.length; i++ ) {
            aCoord = aFeatCoords[i];
            point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
            aAllPoints.push(point);
        } // for i in aFeatureCoords.length
        gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                map             : gMap,
                                                strokeColor     : style.strokeColor,
                                                strokeOpacity   : style.strokeOpacity,
                                                strokeWeight    : style.strokeWeight });
    } else {
        console.log('Feature has unrecognized geometry type: ' + lineFeature.geometry.type);
        return;
    }
} //drawPolylineFeature()