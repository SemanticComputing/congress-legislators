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
    .controller('TableController', TableController);

    /* @ngInject */
    function TableController($scope, $state, $uibModal, _, RESULTS_PER_PAGE,
    		congressService, NgTableParams, FacetHandler, facetUrlStateHandlerService) {

          ///// Range slider config
            $scope.minRangeSlider = {
                minValue: (new Date()).getFullYear()-300,
                maxValue: (new Date()).getFullYear()-250,
                options: {
                    floor: 1720,
                    ceil: (new Date()).getFullYear(),
                    step: 10,
                    draggableRange: true,
                    onEnd: function () {
                        fetchResults({ constraint: vm.previousSelections });
                    }
                }
            };
          /////


        var vm = this;

        vm.openPage = openPage;
        vm.removeFacetSelections = removeFacetSelections;
        vm.sortBy = sortBy;
        vm.getSortClass = congressService.getSortClass;

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        congressService.getFacets().then(function(facets) {
            vm.facets = facets;
            vm.facetOptions = getFacetOptions();
            vm.facetOptions.scope = $scope;
            vm.handler = new FacetHandler(vm.facetOptions);
        });

        function removeFacetSelections() {
            $state.reload();
        }

        function initializeTable() {
            vm.tableParams = new NgTableParams(
                {
                    count: RESULTS_PER_PAGE
                },
                {
                    getData: getData
                }
            );
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
            var options = congressService.getFacetOptions();
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }

        function getData(params) {
            vm.isLoadingResults = true;
            console.log(vm.pager)
            return vm.pager.getPage(params.page() - 1, params.count())
            .then(function(page) {
                return vm.pager.getTotalCount().then(function(count) {
                    vm.tableParams.total(count);
                    return page;
                }).then(function(page) {
                    vm.isLoadingResults = false;
                    return page;
                });
            });
        }

        function updateResults(event, facetSelections) {
            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            vm.previousSelections = _.clone(facetSelections.constraint);

            return fetchResults(facetSelections);
        }

        function fetchResults(facetSelections) {
            vm.isLoadingResults = true;
            /////
            facetSelections.minYear = $scope.minRangeSlider.minValue;
            facetSelections.maxYear = $scope.minRangeSlider.maxValue;
            /////

            congressService.getResults(facetSelections)
            .then(function(pager) {
                vm.pager = pager;
                if (vm.tableParams) {
                    vm.tableParams.page(1);
                    vm.tableParams.reload();
                } else {
                    initializeTable();
                }
            });
        }

        function sortBy(sortBy) {
        	congressService.updateSortBy(sortBy);
            return fetchResults({ constraint: vm.previousSelections });
        }
    }
})();
