(function() {
    'use strict';

    angular.module('facetApp')

    .service('authStorage', function($window, $http) {
        this.init = init;
        this.setToken = setToken;
        this.getToken = getToken;
        this.clearToken = clearToken;

        function init() {
            var token = getToken();
            if (token) {
                setToken(token);
            }
        }

        function clearToken() {
            $window.sessionStorage.removeItem('sparqlAuthToken');
        }

        function setToken(token) {
            $http.defaults.headers.common.Authorization = 'Basic ' + token;
            return $window.sessionStorage.setItem('sparqlAuthToken', token);
        }

        function getToken() {
            return $window.sessionStorage.getItem('sparqlAuthToken');
        }
    });
})();
