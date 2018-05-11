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
    .controller('CardsControllerComparisonL', CardsControllerComparisonL);

    /* @ngInject */
    function CardsControllerComparisonL($scope, $location, $state, $uibModal, _, comparisonServiceL,
            FacetHandler, facetUrlStateHandlerService) {

              /*
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
              */

        var vm = this;

        var nextPageNo;
        var maxPage;

        vm.openPage = openPage;
        vm.nextPage = nextPage;
        vm.isScrollDisabled = isScrollDisabled;
        vm.removeFacetSelections = removeFacetSelections;
        vm.sortBy = sortBy;
        vm.getSortClass = comparisonServiceL.getSortClass;

        vm.people = [];

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        comparisonServiceL.getFacets().then(function(facets) {
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
            var options = comparisonServiceL.getFacetOptions();
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }

        var latestPageUpdate;
        function nextPage() {
            var updateId = _.uniqueId();
            latestPageUpdate = updateId;

            vm.isLoadingResults = true;
            if (nextPageNo++ <= maxPage) {
                vm.pager.getPage(nextPageNo-1, 24)
                .then(function(page) {
                    if (updateId !== latestPageUpdate) {
                        return;
                    }
                    vm.people = vm.people.concat(page);
                    vm.isLoadingResults = false;
                }).catch(handleError);
            } else {
                vm.isLoadingResults = false;
            }
        }

        function isScrollDisabled() {
            return vm.isLoadingResults || nextPageNo > maxPage;
        }

        function sortBy(sortBy) {
        	comparisonServiceL.updateSortBy(sortBy);
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
            /* facetSelections.minYear = $scope.minRangeSlider.minValue;
            facetSelections.maxYear = $scope.minRangeSlider.maxValue; */

            var updateId = _.uniqueId();
            latestUpdate = updateId;

            nextPageNo = 0;
            comparisonServiceL.getResults(facetSelections)
            .then(function(pager) {
                return pager.getMaxPageNo().then(function(no) {
                    return [pager, no];
                });
            }).then(function(res) {
                if (latestUpdate !== updateId) {
                    return;
                }
                vm.pager = res[0];
                maxPage = res[1];
                vm.isLoadingResults = false;
                return nextPage();
            }).catch(handleError);
        }

        function handleError(error) {
            vm.isLoadingResults = false;
            vm.error = error;
        }
    }
})();
