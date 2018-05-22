/*
 * facetApp module definition
 */
(function() {

    'use strict';

    angular.module('facetApp', [
        'ui.router',
        'seco.facetedSearch',
        'ngTable',
        'angular.filter',
        'ngAnimate',
        'ui.bootstrap',
        'infinite-scroll',
        'uiGmapgoogle-maps',
        'rzModule'
    ])

    .constant('_', _) // eslint-disable-line no-undef
    .constant('RESULTS_PER_PAGE', 25)
    .constant('PAGES_PER_QUERY', 1)

    .value('SPARQL_ENDPOINT_URL', 'https://ldf.fi/congress/sparql')

    .run(function(authStorage) {
        authStorage.init();
    })

    .config(function($urlMatcherFactoryProvider) {
        $urlMatcherFactoryProvider.strictMode(false);
    })

    .config(function($urlRouterProvider){
        $urlRouterProvider.when('', '/grid');
    })

    .config(function($urlRouterProvider){
        $urlRouterProvider.when('', '/comparison');
    })

    .config(function($urlRouterProvider){
        $urlRouterProvider.when('', '/comparison2');
    })

    .config(function($urlRouterProvider){
        $urlRouterProvider.when('', '/comparison3');
    })

    .service('authInterceptor', function ($q, $state) {
        this.responseError = function(response) {
            if (response.status == 401) {
                $state.go('login');
            }
            return $q.reject(response);
        };
    })

    .config(function($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
    })

    .config(function($stateProvider) {
        $stateProvider
        .state('login', {
            url: '/login',
            templateUrl: 'views/login.html',
            controller: 'LoginController',
            controllerAs: 'vm'
        })
        .state('person', {
            abstract: true,
            url: '/:personId',
            templateUrl: 'views/person.html'
        })
        .state('person.detail', {
            url: '',
            templateUrl: 'views/detail.html',
            controller: 'DetailController',
            controllerAs: 'vm'
        })
        .state('person.map', {
            url: '/kartta',
            templateUrl: 'views/map.html',
            controller: 'MapController',
            controllerAs: 'vm'
        })
        .state('table', {
            url: '/list',
            templateUrl: 'views/table.html',
            controller: 'TableController',
            controllerAs: 'vm'
        })
        .state('groupmap', {
            url: '/groupmap',
            templateUrl: 'views/groupmap.html',
            controller: 'GroupmapController',
            controllerAs: 'vm',
        })
        .state('cards', {
            url: '/grid',
            templateUrl: 'views/cards.html',
            controller: 'CardsController',
            controllerAs: 'vm',
        })
        .state('comparison', {
          abstract: true,
          templateUrl: 'views/cards.comparison.template.html',
        })
        .state('comparison.cards', {
          url: '/comparison',
          views: {
            left: {
              templateUrl: 'views/cards-comparison.L.html',
              controller: 'CardsControllerComparisonL',
              controllerAs: 'vm',
            },
            right: {
              templateUrl: 'views/cards-comparison.R.html',
              controller: 'CardsControllerComparisonR',
              controllerAs: 'vm',
            }
          }
        })
        .state('comparison.cards1', {
          url: '/comparison1',
          views: {
            "left@comparison": {
              templateUrl: 'views/groupmap.comparison.L.html',
              controller: 'GroupmapControllerL',
              controllerAs: 'vm',
            },
            "right@comparison": {
              templateUrl: 'views/groupmap.comparison.R.html',
              controller: 'GroupmapControllerR',
              controllerAs: 'vm'
            }
          }
        })
        .state('comparison2', {
          abstract: true,
          templateUrl: 'views/cards.comparison.template-stats.html',
        })
        .state('comparison2.cards2', {
          url: '/comparison2',
          views: {
            "left@comparison2": {
              templateUrl: 'views/cards-comparison2.L.html',
              controller: 'VisuControllerL',
              controllerAs: 'vm',
            },
            "right@comparison2": {
              templateUrl: 'views/cards-comparison2.R.html',
              controller: 'VisuControllerR',
              controllerAs: 'vm',
            }
          }
        })
        .state('comparison2.cards3', {
          url: '/comparison3',
          views: {
            "left@comparison2": {
              templateUrl: 'views/cards-comparison3.L.html',
              controller: 'VisuController2L',
              controllerAs: 'vm',
            },
            "right@comparison2": {
              templateUrl: 'views/cards-comparison3.R.html',
              controller: 'VisuController2R',
              controllerAs: 'vm'
            }
          }
        })
        .state('visualizations', {
            abstract: true
        })
        .state('visualizations.visu', {
            url: '/visualizations',
            templateUrl: 'views/visu.html',
            controller: 'VisuController',
            controllerAs: 'vm'
        })
        .state('visualizations.visu2', {
            url: '/visualizations2',
            templateUrl: 'views/visu2.html',
            controller: 'VisuController2',
            controllerAs: 'vm'
        });
    });
})();
