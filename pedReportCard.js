// Pedestrian Report Card Application - main page
// Author:  Ben Krepp
// Date:    December 2018 and May 2019
//
// Data sources: All data used in this app is loaded from GeoJSON files
//
//    scored intersections:   'app_data/intersections_fc.geojson'
//    scored road segments:   'app_data/roadseg_fc.geojson'
//    MPO boundary:           'app_data/ctps_boston_region_mpo_97_land_arc.geojson'
//    MAPC subregions:        'app_data/ctps_mapc_subregions_97_land_arc.geojson'    
//    low-income TAZes:       'app_data/low_income_TAZ.geojson'
//    minority TAZes:         'app_data/minority_TAZ.geojson'
//    elderly TAZes:          'app_data/elderly_TAZ.geojson'
//    zero-vehicle household TAZes:   'app_data/zero_vehicle_hh_TAZ.geojson'
//    quarter-mile buffer around schools and colleges:    'app_data/school_college_buffer.geojson'
//
//
// Dependencies on external libraries:
//
//    GoogleMaps API version 3
//    GoogleMaps Utility libraries: styledMarker, maplabel
//    jQuery version 2.2.4
//    jQueryUI version 1.12.1
//    jquery.event.drag  version 2.2
//    jquery.event.drop version 2.2
//    SlickGrid version 2.4.1
//    underscore.js 
//    turf.js version 1.9.1
//

// Global Google Maps map object
var map = {};
// All Google Maps markers on the map
var aMarkers = [];
// All Google Maps polyline features on the map
var allGmPolylines = [];
// infoWindow 'popup' for line features
var infoWindow = null;
// Color codes for drawaing boundaries of MPO and MAPC subregions
var subregionBoundaryColor = 'brown';
var mpoBoundaryColor = '#00a674'; // "Medium Spring Green"

