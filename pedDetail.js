// Pedestrian Report Card Application - location detail page
// Author:  Ben Krepp
// Date:    May 2019
//
// General Comments
// ================
// Please see header comments in pedReportCard.js
//

// Google Maps map object
var map = {};    
 // Global "database" of JSON data read
var DATA = {};    

$(document).ready(function() {    
    var pointsURL = 'app_data/intersections_fc.geojson';
    var linesURL  = 'app_data/roadseg_fc.geojson';  
    var low_incomeURL = 'app_data/low_income_TAZ.geojson';
    var minorityURL = 'app_data/minority_TAZ.geojson';
    var elderlyURL = 'app_data/elderly_TAZ.geojson';
    var zvhhURL = 'app_data/zero_vehicle_hh_TAZ.geojson';
    var schoolURL = 'app_data/school_college_buffer.geojson';
    var mpo_boundaryURL = 'app_data/ctps_boston_region_mpo_97_land_arc.geojson';
    var mapc_subregionsURL = 'app_data/ctps_mapc_subregions_97_land_arc.geojson';

    // Enable jQueryUI tabs
   //  $('#tabs_div').tabs({ heightStyle : 'content' });
    
    // Stuff pertaining to the Google Map:
    // 
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
        overviewMapControl: false
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
           getJson(linesURL)
    ).done(function(points, 
                    lines) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more WFS requests failed. Exiting application.");
            return;         
        }
        DATA.points = JSON.parse(points[0]);;
        DATA.lines = JSON.parse(lines[0]);
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

    function displayLocationDetail(feature) {      
        // Nested helper function to map a report card location
        function mapLocation(feature) {
            var gmPolyline = {},  aFeatCoords = [], point = {}, aAllPoints = [], bbox = [], googleBounds = {}, loc = {}, marker = {};
            var i, j, aCoord;
            var colour = '#ff8c00'; // Really, a 'const'
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
               
        // Nested helper function to map a "rating" value encoded to an integer to the corresponding human-readable string
        // These "ratings" appear in the Safety and Capacity Management and Mobility detail tables
        function ratingEncodingToString(encoding) {
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
        } // ratingEncodingToString()
        
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
            $('#intersection_location').html(tmpStr);
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
            $('#roadseg_location').html(tmpStr);
            $('.intersection_data_table').hide();
            $('.roadseg_data_table').show();
        }
        
        // Overview summary table
        $('#safety_score').html(props['Safety'] != null ? props['Safety'] : '');
        $('#safety_rating').html(props['Safety_Notes'] != null ? props['Safety_Notes'] : '');
        $('#sys_preservation_score').html(props['System_Preservation'] != null ? props['System_Preservation'] : '');
        $('#sys_preservation_rating').html(props['System_Preservation_Notes'] != null ? props['System_Preservation_Notes'] : '');
        $('#cmm_score').html(props['Capacity_Management_and_Mobility'] != null ? props['Capacity_Management_and_Mobility'] : '');
        $('#cmm_rating').html(props['Capacity_Management_and_Mobility_Notes'] != null ? props['Capacity_Management_and_Mobility_Notes'] : '');
        $('#economic_vitality_score').html(props['Economic_Vitality'] != null ? props['Economic_Vitality'] : '');
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
        
        // populateWRWS - helper/utility function to populate Weight, Rating and Weighted Score for a given scoring property;
        //                the use of this function saves much repetitive code
        // parameters:  1. propName - name of property to read from 'props' object
        //              2. htmlPrefix - prefix of HTML elements from/to which values will be read/written;
        //                              Value will be READ from <thmlPrefix>_weight
        //                              Values will be WRTTEN to <htmlPrefix>_rating and <htmlPrefix>_wscore
        //              3. precision - precision (number of digits to right of decimal point) in weighted score
        function populateWRWS(propName, htmlPrefix, precision) {
            var weight = +$('#' + htmlPrefix + '_weight').html();
            var rating = props[propName];
            $('#' + htmlPrefix + '_rating').html(ratingEncodingToString(rating));
            var weightedScore = (weight != null && rating != null) ? weight * rating : '';
            if (weightedScore != '') {
                $('#' + htmlPrefix + '_wscore').html(weightedScore.toFixed(precision));
            } else {
                $('#' + htmlPrefix + '_wscore').html(weightedScore);
            }
        } // populateWRWS()
        
        // Detail tables
        //
        var weight, rating, weightedScore;
        //
        // Safety detail table - DIFFERENT structure for intersections and roadsegs!
        if (featureKind == 'Point') {
            // Intersection - Sufficient Crossing Time 
            populateWRWS('Sufficient_Crossing_Time_Index', 'intersection_suff_xing_time', 0);
            // Intersection - Pedestrian Crashes
            populateWRWS('Pedestrian_Crashes', 'intersection_ped_crashes', 0);
            // Intersection - Pedestrian Signal Presence
            populateWRWS('Pedestrian_Signal_Presence', 'intersection_ped_sig_presence', 0);
            // Intersection - Vehicle Travel Speed
            populateWRWS('Average_Vehicle_Travel_Speed', 'intersection_veh_travel_speed', 0);
            // Intersection - Safety Total
            populateWRWS('Safety', 'intersection_safety_total', 0);
        } else {
            // Roadseg - Pedestrian Crashes
            populateWRWS('Pedestrian_Crashes', 'roadseg_ped_crashes', 0);
            // Roadseg - Pdestrian/vehicle Buffer
            populateWRWS('Pedestrian_Vehicle_Buffer', 'roadseg_ped_veh_buffer', 0);
            // Roadseg - Vehicle Travel Speed
            populateWRWS('Vehicle_Travel_Speed', 'roadseg_veh_travel_speed', 0);
            // Roadseg - Safety Total
            populateWRWS('Safety', 'roadseg_safety_total', 0);        
        }
        
        // System Preservation detail table - SAME structure for intersections and roadsegs
        rating = props['Sidewalk_Condition'];
        $('#sidewalk_condition').html(ratingEncodingToString(rating));
          
        // Capacity Management and Mobility detail table - DIFFERENT structure for intersections and roadsegs!
        if (featureKind == 'Point') {   
            // Intersection - Pedestrian Delay
            populateWRWS('Pedestrian_Delay', 'intersection_pedestrian_delay', 0);
            // Intersection - Sidewalk Presence
            populateWRWS('Sidewalk_Presence', 'intersection_sidewalk_presence', 0);
            // Intersection - Curb Ramps
            populateWRWS('Curb_Ramp_Presence', 'intersection_curb_ramp', 0);
            // Intersection - Crossing Opportunities
            populateWRWS('Crossing_Opportunities', 'intersection_crossing_opportunities', 0);
            // Intesection - Capacity Management and Mobility Total
            populateWRWS('Capacity_Management_and_Mobility', 'intersection_cmm_total', 2);
        } else {
            // Roadseg - Sidewalk Presence
            populateWRWS('Sidewalk_Presence', 'roadseg_sidewalk_presence', 0);
            // Roadseg - Crossing Opportunities
            populateWRWS('Crossing_Opportunities', 'roadseg_crossing_opportunities', 0);
            // Roadseg - Walkway Width
            populateWRWS('Walkway_Width', 'roadseg_walkway_width', 0);
            // Roadseg - Capacity Management and Mobility Total
            populateWRWS('Capacity_Management_and_Mobility', 'roadseg_cmm_total', 2);
        }
       
        // Economic Vitality detail table -  - DIFFERENT structure for intersections and roadsegs!
        if (featureKind == 'Point') {
            // Intersection - Pedestrian Volumes
            rating = props['Pedestrian_Volumes'];
            $('#inersection_ped_volumes').html(ratingEncodingToString(rating));
        } else {
            // Roadseg - Pedestrian Volumes
            populateWRWS('Pedestrian_Volumes', 'roadseg_ped_volumes', 0);
            // Roadseg - Adjacent Bicycle Accommodations
            populateWRWS('Adjacent_Bicycle_Accommodations', 'roadseg_adj_bike_accommodations', 0);
            // Roadseg - Economic Vitality Total
            populateWRWS('Economic_Vitality', 'roadseg_econ_total', 0);
        }
        
        // Transportation Equity detail table - SAME structure for intersections and roadsegs
        //
        $('#te_ej_zone').html(props['Environmental_Justice_Zone'] != null ? props['Environmental_Justice_Zone'] : '');
        $('#school_quarter_mile').html(props['Quarter_Mile_of_School_or_College'] != null ? props['Quarter_Mile_of_School_or_College'] : '');
        $('#over_75').html(props['High_Prop__of_Pop__Over_75_Years'] != null ? props['High_Prop__of_Pop__Over_75_Years'] : '');
        $('#zero_vehicle_hhs').html(props['High_Prop__of_Pop__without_Vehicle'] != null ? props['High_Prop__of_Pop__without_Vehicle'] : '');
        
        $('#output_div').show();
    } // displayLocationDetail()    
}); // end of document-ready event handler