(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('loginService', loginService);

    /* @ngInject */
    function loginService($q, $http, authStorage, SPARQL_ENDPOINT_URL) {

        this.login = login;

        function login(un, pw) {
            authStorage.clearToken();
            var token = btoa(un + ':' + pw);
            var config = { headers: { 'Authorization': 'Basic ' + token } };
            return $http.get(SPARQL_ENDPOINT_URL + '?query=ASK{}', config).then(function() {
                // Success
                authStorage.setToken(token);
                return true;
            }).catch(function() {
                // Fail
                return false;
            });
        }

    }
})();
