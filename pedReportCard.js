// Pedestrian Report Card Application - main page
// Author:  Ben Krepp
// Date:    December 2018, and May-July 2019
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
var subregionBoundaryColor = '#000080'; // was:  'brown'
var mpoBoundaryColor = '#000080'; // '#0070ff' ("Dodger Blue") '#00a674' ("Medium Spring Green")

// Color palette for scored locations:
var colorPalette = {    'default'   : '#0070ff',  // '00a9e6' // '#c500ff' // '#0070ff'
                        'good'      : '#38a800',
                        'fair'      : '#ff7f00', 
                        'poor'      : '#d60047'
};

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
// N.B. overlays are not visible when page loads
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
// Array of labels rendered using V3 Utility Library
var mapLabels = [];

// Hack to enable Google Map to be rendered when relevant tab is exposed for the first time only. Yeech.
var searchTabExposed = false;

// On-click event hander for markers (for intersections) and polylines (for road segments)
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
} // onClickHandler()

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
    
    aData.sort(function(reca, recb) { return reca['loc_id'] - recb['loc_id']; });

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
        ctpsGoogleMapsUtils.drawPolylineFeature(lineFeature, map, { strokeColor : subregionBoundaryColor, strokeOpacity : 1.0, strokeWeight: 1.5 }, false);
    }
    
    // Draw MPO boundary on Google Map - this FC consists of a single feature
    var lineFeature = data.mpo_boundary.features[0];
    ctpsGoogleMapsUtils.drawPolylineFeature(lineFeature, map, { strokeColor : mpoBoundaryColor, strokeOpacity : 0.7, strokeWeight: 4.5 }, false);
    
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
    
  
    // Add point data (intersections for which there is report card data) to the GoogleMap
    // Note that the following call both adds the point data to the map and sets its default symbology.
    // See header comments for function "setPointSymbology" for gorey details.
    setPointSymbology(data.points.features, 'default');

/*    
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
*/


    // Add line data (road segments for which there is report card data) to the GoogleMap, using default symbolization
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
                                                        strokeColor     : colorPalette['default'], // '#ff8c00',
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
                                                    strokeColor     : colorPalette['default'], // '#ff8c00',
                                                    strokeOpacity   : 1.0,
                                                    strokeWeight    : 6 });    
            gmPolylines4Feature.push(gmPolyline);
        } // if/else on lineFeature.geometry.type
        
        // Each GIS feature may be rendered as 1 or more than one GoogleMaps polyline feature.
        // Here we "attach" the relevant GIS feature to each GM Polyline, and set the on-click
        // event handler to each GM Polyline to behave identically.
        // Decorate each GoogleMaps Polyline feature for the GIS feature with CTPS attribute for the feature
        // AND: Add each GoogleMaps polyline feature to the global store of all GoogleMaps polylines in the data
        for (j = 0; j < gmPolylines4Feature.length; j++) {
            gmPolylines4Feature[j].CTPSprops = {};
            gmPolylines4Feature[j].CTPSprops.feature = lineFeature;
			google.maps.event.addListener(gmPolylines4Feature[j], 'click', onClickHandler);
            // Add GM polyline to our global store of these, so their symbolization can be changed...
            allGmPolylines.push(gmPolylines4Feature[j]);
		} // For loop over GM Polyline features for the i-th GIS feature ("lineFeature")
    } // for loop over line features
    
    // Arm event handler to change map symbology
    $('#select_symbology').change(function(e) {
        var symbology = $("#select_symbology option:selected").attr('value'); 
        setPointSymbology(data.points.features, symbology);
        setLineSymbology(allGmPolylines, symbology);
    });
    
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

function getPropForSymbology(symbology) {
    var retval;
    switch (symbology) {
    case 'safety':
        retval = 'Safety_Notes';
        break;
    case 'sys_preservation':
        retval = 'System_Preservation_Notes';
        break;
    case 'cmm':
        retval = 'Capacity_Management_and_Mobility_Notes';
        break;
    case 'economic_vitality':
        retval = 'Economic_Vitality_Notes';
        break;
    default:
        retval = null;
        break;
    }    
    return retval;
} // getPropForSymbology()

function valueToColor(value) {
    var retval;
    switch (value) {
    case 'Good':
        retval = colorPalette['good'];
        break;
    case 'Fair':
        retval = colorPalette['fair'];
        break;
    case 'Poor':
        retval = colorPalette['poor'];
        break;
    default:
        retval = colorPalette['default'];
    }
    return retval;
} // valueToColor()

// setPointSymbology
//
// Point features are indicated on the map by GoogleMaps 'marker' objects.
// One would like to simply change the color of these when the selected symbology changes, but programmatically
// changing the color of a GoogleMaps 'marker' object after one has been created doesn't seem to be possible.
// Consequently, we have to resort to re-creating the markers each time the symbolization changes. Ugh.
function setPointSymbology(pointFeatures, symbology) {
    var pointFeature, marker;
    var propToUse = getPropForSymbology(symbology);
    
    if (aMarkers.length !== 0) {
        aMarkers.forEach(function(marker) { marker.setMap(null); });
        while (aMarkers.length > 0) { aMarkers.pop(); }
    }
    aMarkers = [];
    var i, j, k, propValue, color; 
    for (i = 0; i < pointFeatures.length; i++) {
        pointFeature = pointFeatures[i];
        if (propToUse !== null) {
            propValue = pointFeature.properties[propToUse];
            color = valueToColor(propValue);
        } else {
            color = colorPalette['default'];
        }     
        marker = new StyledMarker({
                        styleIcon   : new StyledIcon(StyledIconTypes.MARKER,{ 'color' : color }),
                        position    : new google.maps.LatLng(pointFeature.geometry.coordinates[1], 
                                                             pointFeature.geometry.coordinates[0]),
                        map         : map
                    });
        marker.CTPSprops = {};
        marker.CTPSprops.feature = pointFeature;     
        google.maps.event.addListener(marker, 'click', onClickHandler);
        aMarkers.push(marker); 
    } // for loop over pointFeatures     
} // setPointSybology()

// setLineSymbology
//
function setLineSymbology(polylines, symbology) {
    var propToUse = getPropForSymbology(symbology);
    allGmPolylines.forEach(function(polyline) {
        var propValue, color;
        if (propToUse !== null) {
            propValue = polyline.CTPSprops.feature.properties[propToUse];
            color = valueToColor(propValue);
        } else {
            color = colorPalette['default'];
        } 
        polyline.setOptions({ 'strokeColor' : color });
    });    
} // setLineSymbology()

/*

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

*/