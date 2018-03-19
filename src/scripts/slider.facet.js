(function() {
    'use strict';

    angular.module('seco.facetedSearch')
    .factory('SliderFacet', SliderFacet)
    .controller('SliderFacetController', SliderFacetController)
    .directive('secoSliderFacet', sliderFacet);

    function sliderFacet() {
        return {
            restrict: 'E',
            scope: {
                options: '='
            },
            controller: 'SliderFacetController',
            controllerAs: 'vm',
            templateUrl: 'views/sliderFacet.directive.html'
        };
    }

    /* ngInject */
    function SliderFacetController($scope, _, EVENT_FACET_CHANGED,
            EVENT_REQUEST_CONSTRAINTS, EVENT_INITIAL_CONSTRAINTS, SliderFacet) {
        var vm = this;

        vm.changed = changed;
        vm.clear = clear;
        vm.enableFacet = enableFacet;
        vm.disableFacet = disableFacet;
        vm.isFacetEnabled = isFacetEnabled;

        // Wait until the options attribute has been set.
        var watcher = $scope.$watch('options', function(val) {
            if (val) {
                init();
                watcher();
            }
        });

        function init() {
            var initListener = $scope.$on(EVENT_INITIAL_CONSTRAINTS, function(event, cons) {
                var opts = _.cloneDeep($scope.options);
                opts.initial = cons.facets;
                opts.update = changed;
                vm.facet = new SliderFacet(opts);
                // Unregister initListener
                initListener();
            });
            $scope.$emit(EVENT_REQUEST_CONSTRAINTS);
        }

        function emitChange() {
            var args = {
                id: vm.facet.facetId,
                constraint: vm.facet.getConstraint(),
                value: vm.facet.getSelectedValue(),
                priority: vm.facet.getPriority()
            };
            $scope.$emit(EVENT_FACET_CHANGED, args);
        }

        function changed() {
            emitChange();
        }

        function clear() {
            vm.facet.clear();
            emitChange();
        }

        function enableFacet() {
            vm.facet.enable();
        }

        function disableFacet() {
            vm.facet.disable();
            emitChange();
        }

        function isFacetEnabled() {
            if (!vm.facet) {
                return false;
            }
            return vm.facet.isEnabled();
        }
    }

    /* ngInject */
    function SliderFacet(_) {
        SliderFacet.prototype.getConstraint = getConstraint;
        SliderFacet.prototype.getPriority = getPriority;
        SliderFacet.prototype.getPreferredLang = getPreferredLang;
        SliderFacet.prototype.disable = disable;
        SliderFacet.prototype.enable = enable;
        SliderFacet.prototype.clear = clear;
        SliderFacet.prototype.isEnabled = isEnabled;
        SliderFacet.prototype.getSelectedValue = getSelectedValue;

        return SliderFacet;

        function SliderFacet(options) {

            var defaultConfig = {
                preferredLang: 'en'
            };

            this.config = angular.extend({}, defaultConfig, options);

            this.name = this.config.name;
            this.facetId = this.config.facetId;
            this.predicate = this.config.predicate;
            if (this.config.enabled) {
                this.enable();
            } else {
                this.disable();
            }
            this.internalId = _.uniqueId();
            var min = parseInt(this.config.min) || 1;
            var max = parseInt(this.config.max) || 115;
            // Range slider config
            this.slider = {
                minValue: min,
                maxValue: max,
                options: {
                    floor: min,
                    ceil: max,
                    step: 1,
                    draggableRange: true,
                    onEnd: this.config.update
                }
            };

            // Initial value
            var initial = _.get(options, 'initial.' + this.facetId + '.value');
            if (initial) {
                this._isEnabled = true;
                this.slider.minValue = initial.min;
                this.slider.maxValue = initial.max;
            }
        }

        function getConstraint() {
          var min = this.slider.minValue;
          var max = this.slider.maxValue;
          var obj = '?slider_' + this.internalId;
          var constraint = ('?id <PREDICATE> <OBJ> . ' +
          'FILTER (<START><=ABS(<OBJ>) && ABS(<OBJ>)<=<END>) ')
          .replace(/<OBJ>/g, obj)
          .replace(/<PREDICATE>/g, this.predicate)
          .replace('<START>', min)
          .replace('<END>', max);
            return constraint;
        }

        function getPreferredLang() {
            return this.config.preferredLang;
        }

        function getSelectedValue() {
            return { min: this.slider.minValue, max: this.slider.maxValue };
        }

        function getPriority() {
            return this.config.priority;
        }

        function clear() {
        }

        function isEnabled() {
            return this._isEnabled;
        }

        function enable() {
            this._isEnabled = true;
        }

        function disable() {
            this.selectedValue = undefined;
            this._isEnabled = false;
        }

    }
})();
