(function() {
    'use strict';

    /*
    * Service for transforming SPARQL result triples into person objects.
    */
    angular.module('facetApp')

    .factory('eventMapperService', eventMapperService);

    /* ngInject */
    function eventMapperService($sce, _, objectMapperService) {
        EventMapper.prototype.postProcess = postProcess;
        
        var proto = Object.getPrototypeOf(objectMapperService);
        EventMapper.prototype = angular.extend({}, proto, PersonMapper.prototype);
        
        return new EventMapper();

        function EventMapper() {
            this.objectClass = Object;
        }

        function postProcess(objects) {
            return objects;
        }
    }
})();
