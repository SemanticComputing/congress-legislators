/*
 * Semantic faceted search
 *
 */

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')
    
    /*
    * Controller for the results view.
    */
    .controller('GroupmapController', GroupmapController);

    /* @ngInject */
    function GroupmapController($scope, $location, $state, $uibModal, _, groupmapService,
            FacetHandler, facetUrlStateHandlerService) {

    	// Range slider config
        $scope.minRangeSlider = {
            minValue: (new Date()).getFullYear()-100,
            maxValue: (new Date()).getFullYear(),
            options: {
                floor: 1000,
                ceil: (new Date()).getFullYear(),
                step: 10,
                draggableRange: true,
                onEnd: function () {
                    fetchResults({ constraint: vm.previousSelections });
                }
            }
        };
        
        
        var vm = this;
        vm.map = { center: { latitude: 62, longitude: 24 }, zoom: 6 };
        vm.markers = [];

        vm.isScrollDisabled = isScrollDisabled;
        vm.removeFacetSelections = removeFacetSelections;
        vm.getSortClass = groupmapService.getSortClass;

        vm.people = [];
        
        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        groupmapService.getFacets().then(function(facets) {
            vm.facets = facets;
            vm.facetOptions = getFacetOptions();
            vm.facetOptions.scope = $scope;
            vm.handler = new FacetHandler(vm.facetOptions);
        });

        function removeFacetSelections() {
            $state.reload();
        }

        function openPage(person) {
            $uibModal.open({
                component: 'registerPageModal',
                size: 'lg',
                resolve: {
                    person: function() { return person; }
                }
            });
        }

        function getFacetOptions() {
            var options = groupmapService.getFacetOptions();
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }

        var latestPageUpdate;
        function nextPage() {
            
        }

        function isScrollDisabled() {
            return vm.isLoadingResults || nextPageNo > maxPage;
        }

        function sortBy(sortBy) {
        	groupmapService.updateSortBy(sortBy);
            return fetchResults({ constraint: vm.previousSelections });
        }

        function updateResults(event, facetSelections) {
            if (vm.previousSelections && _.isEqual(facetSelections.constraint,
                    vm.previousSelections)) {
                return;
            }
            vm.previousSelections = _.clone(facetSelections.constraint);
            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            return fetchResults(facetSelections);
        }

        var latestUpdate;
        function fetchResults(facetSelections) {
            vm.isLoadingResults = true;
            vm.people = [];
            vm.error = undefined;
            facetSelections.minYear = $scope.minRangeSlider.minValue;
            facetSelections.maxYear = $scope.minRangeSlider.maxValue;
            
            var updateId = _.uniqueId();
            latestUpdate = updateId;

            return groupmapService.getResults(facetSelections)
            .then(function(res) {
            	vm.events = processEvents(res, vm);
            }).catch(handleError);
        }

        function handleError(error) {
            vm.isLoadingResults = false;
            vm.error = error;
        }
        
        function processEvents(events, vm) {
        	
        	var places = {};
        	
        	events.forEach( function(event) {
        		
        		if (!event.class) event.class = "event";
        		event.class = event.class.toLowerCase();
        		
        		//	count by place uris
        		var key=event.class+event.place.uri;
        		if (!places.hasOwnProperty(key)) {
        			places[key]={count:0, latitude:event.place.latitude, longitude:event.place.longitude, type:event.class}
        		}
        		places[key]['count']+=1;
        	});
        	
        	vm.markers = [];
        	var i = 0;
        	for (var x in places) {
        		var place=places[x];
        		var m = generateMarker(place.latitude, place.longitude, ++i, place.type, 5.0*Math.sqrt(place.count));
        		vm.markers.push(m);
        	}
        	
        	var bounds = new google.maps.LatLngBounds();
        	
        	// scale the years to get a coordinate on the timeline:
        	
        	var map = document.getElementById('ui-gmap-google-map');
        	if (map && map.fitBounds) { map.fitBounds(bounds); }
        	
        	return events;
        }
        
        
        function generateMarker(lat, lon, id, type, r) {
        	if (!r) r=5.0;
        	var ICONCOLORS = {
    				"death":	"#ff4141",
    				"birth":	"#777fff",
    				"spouse":	"#c3b981",
    				"child":	"#7f6780",
    				"career":	"#999999",
    				"product":	"#83d236",
    				"honour":	"#ce5c00",
    				"event":	"#ABCDEF"
    		};
        	var m = {
        			"latitude": lat,
        			"longitude": lon,
        			"id": id,
        			"options": {
	        			icon:{
	        				path:"M-"+r+" 0 A "+r+","+r+", 0 ,1, 1,"+r+",0 A"+r+","+r+",0,1,1,-"+r+",0 Z",
							scale: 1.0,
							anchor: new google.maps.Point(0,0),
							fillColor: ICONCOLORS[type],
							fillOpacity: 0.6,
							strokeOpacity: 0.2,
							strokeWeight: 1,
							labelOrigin: new google.maps.Point(0, 0)
							},
						optimized: false,
						}
        	};
        	return m;
        }
        
    }
})();
