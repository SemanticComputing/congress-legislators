(function() {

    'use strict';

    angular.module('facetApp')

    /*
    * Controller for the person detail view.
    */
    .controller('LoginController', LoginController);

    /* @ngInject */
    function LoginController($state, $stateParams, loginService) {

        var vm = this;

        vm.login = login;

        function login() {
            return loginService.login(vm.un, vm.pw).then(function(success) {
                if (success) {
                    return $state.transitionTo('cards', $stateParams, {
                        reload: true, inherit: false, notify: true
                    });
                }
                vm.error = 'Failed to log in';
            });
        }
    }
})();
