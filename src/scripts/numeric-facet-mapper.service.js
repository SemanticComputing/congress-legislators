(function() {
    /* Mapper for facets that have numeric values that should be sorted numerically in the facet. */

    'use strict';

    angular.module('facetApp')

    .factory('numericFacetMapperService', numericFacetMapperService);

    /* ngInject */
    function numericFacetMapperService(_, facetMapperService) {
        NumericFacetMapper.prototype.makeObject = makeObject;

        var proto = Object.getPrototypeOf(facetMapperService);
        NumericFacetMapper.prototype = angular.extend({}, proto, NumericFacetMapper.prototype);

        return new NumericFacetMapper();

        function NumericFacetMapper() {
            this.objectClass = Object;
        }

        function makeObject(obj) {
            var o = new this.objectClass();

            o.value = _.get(obj, 'value.value');

            var number = parseInt(o.value);

            o.text = number ? number : _.get(obj, 'facet_text.value');
            o.count = obj.cnt ? parseInt(obj.cnt.value) : undefined;

            return o;
        }
    }
})();
