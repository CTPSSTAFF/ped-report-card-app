# ped-report-card-app
Pedestrian Report Card Assessment App

Data sources:  
* scored intersections:   'app_data/intersections_fc.geojson'
* scored road segments:   'app_data/roadseg_fc.geojson'
* MPO boundary:           'app_data/ctps_boston_region_mpo_97_land_arc.geojson'
* MAPC subregions:        'app_data/ctps_mapc_subregions_97_land_arc.geojson'    
* low-income TAZes:       'app_data/low_income_TAZ.geojson'
* minority TAZes:         'app_data/minority_TAZ.geojson'
* elderly TAZes:          'app_data/elderly_TAZ.geojson'
* zero-vehicle household TAZes:   'app_data/zero_vehicle_hh_TAZ.geojson'
* quarter-mile buffer around schools and colleges:    'app_data/school_college_buffer.geojson'
    
All data used in this app is loaded from GeoJSON files

Dependencies on external libraries:  
* GoogleMaps API version 3 (see https://developers.google.com/maps/documentation/javascript/tutorial)
* GoogleMaps Utility libraries (see https://github.com/googlemaps/v3-utility-library)
* jQuery version 2.2.4 (see https://jquery.com/)
* jQueryUI version 1.12.1 (see https://jqueryui.com/)
* jquery.event.drag  version 2.2 (see http://threedubmedia.com/code/event/drag) - required by SlickGrid, q.v.
* jquery.event.drop version 2.2 (see http://threedubmedia.com/code/event/drop)  - required by SlickGrid, q.v.
* SlickGrid version 2.4.1 (see http://slickgrid.net/)
* underscore.js version 1.9.1 (see https://underscorejs.org/)
* turf.js version 1.9.1 (see https://turfjs.org/)
* ctpsGoogleMapsUtils.js version 3.0 (see https://github.com/bkrepp-ctps/ctpsGoogleMapsUtils)
