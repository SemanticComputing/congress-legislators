(function() {
    'use strict';

    angular.module('facetApp')

    .directive('wsNavbar', wsNavbarDirective);

    /* @ngInject */
    function wsNavbarDirective($location, $templateRequest, $compile, $uibModal) {
        return {
            link: link,
            controller: NavbarController,
            controllerAs: 'vm'
        };

        function link(scope, elem) {
            var templateUrl = 'navbar-fi.html';
            return $templateRequest(templateUrl)
            .then(function(template) {
                elem.html(template);
                return $templateRequest('views/subnavbar.html');
            }).then(function(template) {
                angular.element('#subnav').html(template);
                return $compile(elem.contents())(scope);
            });
        }

        function NavbarController() {
            var vm = this;

            vm.showHelp = showHelp;

            function showHelp() {
                $uibModal.open({
                    templateUrl: 'views/help.html',
                    size: 'lg'
                });
            }

        }
    }
})();