// Global "database" of point, line, and polygon features read from GeoJSON data sources
// Point features - intersection locations
// Line features - road segment locations
// Polygon features - overlay layers
var DATA = { 'points'   : null, 
             'lines'    : null,
             'overlays' : { 'low_income' : null,
                            'minority'   : null,
                            'elderly'    : null,
                            'zvhh'       : null,
                            'school_buf' : null
             }
}; // DATA {}
// N.B. overlays are not visible on app start-up
var overlayStyles = {   'low_income'    : { fillColor: '#66c2a5', fillOpacity: 0.5, strokeColor : '#66c2a5', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'minority'      : { fillColor: '#fc8d62', fillOpacity: 0.5, strokeColor : '#fc8d62', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'elderly'       : { fillColor: '#8da0cb', fillOpacity: 0.5, strokeColor : '#8da0cb', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'zvhh'          : { fillColor: '#e78ac3', fillOpacity: 0.5, strokeColor : '#e78ac3', strokeOpacity: 0.5, strokeWeight: 1.0, visible: false },
                        'school_buf'    : { fillColor: '#a6d854', fillOpacity: 0.8, strokeColor : '#a6d854', strokeOpacity: 0.9, strokeWeight: 1.0, visible: false }
}; // overlayStyles {}
// Previous color palette for the above layers: '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3'

var pointsURL = 'app_data/intersections_fc.geojson';
var linesURL  = 'app_data/roadseg_fc.geojson';  
var low_incomeURL = 'app_data/low_income_TAZ.geojson';
var minorityURL = 'app_data/minority_TAZ.geojson';
var elderlyURL = 'app_data/elderly_TAZ.geojson';
var zvhhURL = 'app_data/zero_vehicle_hh_TAZ.geojson';
var schoolURL = 'app_data/school_college_buffer.geojson';
var mpo_boundaryURL = 'app_data/ctps_boston_region_mpo_97_land_arc.geojson';
var mapc_subregionsURL = 'app_data/ctps_mapc_subregions_97_land_arc.geojson';

// Stuff pertaining to the Slick Grid:
//
// Slick Grid 'grid' object and grid options
var grid = null;
var gridOptions = { enableColumnReorder : false, autoHeight: true, forceFitColumns: true };
// Stuff for grid columns
// N.B. The width values reflect the jQueryUI font size being throttled-back to 80% of its default size in tipApp.css
var gridColumns = [ { id : 'loc_id_col',    name : 'CTPS ID#',       field : 'loc_id', width : 100, sortable: true, toolTip: 'Click column header to sort this column.',
                      headerCssClass : 'loc_id_column_header',
                      formatter : function(row, cell, value, columnDef, dataContext) {
                                      return '<a href=pedDetail.html?loc_id=' + value + ' target="_blank">' + value + '</a>';
                                  } 
                    },
                    { id : 'type_col',      name : 'Type',             field : 'type',      width : 100, sortable : true, toolTip: 'Click column header to sort this column.' }, 
                    { id : 'muni_col',      name : 'Municipality',     field : 'muni',      width : 100, sortable : true, toolTip: 'Click column header to sort this column.' },
                    { id : 'muni2_col',     name : 'Municipality 2',   field : 'muni2',     width : 100, sortable : true, toolTip: 'Click column header to sort this column.' },
                    { id : 'loc_col',       name : 'Location',         field : 'loc',       width : 150, sortable : true, toolTip: 'Click column header to sort this column.' },
                    { id : 'loc_desc_col',  name : 'Description',      field : 'loc_desc',  width : 350, sortable : true, toolTip: 'Click column header to sort this column.'}
                 ];
// Slick Grid 'dataView' object
var dataView = null;    

var getJson = function(url) {
    return $.get(url, null, 'json');
};

// Hack to enable Google Map to be rendered when relevant tab is exposed for the first time only. Yeech.
var searchTabExposed = false;

$(document).ready(function() {
    // Arm event handlers for buttons
    $('#reset_button').click(function(e) {
        location.reload();
    });
    $('#about_button').click(function(e) {
        var url = 'About.html'
        window.open(url,'popUpWindow','height=700,width=800,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes')
    });
    $('#help_button').click(function(e) {
        var url = 'Help.html'
        window.open(url,'popUpWindow','height=700,width=800,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes')
    });    
    
    // *** When the window resizes, resize the header row in the SlickGrid
    //     N.B. This is an unabashed hack!
    //     Also see the jQueryUI tabs constructor, abobve
    $(window).resize(function(e) {
        grid.resizeCanvas();
        var sg_colhdrs = $('.ui-state-default.slick-header-column');
        var i, totalLength = 0;
        for (i = 0; i < sg_colhdrs.length; i++) {
            totalLength += sg_colhdrs[i].clientWidth;
        }
        $('div.slick-pane.slick-pane-header.slick-pane-left').width(totalLength);      
    });
 
/* 
    $('#tabs_div').tabs({
        heightStyle : 'content',
        activate    : function(event, ui) {
            if (ui.newTab.index() == 1 && searchTabExposed == false) {
                // *** TBD *** Expose the following call IF we decide to nest the map within the 'search' tab
                // initializeMap();
                searchTabExposed = true;
                // *** Clean up the SlickGrid's header row
                //     N.B. This is an unabashed hack!
                //     Also see window.resize() handler, below
                var sg_colhdrs = $('.ui-state-default.slick-header-column');
                var i, totalLength = 0;
                for (i = 0; i < sg_colhdrs.length; i++) {
                    totalLength += sg_colhdrs[i].clientWidth;
                }
               $('div.slick-pane.slick-pane-header.slick-pane-left').width(totalLength);
            }
        }
    });
*/
    
    // Initialize the machinery for the Slick Grid
    //
    dataView = new Slick.Data.DataView();
    grid = new Slick.Grid('#location_list_contents', dataView, gridColumns, gridOptions);
    dataView.onRowCountChanged.subscribe(function(e, args) {
        grid.updateRowCount();
        grid.render();
    });
    dataView.onRowsChanged.subscribe(function(e, args) {
        grid.invalidateRows(args.rows);
        grid.render();
    });
    // Right now, we only support numeric sorting... more TBD
    grid.onSort.subscribe(function(e, args) {
        function NumericSorter(a, b) {
            var x = a[sortcol], y = b[sortcol];
            return sortdir * (x == y ? 0 : (x > y ? 1 : -1));
        }
        var sortdir = args.sortAsc ? 1 : -1;
        var sortcol = args.sortCol.field;
        dataView.sort(NumericSorter, sortdir);
        args.grid.invalidateAllRows();
        args.grid.render();
    }); 
    
    // Load adata
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
        DATA.points = JSON.parse(points[0]);
        DATA.lines = JSON.parse(lines[0]);
        DATA.mpo_boundary = JSON.parse(mpo_boundary[0]);
        DATA.mapc_subregions = JSON.parse(mapc_subregions[0]);
        initializeMap(DATA);
        initializeGrid(DATA);
    });       
});	

// initGrid - populate SlickGrid with data for scored locations
// For the first version of the app, we display ALL scored locations
function initializeGrid(data) {
    var i, j;
    var aData = []; // Array used to populate the SlickGrid
    
    for (i = 0; i < data.lines.features.length; i++) {
        aData[i] = {    'id'        : 'id' + i,
                        'loc_id'    : data.lines.features[i].properties['Id'],                       
                        'type'      : 'Roadway Segment',
                        'muni'      : data.lines.features[i].properties['Municipality'],                       
                        'muni2'     : data.lines.features[i].properties['Municipality_2'] !== 'N/A' ? data.lines.features[i].properties['Municipality_2'] : '',
                        'loc'       : data.lines.features[i].properties['Location'],
                        'loc_desc'  : data.lines.features[i].properties['Location_Description']
        };         
    } // for each line (roadway segement)

    for (j = 0; j < data.points.features.length; j++) {
        aData[i] = {    'id'        : 'id' + i,
                        'loc_id'    : data.points.features[j].properties['Id'],                       
                        'type'      : 'Intersection',
                        'muni'      : data.points.features[j].properties['Municipality'],                       
                        'muni2'     : data.points.features[j].properties['Municipality_2'] !== 'N/A' ? data.points.features[i].properties['Municipality_2'] : '',
                        'loc'       : data.points.features[j].properties['Location'],
                        'loc_desc'  : data.points.features[j].properties['Location_Description']
        };
        i += 1;
    } // for each point (intersection)

    // Clear out the items currently in the dataView, load it with the new data, and render it in the grid
    // 
    var i, tmp, len = dataView.getLength();
    dataView.beginUpdate();
    for (i = 0; i < len; i++) {
        tmp = dataView.getItem(i);
        dataView.deleteItem(tmp.id);
    }
    dataView.endUpdate();
    dataView.setItems(aData); // This call populates the SlickGrid
} // initializeGrid()

function initializeMap(data) {
    var regionCenterLat = 42.345111165; 
	var regionCenterLng = -71.124736685;
    var zoomLev = 10;
	var lat = regionCenterLat;
	var lng = regionCenterLng;
    
	var mapOptions = {
		center: new google.maps.LatLng(lat, lng),
		zoom: zoomLev,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		mapTypeControlOptions: {'style': google.maps.MapTypeControlStyle.DROPDOWN_MENU},
		panControl: false,
		streetViewControl: false,
		zoomControlOptions: {'style': 'SMALL'},
		scaleControl: true,
		overviewMapControl: false
	};
    
	map = new google.maps.Map(document.getElementById("map"), mapOptions);
    google.maps.event.addListener(map, "bounds_changed", function boundsChangedHandler(e) { } );
    
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
    map.setCenter(new google.maps.LatLng(lat + 0.000000001, lng + 0.000000001));
    
    // Add static (non-toggle-able) overlay layers to Google Map
    // Draw MAPC subregions on Google Map - note: this FC consists of MULTIPLE features
    var i, lineFeature;
    for (i = 0; i < data.mapc_subregions.features.length; i++) {
        lineFeature = data.mapc_subregions.features[i];
        drawPolylineFeature(lineFeature, map, { strokeColor : subregionBoundaryColor, strokeOpacity : 1.0, strokeWeight: 1.5 });
    }
    // Draw MPO boundary on Google Map - this FC consists of a single feature
    var lineFeature = data.mpo_boundary.features[0];
    drawPolylineFeature(lineFeature, map, { strokeColor : mpoBoundaryColor, strokeOpacity : 0.7, strokeWeight: 8 });
  
    // Add point data to the GoogleMap
    var pointFeatures = data.points.features;
    var pointFeature;
    var marker;
    aMarkers = [];
    var i, j, k;  
    for (i = 0; i < pointFeatures.length; i++) {
        pointFeature = pointFeatures[i];
        marker = new StyledMarker({
                        styleIcon   : new StyledIcon(StyledIconTypes.MARKER,{color : '#ff8c00'}),
                        position    : new google.maps.LatLng(pointFeature.geometry.coordinates[1], 
                                                             pointFeature.geometry.coordinates[0]),
                        map         : map
                    });
        marker.CTPSprops = {};
        marker.CTPSprops.feature = pointFeature;     
        google.maps.event.addListener(marker, 'click', onClickHandler);
        aMarkers.push(marker); 
    } // for loop over pointFeatures 

    // Add line data to the GoogleMap
    var lineFeatures = data.lines.features;
    var lineFeature, geomType; 
    var aFeatCoords = [], tmp = {}, point, aAllPoints = [], gmPolyline = {};
    var gmPolylines4Feature = [];
    for (i = 0; i < lineFeatures.length; i++) {
        lineFeature = lineFeatures[i];
        gmPolylines4Feature = [];
        geomType = lineFeature.geometry.type;   
        // console.log('Rendering line feature # ' + lineFeature.id + ' (' + geomType + ')');
        if (geomType == "MultiLineString")  {
            aFeatCoords = lineFeature.geometry.coordinates;
            for (j = 0; j < aFeatCoords.length; j++) {
                aAllPoints = [];
                // Render each LineString in the MultiLineString individually
                for (k = 0; k < aFeatCoords[j].length; k++) {
                    aCoord = aFeatCoords[j][k];
                    point = new google.maps.LatLng({ 'lat': aCoord[1], 'lng': aCoord[0] });
                    aAllPoints.push(point);
                } // for k in aFeatCoords[j]
                gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                        map             : map,
                                                        strokeColor     : '#ff8c00',
                                                        strokeOpacity   : 1.0,
                                                        strokeWeight    : 6 });                                       
                gmPolylines4Feature.push(gmPolyline);                                       
            } // for j in aFeatureCoords.length
        } else  {
            // geomType == "LineString"
            aAllPoints = [];
            // LineString
            for (j = 0; j < lineFeature.geometry.coordinates.length; j++) {
                aCoord = lineFeature.geometry.coordinates[j];
                point = new google.maps.LatLng({ 'lat' : aCoord[1], 'lng' : aCoord[0] });
                aAllPoints.push(point);
            }
            gmPolyline = new google.maps.Polyline({ path            : aAllPoints,
                                                    map             : map,
                                                    strokeColor     : '#ff8c00',
                                                    strokeOpacity   : 1.0,
                                                    strokeWeight    : 6 });    
            gmPolylines4Feature.push(gmPolyline);
        } // if/else on lineFeature.geometry.type
        
        // Each GIS feature may be rendered as 1 or more than one GoogleMaps polyline feature.
        // Here we "attach" the relevant GIS feature to each GM Polyline, and set the on-click
        // event handler to each GM Polyline to behave identically.
        // Decorate each GoogleMaps Polyline feature for the GIS feature with CTPS attribute for the feature
        for (j = 0; j < gmPolylines4Feature.length; j++) {
            gmPolylines4Feature[j].CTPSprops = {};
            gmPolylines4Feature[j].CTPSprops.feature = lineFeature;
			google.maps.event.addListener(gmPolylines4Feature[j], 'click', onClickHandler);
		} // For loop over GM Polyline features for the i-th GIS feature ("lineFeature")
    } // for loop over line features
    
    // Add toggle-able overlay layers to the GoogleMap - AFTER the base map has loaded
    // The JSON payload for these is large and delays map rendering at app start up
    $.when(getJson(low_incomeURL),
           getJson(minorityURL),
           getJson(elderlyURL),
           getJson(zvhhURL),
           getJson(schoolURL)
    ).done(function(low_income,
                    minority,
                    elderly,
                    zvhh,
                    school_buf) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more requests to load JSON data for map overlays failed. Exiting application.");
            return;   
        }
        [{ data  : low_income,   name : 'low_income' },
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
        
    // On-click event hander for markers and polylines
    function onClickHandler(e) {
        var clickLocation = e.latLng;
        if (!infoWindow) {
            infoWindow = new google.maps.InfoWindow();
        }
        var feature = this.CTPSprops.feature;
        var geomType = feature.geometry.type;
        var props = feature.properties;
        
        // For road segment features (i.e., geomType is 'MultiLineString' or 'LineString'), the 'Location' (i.e., road name)
        // should appear before the 'Location_Description' (i.e., the start- and end-locations of the road segment.
        var loc_desc = '';
        var heading = '';
        if (geomType == 'MultiLineString' || geomType == 'LineString') {
            heading = props['Location'] + '<br/>';
        }
        loc_desc = props['Location_Description'] + ' - ' + props['Municipality'];
        var src_abstract_prop = props['Source_Abstract_Link'];
        var src_pdf_prop = props['Source_PDF'];
        var mpo_calendar_pdf_prop = props['MPO_Calendar_Source_PDF'];
        var src_abstract_blurb = (src_abstract_prop != null) ? '<p><a href="' + src_abstract_prop + '"' + ' target="_blank">Source abstract</a></p>' : '';
        var src_pdf_blurb = (src_pdf_prop != null) ? '<p><a href="' + src_pdf_prop + '"' + ' target="_blank">Source PDF</a></p>' : '';
        var mpo_calendar_blurb = (mpo_calendar_pdf_prop) != null ? '<p><a href="' + mpo_calendar_pdf_prop + '"' + ' target="_blank">MPO CalendarSource PDF</a></p>' : '';
        var content = '<div id="info">';
        content += geomType == 'Point' ? '<h4>Intersection Location</h4>' : '<h4>Roadway Segment Location</h4>';
        content += '<p>' + heading + '</p>';
        var loc_desc_with_url = '<a href="pedDetail.html?loc_id=' + props['Id'] + '" target="_blank">' + loc_desc + '</a></p>';
        content += '<p>' + loc_desc_with_url + '</p>';
        content += src_abstract_blurb;
        content += src_pdf_blurb;
        content += mpo_calendar_blurb;
        content += ' </div>';
        infoWindow.setContent(content);     
        infoWindow.setPosition(clickLocation);
        infoWindow.open(map);
        displayLocationDetail(feature);        
    } // onClickHandler()
    
    // on-change handler for map overlay layer selection checkboxes
    // Toggle visibility of indicated overlay layer
    $('.layer_toggle').change(function(e) {
        var target_id = e.target.id;
        var layer_name = target_id.replace('_toggle','');
        var state = $('#' + target_id).prop('checked');        
        var style = DATA.overlays[layer_name].getStyle();
        style.visible = state;
        DATA.overlays[layer_name].setStyle(style);
    });
} // initializeMap()



function displayLocationDetail(feature) {
    // Helper function to map a "rating" value encoded to an integer to the corresponding human-readable string
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