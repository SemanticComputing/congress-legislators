/*
 * Semantic faceted search
 *
 */

(function() {

    'use strict';

    angular.module('facetApp')

    /*
    * Controller for the results view.
    */
    .controller('VisuControllerR', VisuControllerR);

    /* @ngInject */
    function VisuControllerR($scope, $location, $q, $state, _, visucomserviceR,
            FacetHandler, facetUrlStateHandlerService) {

        var vm = this;

        vm.people = [];
		    vm.removeFacetSelections = removeFacetSelections;

		google.charts.load('current', {packages: ['corechart', 'line', 'sankey']});

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        visucomserviceR.getFacets().then(function(facets) {
            vm.facets = facets;
            vm.facetOptions = getFacetOptions();
            vm.facetOptions.scope = $scope;
            vm.handler = new FacetHandler(vm.facetOptions);
        });

        function removeFacetSelections() {
            $state.reload();
        }

        function getFacetOptions() {
            var options = visucomserviceR.getFacetOptions();
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }


        function updateResults(event, facetSelections) {
            if (vm.previousSelections && _.isEqual(facetSelections.constraint,
                    vm.previousSelections)) {
                return;
            }
            vm.previousSelections = _.clone(facetSelections.constraint);
            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            return fetchResults(facetSelections).then(function (people) {
              google.charts.setOnLoadCallback(function () { drawPieChart('memberOf', 'Political Party', 'chart_memberOf_2'); });
            	google.charts.setOnLoadCallback(function () { drawPieChart('occupation', 'Occupation', 'chart_occupation_2'); });
              google.charts.setOnLoadCallback(function () { drawPieChart('place', 'Place of Birth', 'chart_place_2'); });
              google.charts.setOnLoadCallback(function () { drawPieChart('committee', 'Committees', 'chart_committee_2'); });
              google.charts.setOnLoadCallback(drawSankeyChart);
            	return;
	         });
        }

        function drawPieChart(prop, label, target) {

        	var arr = countByProperty(vm.people, prop),
	        	data = google.visualization.arrayToDataTable( [[label, 'Number']].concat(arr)),
            	options = { title: label, backgroundColor: '#ebb5c0'},
            	chart = new google.visualization.PieChart(document.getElementById(target));

            chart.draw(data, options);
        }

        function drawSankeyChart() {
        			//	TODO: check with options giving only a few (less < 5) results:
              var prop 	= 'type',
        				prop2 	= 'memberOf',
        				res 	= {},
        				res2	= {},
        				N = 10;

        			$.each(vm.people, function( i, value ) {
        				if (value.hasOwnProperty(prop) && value.hasOwnProperty(prop2)) {
        					var y=value[prop],
        						y2=value[prop2];

        					if (res.hasOwnProperty(y)) {
        						res[y] += 1;
        					} else {
        						res[y] = 1;
        					}

        					if (res2.hasOwnProperty(y2)) {
        						res2[y2] += 1;
        					} else {
        						res2[y2] = 1;
        					}
        				}
        			});

        			res = $.map( res, function( value, key ) { return [[key, value]]; })
        				.sort(function(a, b){ return b[1]-a[1] });

        			res2 = $.map( res2, function( value, key ) { return [[key, value]];})
        				.sort(function(a, b){ return b[1]-a[1] });

        			var sear = {},
        				sear2 = {};

        			$.each(res,  function( i, value ) {
        				sear[value[0]] = {
        						index: (i<N-1 ? i : N-1)
        						}
        				});


        			$.each(res2, function( i, value ) {
        				sear2[value[0]] = {
        						index: (i<N-1 ? i : N-1)
        						}
        				});


        			var arr = $.map(new Array(Math.min(N,res.length)), function(i,v) {
        				return [ $.map(new Array(Math.min(N,res2.length)), function(i,v) {return 0;}) ];
        				});

        			$.each(vm.people, function( i, value ) {
        				if (value.hasOwnProperty(prop) && value.hasOwnProperty(prop2)) {
        					var y = value[prop], y2 = value[prop2];
        					arr[sear[y]['index']][sear2[y2]['index']] += 1;
        				}
        			});

        			var arr2 = [];
        			for (var i=0; i<arr.length; i++) {
        				for (var j=0; j<arr[i].length; j++) {
        					arr2.push( [
        						j<N-1 ? res2[j][0] : '(Other)',
        						i<N-1 ? res[i][0] : '(Other)',
        						arr[i][j] ] );
        				}
        			}

        			var data = new google.visualization.DataTable();
        	        data.addColumn('string', prop2);
        	        data.addColumn('string', prop);
        	        data.addColumn('number', 'Weight');
        	        data.addRows(arr2);


        	        // Sets chart options.
        	        var options = {
        	        		title: 'Correlation between the Chamber and Political Party',
        	        		sankey: {
        	        			node: 	{
        	        	        	label: {
        	        	        		fontSize: 14,
        	        	                color: '#000',
        	        	                bold: true },
        	        	        labelPadding: 12
        	        	        }
        	        		},
        	        };

        	        // Instantiates and draws our chart, passing in some options.
        	        var chart = new google.visualization.Sankey(document.getElementById('chart_sankey_2'));
        	        chart.draw(data, options);

        		}




		function countByProperty(data, prop) {
			return countProperties(data, prop)
				.sort(function(a, b){ return b[1]-a[1] });
    	}



		function countProperties(data, prop) {
			var res = {};
			$.each(data, function( i, value ) {
				if (value.hasOwnProperty(prop)) {
					var y=value[prop];

					if (res.hasOwnProperty(y)) {
						res[y] += 1;
					} else {
						res[y] = 1;
					}
				}
			});
			return $.map( res, function( value, key ) {
				return [[key, value]];
			});
    	}


        var latestUpdate;
        function fetchResults(facetSelections) {
            vm.isLoadingResults = true;
            vm.people = [];
            vm.error = undefined;

            var updateId = _.uniqueId();
            latestUpdate = updateId;

            return visucomserviceR.getResultsPage1(facetSelections).then(function(res) {
            	if (latestUpdate !== updateId) {
                    return;
                }

                vm.isLoadingResults = false;
                vm.people = res[0];
                return res;
            }).catch(handleError);
        }

        function handleError(error) {
        	console.log(error)
            vm.isLoadingResults = false;
            vm.error = error;
        }
    }
})();
