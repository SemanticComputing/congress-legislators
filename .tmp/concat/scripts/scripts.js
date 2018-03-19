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

    .run(["authStorage", function(authStorage) {
        authStorage.init();
    }])

    .config(["$urlMatcherFactoryProvider", function($urlMatcherFactoryProvider) {
        $urlMatcherFactoryProvider.strictMode(false);
    }])

    .config(["$urlRouterProvider", function($urlRouterProvider){
        $urlRouterProvider.when('', '/grid');
    }])

    .service('authInterceptor', ["$q", "$state", function ($q, $state) {
        this.responseError = function(response) {
            if (response.status == 401) {
                $state.go('login');
            }
            return $q.reject(response);
        };
    }])

    .config(["$httpProvider", function($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
    }])

    .config(["$stateProvider", function($stateProvider) {
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
        .state('visualizations', {
            abstract: true
        })
        .state('visualizations.visu', {
            url: '/visualisointi',
            templateUrl: 'views/visu.html',
            controller: 'VisuController',
            controllerAs: 'vm'
        })
        .state('visualizations.visu2', {
            url: '/visualisointi2',
            templateUrl: 'views/visu2.html',
            controller: 'VisuController2',
            controllerAs: 'vm'
        });
    }]);
})();

(function() {
    'use strict';

    angular.module('facetApp')

    .service('authStorage', ["$window", "$http", function($window, $http) {
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
    }]);
})();

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
    loginService.$inject = ["$q", "$http", "authStorage", "SPARQL_ENDPOINT_URL"];
})();

(function() {

    'use strict';

    angular.module('facetApp')
    .filter('castArray', ["_", function(_) {
        return function(input) {
            return _.castArray(input);
        };
    }]);

})();

(function() {
    'use strict';

    /*
    * Service for transforming SPARQL result triples into person objects.
    */
    angular.module('facetApp')

    .factory('personMapperService', personMapperService);

    /* ngInject */
    function personMapperService($sce, _, objectMapperService) {
        PersonMapper.prototype.postProcess = postProcess;

        var proto = Object.getPrototypeOf(objectMapperService);
        PersonMapper.prototype = angular.extend({}, proto, PersonMapper.prototype);

        return new PersonMapper();

        function PersonMapper() {
            this.objectClass = Object;
        }

        function postProcess(objects) {
            objects.forEach(function(person) {

                person.hasImage = !!person.images;
                person.images = person.images ? _.castArray(person.images) : ['images/person_placeholder.svg'];

                if (person.hasOwnProperty('wikipedia')) {
                	person.wikipedia = 'https://en.wikipedia.org/wiki/' + person.wikipedia;
                }

                if (person.hasOwnProperty('twitter')) {
                	person.twitter = 'https://twitter.com/' + person.twitter;
                }

                if (person.hasOwnProperty('committee')) {
                  person.committee.label = person.committee.label+'\n'+person.prefLabel;
                }

            });
            return objects;
        }
    }
    personMapperService.$inject = ["$sce", "_", "objectMapperService"];
})();

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
    eventMapperService.$inject = ["$sce", "_", "objectMapperService"];
})();

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
    numericFacetMapperService.$inject = ["_", "facetMapperService"];
})();

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('nbfService', nbfService);

    /* @ngInject */
    function nbfService($q, $location, _, FacetResultHandler, SPARQL_ENDPOINT_URL,
            AdvancedSparqlService, personMapperService, numericFacetMapperService) {

        /* Public API */

        // Get the results based on facet selections.
        // Return a promise.
        this.getResults = getResults;
        // Get the facets.
        // Return a promise (because of translation).
        this.getFacets = getFacets;
        // Get the facet options.
        // Return an object.
        this.getFacetOptions = getFacetOptions;
        // Update sorting URL params.
        this.updateSortBy = updateSortBy;
        // Get the CSS class for the sort icon.
        this.getSortClass = getSortClass;
        // Get the details of a single person.
        this.getPerson = getPerson;

        /* Implementation */

        var facets = {
            entryText: {
                facetId: 'entryText',
                graph: '<http://ldf.fi/congress/people>',
                name: 'Search',
                enabled: true
            },
            slider: {
                facetId: 'slider',
                name: 'Timeline: 1st (1789) - 115th (2018) Congresses',
                predicate: '<http://ldf.fi/congress/icpsr_id>/^<http://ldf.fi/congress/icpsr_id>/<http://ldf.fi/congress/congress_number>',
                enabled: true
            },
            link: {
                facetId: 'link',
                choices: [
                    {
                        id: 'wikipedia',
                        pattern: '?id <http://ldf.fi/congress/wikipedia_id> [] .',
                        label: 'Wikipedia'
                    },{
                        id: 'dbpedia',
                        pattern: '?id <http://ldf.fi/congress/dbpedia_id> [] .',
                        label: 'DBpedia'
                    },
                    {
                        id: 'twitter',
                        pattern: '?id <http://ldf.fi/congress/twitter> [] .',
                        label: 'Twitter'
                    }
                ],
                enabled: true,
                name: 'Links'
            },
            familyName: {
                facetId: 'familyName',
                predicate: '<http://schema.org/familyName>',
                name: 'Family Name'
            },
            givenName: {
                facetId: 'givenName',
                predicate: '<http://schema.org/givenName>',
                name: 'First Name'
            },
            birthDate: {
                facetId: 'birthDate',
                predicate: '<http://schema.org/birthDate>',
            },
            deathDate: {
                facetId: 'deathDate',
                predicate: '<http://schema.org/deathDate>',
            },
            birthPlace: {
                facetId: 'birthPlace',
                predicate: '<http://schema.org/birthPlace>',
                name: 'Place of Birth',
                hierarchy: '<http://schema.org/containedInPlace>',
                depth: 5,
            },
            gender: {
                facetId: 'gender',
                predicate: '<http://schema.org/gender>',
                name: 'Gender'
            },
            occupation: {
                facetId: 'occupation',
                predicate: '<http://schema.org/hasOccupation>',
                name: 'Occupation',
            },
           state: {
                facetId: 'state',
                predicate: '<http://schema.org/state>',
                name: 'Representing State',
                enabled: true
            },
            memberOf: {
                facetId: 'memberOf',
                predicate: '<http://schema.org/memberOf>',
                name: 'Political Party',
                enabled: true
            },
            type: {
                facetId: 'type',
                predicate: '<http://ldf.fi/congress/type>',
                name: 'Chamber',
                enabled: true
            },
            congress_number: {
                facetId: 'congress_number',
                predicate: '<http://ldf.fi/congress/icpsr_id>/^<http://ldf.fi/congress/icpsr_id>/<http://ldf.fi/congress/congress_number>',
                name: 'Serving Record of the Period',
                mapper: numericFacetMapperService
            }
        };

        var prefixes =
        ' PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
        ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
        ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
        ' PREFIX schema: <http://schema.org/> ' +
        ' PREFIX dct: <http://purl.org/dc/terms/> ' +
        ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
        ' PREFIX skosxl: <http://www.w3.org/2008/05/skos-xl#> ' +
        ' PREFIX xml: <http://www.w3.org/XML/1998/namespace> ' +
        ' PREFIX congress: <http://ldf.fi/congress/> ' +
        ' PREFIX foaf: <http://xmlns.com/foaf/0.1/> ' +
        ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
        ' PREFIX wdt: <http://www.wikidata.org/prop/direct/> ' +
        ' PREFIX geo:   <http://www.w3.org/2003/01/geo/wgs84_pos#> ' +
        ' PREFIX wd_ent: <http://www.wikidata.org/entity/> ';

        // The query for the results on grid and list pages.
        // ?id is bound to the person URI.
        var query =
        ' SELECT DISTINCT * WHERE {' +
        '  { ' +
        '    <RESULT_SET> ' +
        '  } ' +
        '  	OPTIONAL { ?id schema:familyName ?familyName . }' +
        '  	OPTIONAL { ?id schema:givenName ?givenName . }' +
        '  	OPTIONAL { ?id rdfs:comment ?short_description . }' +
        ' ' +
        '  OPTIONAL { ?id schema:birthDate ?birthDate . }   ' +
        '  OPTIONAL { ?id schema:birthPlace/rdfs:label ?birthPlace . }   ' +
        '  OPTIONAL { ?id schema:deathDate ?deathDate . }   ' +
        '  OPTIONAL { ?id schema:deathPlace/rdfs:label ?deathPlace . }   ' +
        '   OPTIONAL { ?id congress:twitter ?twitter . }' +
        '   OPTIONAL { ?id congress:wikipedia_id ?wikipedia . }' +
        '   OPTIONAL { ?id congress:dbpedia_id ?dbpedia . }' +
        '  	OPTIONAL { ?id schema:gender ?gender . }' +
        '  	OPTIONAL { ?id schema:image ?images . }' +
        '	OPTIONAL { ?id schema:hasOccupation ?occupation . }' +
        '	OPTIONAL { ?id congress:type ?type . }' +
        ' OPTIONAL { ?id congress:icpsr_id/^congress:icpsr_id/congress:congress_number ?congress_number . }' +
        ' }';


        //	the query for single person pages, e.g. http://localhost:9000/#!/http:~2F~2Fldf.fi~2Fcongress~2Fp1045
        var detailQuery =
            'SELECT DISTINCT * WHERE {' +
            '  { ' +
            '    <RESULT_SET> ' +
            '  } ' +
            '  OPTIONAL { ?id schema:familyName ?familyName . } ' +
            '  OPTIONAL { ?id schema:givenName ?givenName . } ' +
            '  OPTIONAL { ?id schema:description ?description . } ' +
            '  OPTIONAL { ?id schema:birthDate ?birthDate . } ' +
            '  OPTIONAL { ?id schema:birthPlace/rdfs:label ?birthPlace . } ' +
            '  OPTIONAL { ?id schema:deathDate ?deathDate . } ' +
            '  OPTIONAL { ?id schema:deathPlace/rdfs:label ?deathPlace . } ' +
            '  OPTIONAL { ?id congress:wikipedia_id ?wikipedia . } ' +
            '  OPTIONAL { ?id congress:wikidata ?wikidata . } ' +
            '  OPTIONAL { ?id congress:dbpedia_id ?dbpedia . } ' +
            '  OPTIONAL { ?id congress:twitter ?twitter . } ' +
            '  OPTIONAL { ?id schema:gender ?gender . } ' +
            '  OPTIONAL { ?id schema:image ?images . } ' +
            '  OPTIONAL { ?id schema:hasOccupation ?occupation . } ' +
            '  OPTIONAL { ?id congress:bioguide_id ?committee__id . ' +
            '  ?mship congress:bioguide_id ?committee__id ; ' +
            '  congress:committee ?committee__label ; ' +
            '  schema:memberOf ?committee__memberOf. ' +
            '  ?congress skos:prefLabel ?prefLabel; ' +
            '  skos:altLabel ?altLabel. ' +
            '  FILTER regex(str(?congress), "/go"). ' +
            '  FILTER (str(?altLabel) = str(?committee__label)). ' +
              '}'+
            '}';

        // The SPARQL endpoint URL
        var endpointConfig = {
            'endpointUrl': SPARQL_ENDPOINT_URL,
            'usePost': true
        };

        var facetOptions = {
            endpointUrl: endpointConfig.endpointUrl,
            rdfClass: '<http://schema.org/Person>',
            constraint: '?id <http://schema.org/familyName> ?familyName . ?id <http://schema.org/givenName> ?givenName . ?id <http://schema.org/birthDate> ?birthDate . ',
            preferredLang : 'en',
            noSelectionString: '-- No selection --'
        };

        var resultOptions = {
            mapper: personMapperService,
            queryTemplate: query,
            prefixes: prefixes,
            paging: true,
            pagesPerQuery: 2 // get two pages of results per query
        };

        // The FacetResultHandler handles forming the final queries for results,
        // querying the endpoint, and mapping the results to objects.
        var resultHandler = new FacetResultHandler(endpointConfig, resultOptions);

        // This handler is for the additional queries.
        var endpoint = new AdvancedSparqlService(endpointConfig, personMapperService);

        function getResults(facetSelections) {
            return resultHandler.getResults(facetSelections, getSortBy());
        }

        function getPerson(id) {
        	var qry = prefixes + detailQuery;
            var constraint = 'VALUES ?id { <' + id + '> } . ';
            return endpoint.getObjects(qry.replace('<RESULT_SET>', constraint))
            .then(function(person) {
                if (person.length) {
                    return person[person.length-1];
                }
                return $q.reject('Not found');
            });
        }

        function getFacets() {
            var facetsCopy = angular.copy(facets);
            return $q.when(facetsCopy);
        }

        function getFacetOptions() {
            return facetOptions;
        }

        function updateSortBy(sortBy) {
            var sort = $location.search().sortBy || '?birthDate';
            if (sort === sortBy) {
                $location.search('desc', $location.search().desc ? null : true);
            }
            $location.search('sortBy', sortBy);
        }

        function getSortBy() {
            var sortBy = $location.search().sortBy;
            if (!_.isString(sortBy)) {
                sortBy = '?birthDate';
            }
            var sort;
            if ($location.search().desc) {
                sort = 'DESC(' + sortBy + ')';
            } else {
                sort = sortBy;
            }
            return sortBy === '?birthDate' ? sort : sort + ' ?birthDate';
        }

        function getSortClass(sortBy, numeric) {
            var sort = $location.search().sortBy || '?birthDate';
            var cls = numeric ? 'icon-sort-by-past' : 'icon-sort-by-alphabet';

            if (sort === sortBy) {
                if ($location.search().desc) {
                    return cls + '-alt';
                }
                return cls;
            }
        }
    }
    nbfService.$inject = ["$q", "$location", "_", "FacetResultHandler", "SPARQL_ENDPOINT_URL", "AdvancedSparqlService", "personMapperService", "numericFacetMapperService"];
})();

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('mapService', mapService);

    /* @ngInject */
    function mapService($q, $location, _, FacetResultHandler, SPARQL_ENDPOINT_URL,
            AdvancedSparqlService, personMapperService) {

        /* Public API */

        // Get the facets.
        // Return a promise (because of translation).
        this.getFacets = getFacets;
        // Get the facet options.
        // Return an object.
        this.getFacetOptions = getFacetOptions;
        // Update sorting URL params.
        this.updateSortBy = updateSortBy;
        // Get the CSS class for the sort icon.
        this.getSortClass = getSortClass;
        // Get the events of a single person.
        this.getEvents = getEvents;

        /* Implementation */


        var prefixes =
        ' PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
        ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
        ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
        ' PREFIX schema: <http://schema.org/> ' +
        ' PREFIX dct: <http://purl.org/dc/terms/> ' +
        ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ' +
        ' PREFIX skosxl: <http://www.w3.org/2008/05/skos-xl#> ' +
        ' PREFIX xml: <http://www.w3.org/XML/1998/namespace> ' +
        ' PREFIX bioc: <http://ldf.fi/schema/bioc/> ' +
        ' PREFIX nbf: <http://ldf.fi/nbf/> ' +
        ' PREFIX categories: <http://ldf.fi/nbf/categories/> ' +
        ' PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/> ' +
        ' PREFIX foaf: <http://xmlns.com/foaf/0.1/> ' +
        ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
        ' PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> ' +
        ' PREFIX gvp: <http://vocab.getty.edu/ontology#> ';

        // The query for the results.
        // ?id is bound to the event URI.
        var query =
        ' SELECT DISTINCT * WHERE {' +
        '  { ' +
        '    <RESULT_SET> ' +
        '  } ' +
    	'  ?pc a nbf:PersonConcept ; ' +
    	'      foaf:focus ?prs ; ' +
    	'  		skosxl:prefLabel ?ilabel . ' +
    	'  OPTIONAL { ?ilabel schema:givenName ?givenName } ' +
    	'  OPTIONAL { ?ilabel schema:familyName ?familyName } ' +
    	'' +
    	'  { ?pc bioc:has_family_relation ?id . ' +
    	'		?id bioc:inheres_in ?relative } ' +
    	'  UNION ' +
    	'  { ?id crm:P100_was_death_of ?prs . } ' +
    	'  UNION ' +
    	'  { ?id crm:P98_brought_into_life ?prs . } ' +
    	'  UNION ' +
    	'  { ?id bioc:inheres_in ?prs . } ' +
    	' ' +
    	'  ?id a/skos:prefLabel ?class . FILTER (lang(?class)="en") ' +
    	'  ?id nbf:time ?time . ' +
    	'		OPTIONAL { ?time gvp:estStart ?time__start. } ' +
    	'  		OPTIONAL { ?time gvp:estEnd ?time__end. } ' +
    	'  		OPTIONAL { ?time skos:prefLabel ?time__label. } ' +
    	'  	    BIND ( CONCAT(' +
    	'	        IF(bound(?time__start),str(year(?time__start)),"")' +
    	'	        ,"-", ' +
    	'	        IF(bound(?time__end),str(year(?time__end)),"")' +
    	'	      ) AS ?time__span) ' +
    	'' +
    	'  OPTIONAL { ?id skos:prefLabel ?label } ' +
    	'  OPTIONAL { ?id nbf:place ?place__uri . ' +
    	// '    	filter (isUri(?place__uri)) ' +
    	'    	?place__uri geo:lat ?place__latitude ; ' +
    	'            geo:long ?place__longitude  ;' +
    	'    		skos:prefLabel ?place__name .' +
    	'  } ' +
    	' } ORDER BY ?time__start DESC(?time__end)';


        // The SPARQL endpoint URL
        var endpointConfig = {
            'endpointUrl': SPARQL_ENDPOINT_URL,
            'usePost': true
        };
/**
        var facetOptions_OLD = {
            endpointUrl: endpointConfig.endpointUrl,
            rdfClass: '<http://ldf.fi/nbf/PersonConcept>',
            constraint: '?id <http://www.w3.org/2004/02/skos/core#prefLabel> ?familyName . ?id <http://ldf.fi/nbf/ordinal> ?ordinal . ',
            preferredLang : 'fi'
        };
*/
        var resultOptions = {
            mapper: personMapperService,
            queryTemplate: query,
            prefixes: prefixes,
            paging: true,
            pagesPerQuery: 2 // get two pages of results per query
        };

        // The FacetResultHandler handles forming the final queries for results,
        // querying the endpoint, and mapping the results to objects.
        var resultHandler = new FacetResultHandler(endpointConfig, resultOptions);

        // This handler is for the additional queries.
        var endpoint = new AdvancedSparqlService(endpointConfig, personMapperService);

        function getResults(facetSelections) {
            return resultHandler.getResults(facetSelections, getSortBy());
        }
        /**
        function getResults1_OLD(facetSelections) {
        	var q = query.replace("<RESULT_SET>", facetSelections.constraint.join(' '));
        	return endpoint.getObjectsNoGrouping(q);
        }
        */
        function getEvents(id) {
            var qry = prefixes + query;
            var constraint = 'VALUES ?idorg { <' + id + '> } . ?idorg owl:sameAs* ?pc . ';
            // console.log(qry.replace('<RESULT_SET>', constraint));
            return endpoint.getObjects(qry.replace('<RESULT_SET>', constraint))
            .then(function(events) {

                if (events.length) {
                    return events;
                }
                return $q.reject('No events found');
            });
        }

        /**
        function getPerson(id) {
            var qry = prefixes + query;
            var constraint = 'VALUES ?idorg { <' + id + '> } . ?idorg owl:sameAs* ?pc . ';
            //	console.log(qry.replace('<RESULT_SET>', constraint));
            return endpoint.getObjects(qry.replace('<RESULT_SET>', constraint))
            .then(function(person) {
            	// console.log(person);
                if (person.length) {
                    return person[person.length-1];
                }
                return $q.reject('Not found');
            });
        }
        function getAchievements(person) {
        	return person;
        }
         */

        function getFacets() {
            var facetsCopy = angular.copy(facets);
            return $q.when(facetsCopy);
        }

        function getFacetOptions() {
            return facetOptions;
        }

        function updateSortBy(sortBy) {
            var sort = $location.search().sortBy || '?ordinal';
            if (sort === sortBy) {
                $location.search('desc', $location.search().desc ? null : true);
            }
            $location.search('sortBy', sortBy);
        }

        function getSortBy() {
            var sortBy = $location.search().sortBy;
            if (!_.isString(sortBy)) {
                sortBy = '?ordinal';
            }
            var sort;
            if ($location.search().desc) {
                sort = 'DESC(' + sortBy + ')';
            } else {
                sort = sortBy;
            }
            return sortBy === '?ordinal' ? sort : sort + ' ?ordinal';
        }

        function getSortClass(sortBy, numeric) {
            var sort = $location.search().sortBy || '?ordinal';
            var cls = numeric ? 'glyphicon-sort-by-order' : 'glyphicon-sort-by-alphabet';

            if (sort === sortBy) {
                if ($location.search().desc) {
                    return cls + '-alt';
                }
                return cls;
            }
        }
    }
    mapService.$inject = ["$q", "$location", "_", "FacetResultHandler", "SPARQL_ENDPOINT_URL", "AdvancedSparqlService", "personMapperService"];
})();

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
    SliderFacetController.$inject = ["$scope", "_", "EVENT_FACET_CHANGED", "EVENT_REQUEST_CONSTRAINTS", "EVENT_INITIAL_CONSTRAINTS", "SliderFacet"];

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
    SliderFacet.$inject = ["_"];
})();

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('groupmapService', groupmapService);

    /* @ngInject */
    function groupmapService($q, $location, _, FacetResultHandler, SPARQL_ENDPOINT_URL,
            AdvancedSparqlService, personMapperService, numericFacetMapperService) {

        /* Public API */

        // Get the results based on facet selections.
        // Return a promise.
        this.getResults = getResults;
        // Get the facets.
        // Return a promise (because of translation).
        this.getFacets = getFacets;
        // Get the facet options.
        // Return an object.
        this.getFacetOptions = getFacetOptions;
        // Update sorting URL params.
        this.updateSortBy = updateSortBy;
        // Get the CSS class for the sort icon.
        this.getSortClass = getSortClass;
        // Get the details of a single person.
        // this.getPerson = getPerson;

        /* Implementation */

        var facets = {
                entryText: {
                    facetId: 'entryText',
                    graph: '<http://ldf.fi/congress/people>',
                    name: 'Search',
                    enabled: true
                },
                slider: {
                    facetId: 'slider',
                    name: 'Timeline: 1st (1789) - 115th (2018) Congresses',
                    predicate: '<http://ldf.fi/congress/icpsr_id>/^<http://ldf.fi/congress/icpsr_id>/<http://ldf.fi/congress/congress_number>',
                    enabled: true
                },
                link: {
                    facetId: 'link',
                    choices: [
                        {
                            id: 'wikipedia',
                            pattern: '?id <http://ldf.fi/congress/wikipedia_id> [] .',
                            label: 'Wikipedia'
                        },{
                            id: 'dbpedia',
                            pattern: '?id <http://ldf.fi/congress/dbpedia_id> [] .',
                            label: 'DBpedia'
                        },
                        {
                            id: 'twitter',
                            pattern: '?id <http://ldf.fi/congress/twitter> [] .',
                            label: 'Twitter'
                        }
                    ],
                    enabled: true,
                    name: 'Links'
                },
                familyName: {
                    facetId: 'familyName',
                    predicate: '<http://schema.org/familyName>',
                    name: 'Family Name'
                },
                givenName: {
                    facetId: 'givenName',
                    predicate: '<http://schema.org/givenName>',
                    name: 'First Name'
                }, /**
                birthYear: {
                    facetId: 'birthYear',
                    predicate: '<http://schema.org/birthDate>',
                    name: 'Date of Birth',
                    enabled: true
                }, */
                birthPlace: {
                    facetId: 'birthPlace',
                    predicate: '<http://schema.org/birthPlace>',
                    name: 'Place of Birth',
                    hierarchy: '<http://schema.org/containedInPlace>',
                    depth: 5,
                    enabled: true
                },
                gender: {
                    facetId: 'gender',
                    predicate: '<http://schema.org/gender>',
                    name: 'Gender'
                },
                occupation: {
                    facetId: 'occupation',
                    predicate: '<http://schema.org/hasOccupation>',
                    name: 'Occupation',
                },
               state: {
                    facetId: 'state',
                    predicate: '<http://schema.org/state>',
                    name: 'Representing State',
                    enabled: true
                },
                memberOf: {
                    facetId: 'memberOf',
                    predicate: '<http://schema.org/memberOf>',
                    name: 'Political Party',
                    enabled: true
                },
                type: {
                    facetId: 'type',
                    predicate: '<http://ldf.fi/congress/type>',
                    name: 'Chamber',
                    enabled: true
                },
                congress_number: {
                    facetId: 'congress_number',
                    predicate: '<http://ldf.fi/congress/icpsr_id>/^<http://ldf.fi/congress/icpsr_id>/<http://ldf.fi/congress/congress_number>',
                    name: 'Serving Record of the Period',
                    mapper: numericFacetMapperService
                }
            };

        var prefixes =
    		'PREFIX owl: <http://www.w3.org/2002/07/owl#>   ' +
    		'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
    		'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>   ' +
    		'PREFIX schema: <http://schema.org/>   ' +
    		'PREFIX dct: <http://purl.org/dc/terms/>   ' +
    		'PREFIX skos: <http://www.w3.org/2004/02/skos/core#>   ' +
    		'PREFIX skosxl: <http://www.w3.org/2008/05/skos-xl#>   ' +
    		'PREFIX xml: <http://www.w3.org/XML/1998/namespace>   ' +
    		'PREFIX congress: <http://ldf.fi/congress/>   ' +
    		'PREFIX foaf: <http://xmlns.com/foaf/0.1/>   ' +
    		'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>   ' +
    		'PREFIX wdt: <http://www.wikidata.org/prop/direct/> ' +
    		'PREFIX geo:   <http://www.w3.org/2003/01/geo/wgs84_pos#> ' +
    		'PREFIX wd_ent: <http://www.wikidata.org/entity/> ';

        // The query for the results.
        // ?id is bound to the person URI.
        var query =
    		'SELECT DISTINCT ?id ?person__name ?place__label ?time__start ?time__end ?class ?place__uri ?place__latitude ?place__longitude ?congress_number WHERE { ' +
    		'  { <RESULT_SET> } ' +
    		'  VALUES (?evt_place ?evt_time ?class) { ' +
    		'  	(schema:birthPlace schema:birthDate "Birth"@en) ' +
    		'  	(schema:deathPlace schema:deathDate "Death"@en) ' +
    		'	} ' +
    		' ' +
    		'  OPTIONAL { ?id schema:familyName ?familyName . } ' +
    		'  OPTIONAL { ?id schema:givenName ?givenName . } ' +
    		'  BIND (CONCAT(?givenName, " ",?familyName) AS ?person__name) ' +
        ' ' +
        ' ?id congress:icpsr_id/^congress:icpsr_id/congress:congress_number ?congress_number . ' +
    		'   ?id ?evt_place ?place__uri ; ' +
    		'  		?evt_time ?time__start ; ' +
    		'    	?evt_time ?time__end . ' +
    		'  BIND (RAND() AS ?rand) ' +
    		'  ?place__uri geo:lat ?place__latitude ;  ' +
    		'  geo:long ?place__longitude ; ' +
    		'  rdfs:label ?place__label . ' +
    		'} ORDER BY ?rand ' +
    		'LIMIT 500 ';
        console.log(query);

        // The SPARQL endpoint URL
        var endpointConfig = {
            'endpointUrl': SPARQL_ENDPOINT_URL,
            'usePost': true
        };

        var facetOptions = {
            endpointUrl: endpointConfig.endpointUrl,
            rdfClass: '<http://schema.org/Person>',
            constraint: '?id <http://schema.org/familyName> ?familyName . ?id <http://schema.org/givenName> ?givenName . ?id <http://schema.org/birthDate> ?birthDate . ',
            preferredLang : 'en',
            noSelectionString: '-- no selection --'
        };

        var resultOptions = {
            mapper: personMapperService,
            queryTemplate: query,
            prefixes: prefixes,
            paging: false,
            pagesPerQuery: 1
        };

        // The FacetResultHandler handles forming the final queries for results,
        // querying the endpoint, and mapping the results to objects.
        var resultHandler = new FacetResultHandler(endpointConfig, resultOptions);

        // This handler is for the additional queries.
        var endpoint = new AdvancedSparqlService(endpointConfig, personMapperService);

        function getResults(facetSelections) {
        	var q = prefixes + query.replace("<RESULT_SET>", facetSelections.constraint.join(' '));
        	return endpoint.getObjectsNoGrouping(q);
        }


        function getFacets() {
            var facetsCopy = angular.copy(facets);
            return $q.when(facetsCopy);
        }

        function getFacetOptions() {
            return facetOptions;
        }

        function updateSortBy(sortBy) {
            var sort = $location.search().sortBy || '?birthDate';
            if (sort === sortBy) {
                $location.search('desc', $location.search().desc ? null : true);
            }
            $location.search('sortBy', sortBy);
        }

        function getSortBy() {
            var sortBy = $location.search().sortBy;
            if (!_.isString(sortBy)) {
                sortBy = '?birthDate';
            }
            var sort;
            if ($location.search().desc) {
                sort = 'DESC(' + sortBy + ')';
            } else {
                sort = sortBy;
            }
            return sortBy === '?birthDate' ? sort : sort + ' ?birthDate';
        }

        function getSortClass(sortBy, numeric) {
            var sort = $location.search().sortBy || '?birthDate';
            var cls = numeric ? 'icon-sort-by-past' : 'icon-sort-by-alphabet';

            if (sort === sortBy) {
                if ($location.search().desc) {
                    return cls + '-alt';
                }
                return cls;
            }
        }
    }
    groupmapService.$inject = ["$q", "$location", "_", "FacetResultHandler", "SPARQL_ENDPOINT_URL", "AdvancedSparqlService", "personMapperService", "numericFacetMapperService"];
})();

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
    wsNavbarDirective.$inject = ["$location", "$templateRequest", "$compile", "$uibModal"];
})();

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
    LoginController.$inject = ["$state", "$stateParams", "loginService"];
})();

(function() {

    'use strict';

    angular.module('facetApp')

    /*
    * Controller for the person detail view.
    */
    .controller('DetailController', DetailController);

    /* @ngInject */
    function DetailController($stateParams, $uibModal, _, nbfService) {

        var vm = this;

        vm.openPage = openPage;

        init();

        function init() {
            nbfService.getPerson($stateParams.personId).then(function(person) {
                vm.person = person;
                return person;
            }).catch(handleError);
        }

        function openPage() {
            $uibModal.open({
                component: 'registerPageModal',
                size: 'lg',
                resolve: {
                    person: function() { return vm.person; }
                }
            });
        }

        function handleError(error) {
            vm.isLoadingResults = false;
            vm.error = error;
        }
    }
    DetailController.$inject = ["$stateParams", "$uibModal", "_", "nbfService"];
})();

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
    		nbfService, NgTableParams, FacetHandler, facetUrlStateHandlerService) {

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
        vm.getSortClass = nbfService.getSortClass;

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        nbfService.getFacets().then(function(facets) {
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
            var options = nbfService.getFacetOptions();
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

            nbfService.getResults(facetSelections)
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
        	nbfService.updateSortBy(sortBy);
            return fetchResults({ constraint: vm.previousSelections });
        }
    }
    TableController.$inject = ["$scope", "$state", "$uibModal", "_", "RESULTS_PER_PAGE", "nbfService", "NgTableParams", "FacetHandler", "facetUrlStateHandlerService"];
})();

(function() {

    'use strict';
     angular.module('facetApp')

    /*
    * Controller for the person's timeline & map view.
    * api key: AIzaSyCS7M4hXwmBzV1FwE1p9lIDh1QSPhGqhUU
    */
    .controller('MapController', MapController);

    /* @ngInject */
    function MapController($stateParams, $uibModal, _, mapService) {

        var vm = this;

        vm.openPage = openPage;
        vm.map = { center: { latitude: 62, longitude: 24 }, zoom: 6 };
        vm.markers = [];

        //	evoked when timeline item is hovered
        vm.focusEvent = function(event) {
        	vm.currentEvent = event.id + ": " + event.label;
        	event.markers.forEach( function(m) {
        		m.options.icon.strokeWeight = 4;
        		m.options.zIndex += 100;

	        	setTimeout(function () {
	        		m.options.animation=null;
	            }, 1200);
        	});
        };

        //  evoked when timeline item is left
        vm.unfocusEvent = function(event) {
        	vm.currentEvent='.'
    		event.markers.forEach( function(m) {
        		m.options.icon.strokeWeight = 1;
        		m.options.zIndex -= 100;

        	});
        };

        init();

        function init() {

        	mapService.getEvents($stateParams.personId).then(function(events) {
        		vm.currentEvent = ".";
        		vm.events = events;
        		if (events.length) {
        			vm.person = events[0];
        			}
        		vm.events = processEvents(events, vm);
        		vm.viewBox = "1930,-10,120,27";
        		formMainline(vm);

        		return events;
            }).catch(handleError);
        }

        function processEvents(events, vm) {

        	var current_year = (new Date()).getFullYear(),
        		has_death = false,
        		i=0;

        	vm.min_time = current_year;
        	vm.max_time = 0;

        	//	for counting all distinct place instances
        	var places = {};

        	events.forEach( function(event) {
        		if (event.place && event.place.uri) {

        			//	convert these properties to arrays
        			['uri', 'latitude', 'longitude'].forEach( function(prop) {
        				if (event.place[prop] && (event.place[prop].constructor !== Array)) {
            				event.place[prop] = [event.place[prop]];
            			}
        			} );

        			/**
        			if (event.place.latitude.constructor !== Array) {
        				event.place.latitude = [event.place.latitude];
        			}
        			if (event.place.longitude.constructor !== Array) {
        				event.place.longitude = [event.place.longitude];
        			}
        			if (event.place.uri.constructor !== Array) {
        				event.place.uri = [event.place.uri];
        			}
        			**/

        			//var keys = event.place.uri;
        			// if (!(keys.constructor === Array)) keys = [keys];

        			event.place.uri.forEach( function(key) {
	        			if (!places.hasOwnProperty(key)) {
	        				places[key]={count:0, latitude:event.place.latitude, longitude:event.place.longitude, type:event.class}
	            		}
	            		places[key]['count']+=1;
        			});
        		}
        	});

        	var categories=[[],[],[],[]];

        	// splits timespans to start and end years, collects the minimum and maximum values
        	events.forEach( function(event) {

        		event.y = 0;
        		event.r = 1;
        		event.markers = [];
        		event.blobs = [];

        		if (!(event.time.span.constructor === Array)){
        			event.time.span = [event.time.span];
        		}
        		event.time.span.forEach( function(time) {

        			var years = time.split('-'),
        				blob = { };

        			if (years[0] != "") {
        				years[0]=parseInt(years[0]);
        				if (years[0]<vm.min_time) vm.min_time=years[0];
        				if (vm.max_time<years[0]) vm.max_time=years[0];
        				blob.estStart = years[0];
        			}
        			if (years[1] != "") {
        				years[1]=parseInt(years[1]);
        				if (years[1]<vm.min_time) vm.min_time=years[1];
        				if (vm.max_time<years[1]) vm.max_time=years[1];
        				blob.estEnd = years[1];
        			}
        			event.blobs.push(blob);
	        	});


        		if (!event.label) event.label="";
        		if (!event.class) event.class = "event";
        		event.class = event.class.toLowerCase();

        		var category=0;

        		switch(event.class) {
	        		case "death":
	        			has_death = true;
	        			event.label = 'Kuollut '+event.label;
	        			event.r = 1.50;
	        			break;

	        			// TODO: targetoi ensimmäiseen tapahtumaan, jos ei birth ole
	        		case "birth":
	        			event.label = 'Syntynyt '+event.label;
	        			if (event.place && event.place.latitude) {
	                		vm.map.center = {'latitude': event.place.latitude[0], 'longitude': event.place.longitude[0] };
	                	}
	        			event.r = 1.50;

	        			//	remove (in most cases erroneous) events before birth
	        			if (vm.min_time<event.blobs[0].estStart) {
	        				vm.min_time=event.blobs[0].estStart;
	        			}
	        			break;

	        		case "spouse":
	        		case "child":
	        			if (event.relative) {
	        				event.relativelink = "http://localhost:9000/#!/"+event.relative.replace(/[/]/g, '~2F');
	        			}
	        			event.label = event.label+', '+event.time.label;
	        			break;

	        		case 'career':
	        			event.y = 5;
	        			category = 1;
	        			break;

	        		case 'product':
	        			event.y = 10;
	        			category = 2;
	        			break;

	        		case 'honour':
	        			event.y = 15;
	        			category = 3;
	        			break;

	        		default:
	        			console.log(event.class);
	        			event.y = 15;
	        			event.class="event";
	        			category = 3;
	        			break;
        		}
        		categories[category].push(event);

        		event.id = ++i;

        		if (event.place && event.place.latitude) {
        			for (var j=0; j<event.place.latitude.length; j++) {
    					var r = event.place.uri[j] && places[event.place.uri[j]] && places[event.place.uri[j]]['count'] ?
    							15.*Math.sqrt(places[event.place.uri[j]]['count']):
    							15.0 ;
            			var m = generateMarker(event.place.latitude[j], event.place.longitude[j], event.id, event.class, r);
    					event.markers.push(m);
    					vm.markers.push(m);
    				}
        		}
        	});

        	//	relocate the events that otherwise would get covered by other events
        	categories.forEach( function (category) {
        		analyzeCategory(category).forEach( function(i) {
        			category[i].y += 2.5;
        		});
        	});

        	if (!has_death) vm.max_time += 15;
        	if (vm.max_time<=vm.min_time) vm.max_time = vm.min_time+75;
        	if (vm.max_time>vm.min_time+150) vm.max_time = vm.min_time+150;
        	if (vm.max_time>current_year) vm.max_time = current_year;

        	//var bounds = new google.maps.LatLngBounds();

        	// scale the years to get a coordinate on the timeline:
        	// var i=0;
        	events.forEach( function(event) {
        		event.path = "";
        		var rn = 0.1*Math.random();
        		event.blobs.forEach( function(blob) {
	        		//	blobs that are shown on timeline
	        		var x0 = blob.estStart ? scale2Timeline(blob.estStart,vm.min_time,vm.max_time)+rn : undefined,
	        			x1 = blob.estEnd ? scale2Timeline(blob.estEnd,vm.min_time,vm.max_time)+rn : undefined;

	        		if (!x0) {
	        			//	missing start year
	        			x0 = x1-3;
	        			event.path += "M"+x0+","+(event.y+event.r)+
	        						" H"+x1+
	        						" a"+event.r+","+event.r+",0,0,0,0,-"+(2*event.r)+
	        						" H"+x0;
	            	} else if (!x1) {
	        			//	missing end year
	        			x1 = x0+3;
	        			event.path += "M"+x1+","+(event.y-event.r)+
	        						" H"+x0+
	        						" a"+event.r+","+event.r+",0,0,0,0,"+(2*event.r)+
	        						" H"+x1;
	            	} else {
	        			//	both known
	            		event.path += "M"+x0+","+(event.y-event.r)+
	        					" a"+event.r+","+event.r+",0,0,0,0,"+(2*event.r)+
	        					" H"+x1+
	        					" a"+event.r+","+event.r+",0,0,0,0,-"+(2*event.r)+
	        					" Z";
	        		}

        		});
        		event.blobs = [];
        	});
        	// console.log(vm.blobs);

        	//var map = document.getElementById('ui-gmap-google-map');
        	//if (map && map.fitBounds) { map.fitBounds(bounds); }

        	return events;
        }


        var MARKERID = 1;
        function generateMarker(lat, lon, id, type, r) {
        	if (!r) r=15.0;
        	var ICONCOLORS = {
    				"death":	"#BF0A30",
    				"birth":	"#002868",
    				"spouse":	"#c3b981",
    				"child":	"#7f6780",
    				"career":	"#999999",
    				"product":	"#83d236",
    				"honour":	"#ce5c00",
    				"event":	"#ABCDEF"
    		};

        	var m = {
        			"latitude": lat,
        			"longitude": lon,
        			"id": MARKERID++,
        			"options": {
        				icon:{
	        				path:"M-"+r+" 0 A "+r+","+r+", 0 ,1, 1,"+r+",0 A"+r+","+r+",0,1,1,-"+r+",0 Z",
							scale: 1.0,
							anchor: new google.maps.Point(0,0),
							fillColor: ICONCOLORS[type],
							fillOpacity: 0.6,
							strokeOpacity: 0.5,
							strokeWeight: 1,
							labelOrigin: new google.maps.Point(0, 0)
							},
						zIndex: id,
						optimized: false,
						label: {
					        text: ''+id,
					        fontSize: '14px',
					        fontFamily: '"Courier New", Courier,Monospace',
					        color: 'black'
					      }
						}
        	};
        	return m;
        }

        function formMainline(vm) {
        	var x0 = vm.min_time,
        		x1 = vm.max_time,
        		arr = [],
        		texts = [];

        	//	vertical lines every ten years
        	for (var x = 10*Math.ceil(x0/10); x<x1; x+=10) {
        		var xx = scale2Timeline(x,x0,x1)
        		arr.push({'x1': xx , 'x2': xx, 'y1': 0, 'y2': 15 });
        		texts.push({'x': xx , 'y':-3, 'year': ''+x});
        	}
        	//  horizontal lines
        	for (var y=0; y<20; y+=5) {
        		arr.push({'x1': scale2Timeline(x0,x0,x1) , 'x2': scale2Timeline(x1,x0,x1), 'y1': y, 'y2': y });
        	}
        	vm.mainline = {lines: arr, texts: texts };
        }

        function scale2Timeline(time,x0,x1) {
        	return time-x0;
        	// return 750.0*(time-x0)/(x1-x0);
        }

        function openPage() {
            $uibModal.open({
                component: 'registerPageModal',
                size: 'lg',
                resolve: {
                    person: function() { return vm.person; }
                }
            });
        }

        function handleError(error) {
            vm.isLoadingResults = false;
            vm.error = error;
        }

        /**	find the events that get covered by another event */
        function analyzeCategory(category) {
        	var checktable = {},
        		N = category.length;
        	for (var i=0; i<N; i++) {
        		category[i].blobs.forEach( function(blob) {
        			var x0 = blob.estStart ? blob.estStart : blob.estEnd-3,
        				x1 = blob.estEnd ? blob.estEnd : x0+3;

        			for (var j=x0; j<=x1; j++) {
        				checktable[j]=i;
        			}
        		});
        	}
        	//	mark all false
        	var arr = Array(N).fill(false);
        	//	set visible ones to true
        	for(var year in checktable){
        	    arr[checktable[year]]=true;
        	}
        	//	find the hidden ones with value remaining false
        	var arr2=[];
        	for (var i=0; i<N; i++) if (!arr[i]) arr2.push(i);

        	return arr2;
        }

    }
    MapController.$inject = ["$stateParams", "$uibModal", "_", "mapService"];
})();

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
    .controller('GroupmapController', GroupmapController);

    /* @ngInject */
    function GroupmapController($scope, $location, $state, $uibModal, _, groupmapService,
            FacetHandler, facetUrlStateHandlerService, EVENT_FACET_CHANGED) {

        var vm = this;
        vm.map = { center: { latitude: 40, longitude: -90 }, zoom: 4 };
        vm.markers = [];
        vm.window = { show: false,
    position: {
      lat: 40,
      lng: -90}
};

vm.showWindow = function() {
  vm.window.show = true;
}
vm.closeWindow = function() {
  vm.window.show = false;
}

        vm.isScrollDisabled = isScrollDisabled;
        vm.removeFacetSelections = removeFacetSelections;
        vm.getSortClass = groupmapService.getSortClass;

        //vm.people = [];

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        groupmapService.getFacets().then(function(facets) {
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
            var options = groupmapService.getFacetOptions();
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }

        function isScrollDisabled() {
            return vm.isLoadingResults || nextPageNo > maxPage;
        }

        function sortBy(sortBy) {
        	groupmapService.updateSortBy(sortBy);
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
            //vm.people = [];
            vm.error = undefined;

            var updateId = _.uniqueId();
            latestUpdate = updateId;

            return groupmapService.getResults(facetSelections)
            .then(function(res) {
            	vm.events = processEvents(res, vm);
            }).catch(handleError);
        }

        function handleError(error) {
            vm.isLoadingResults = false;
            vm.error = error;
        }

        function processEvents(events, vm) {

        	var places = {};

        	events.forEach( function(event) {

        		if (!event.class) event.class = "event";
        		event.class = event.class.toLowerCase();

            //	count by place uris
        		var key=event.class+event.place.uri;
        		if (!places.hasOwnProperty(key)) {
        			places[key]={count:0,
        					latitude:event.place.latitude,
        					longitude:event.place.longitude,
        					label:	event.place.label,
        					type:	event.class,
        					people: {}}
        		}
        		places[key]['count']+=1;
        	  places[key]['people'][event.id]= event.person.name;
        	});


        	vm.markers = [];
        	var i = 0;

                  	for (var x in places) {
                  		var place=places[x];
                  		var m = generateMarker(vm, place.latitude,
                  				place.longitude,
                  				++i,
                  				place.type,
                  				place.count,
                  				place.label,
                  				place.people);
                  		vm.markers.push(m);
                  	}
                  	//	sort the the largest gets drawn first
                  	vm.markers.sort(function(a, b){return b.count - a.count});

                  	var bounds = new google.maps.LatLngBounds();

        	// scale the years to get a coordinate on the timeline:

        	var map = document.getElementById('ui-gmap-google-map');
        	if (map && map.fitBounds) { map.fitBounds(bounds); }
        	return events;
        }


        function generateMarker(vm, lat, lon, id, type, count, label, people) {
        	var r = 5.0*Math.sqrt(count);
        	// if (!r) r=5.0;
        	var ICONCOLORS = {
            "death":	"#f3224e",
            "birth":	"#0045b5",
    				"spouse":	"#c3b981",
    				"child":	"#7f6780",
    				"career":	"#999999",
    				"product":	"#83d236",
    				"honour":	"#ce5c00",
    				"event":	"#ABCDEF"
    		};

        var m = {
            "count": count,
            "latitude": lat,
            "longitude": lon,
            "id": id,
            "options": {
              icon:{
                path:"M-"+r+" 0 A "+r+","+r+", 0 ,1, 1,"+r+",0 A"+r+","+r+",0,1,1,-"+r+",0 Z",
            scale: 1.0,
            anchor: new google.maps.Point(0,0),
            fillColor: ICONCOLORS[type],
            fillOpacity: 0.6,
            strokeOpacity: 0.2,
            strokeWeight: 1,
            labelOrigin: new google.maps.Point(0, 0)
            },
          optimized: true,
          },
            "onClick": function () {

              vm.place_label = label;
              if (type=="death") vm.place_label += "\nas a place of death";
              else if (type=="birth") vm.place_label += "\nas a place of birth";

              var arr = [];
              for (var p in people) {
                arr.push({uri:p, label:people[p]})
              }
              vm.people = arr;

              vm.window.position.lat = parseInt(lat);
              vm.window.position.lng = parseInt(lon);
              vm.showWindow();

              $scope.$apply();
          }
        };
        return m;
      }

  }
  GroupmapController.$inject = ["$scope", "$location", "$state", "$uibModal", "_", "groupmapService", "FacetHandler", "facetUrlStateHandlerService", "EVENT_FACET_CHANGED"];
})();

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
    .controller('CardsController', CardsController);

    /* @ngInject */
    function CardsController($scope, $location, $state, $uibModal, _, nbfService,
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
        vm.getSortClass = nbfService.getSortClass;

        vm.people = [];

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        nbfService.getFacets().then(function(facets) {
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
            var options = nbfService.getFacetOptions();
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
        	nbfService.updateSortBy(sortBy);
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
            nbfService.getResults(facetSelections)
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
    CardsController.$inject = ["$scope", "$location", "$state", "$uibModal", "_", "nbfService", "FacetHandler", "facetUrlStateHandlerService"];
})();

/*
 * Semantic faceted search
 *
 */

(function() {

    'use strict';

    angular.module('facetApp')

    /*
    * Controller for the results view.
    */
    .controller('VisuController', VisuController);

    /* @ngInject */
    function VisuController($scope, $location, $q, $state, _, visuService,
            FacetHandler, facetUrlStateHandlerService) {

        var vm = this;
   
        vm.people = []; 
        vm.startYear = [];
        vm.topTitles = [];
        vm.topOrgs = [];
		vm.removeFacetSelections = removeFacetSelections;
		
		google.charts.load('current', {packages: ['corechart', 'line', 'sankey']});

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        visuService.getFacets().then(function(facets) {
            vm.facets = facets;
            vm.facetOptions = getFacetOptions();
            vm.facetOptions.scope = $scope;
            vm.handler = new FacetHandler(vm.facetOptions);
        });

        function removeFacetSelections() {
            $state.reload();
        }

        function getFacetOptions() {
            var options = visuService.getFacetOptions();
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }


        function updateResults(event, facetSelections) {
            if (vm.previousSelections && _.isEqual(facetSelections.constraint,
                    vm.previousSelections)) {
                return;
            }
            vm.previousSelections = _.clone(facetSelections.constraint);
            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            return fetchResults(facetSelections).then(function (people) {
            	google.charts.setOnLoadCallback(function () { drawPieChart('occupation', 'Myöhempi arvo tai ammatti', 'chart_occupation'); });
            	google.charts.setOnLoadCallback(function () { drawPieChart('organization', 'Työnantajat tai jäsenyydet järjestöissä', 'chart_organization'); });
            	google.charts.setOnLoadCallback(function () { drawPieChart('eduorganization', 'Opiskelupaikkoja Norssin jälkeen', 'chart_eduorganization'); });
            	google.charts.setOnLoadCallback(function () { drawPieChart('education', 'Koulutus Norssin jälkeen', 'chart_education'); });
            	google.charts.setOnLoadCallback(drawSankeyChart);
            	return;
	         });
        }

        
        
        function drawPieChart(prop, label, target) {
        	
        	var arr = countByProperty(vm.people, prop),
	        	data = google.visualization.arrayToDataTable( [[label, 'Lukumäärä']].concat(arr)),
            	options = { title: label },
            	chart = new google.visualization.PieChart(document.getElementById(target));
        	
            chart.draw(data, options);
        }
        
        
    
		function drawSankeyChart() {
			//	TODO: check with options giving only a few (less < 5) results:
			var prop 	= 'education',
				prop2 	= 'eduorganization',
				res 	= {},
				res2	= {},
				N = 10;
			
			$.each(vm.people, function( i, value ) {
				if (value.hasOwnProperty(prop) && value.hasOwnProperty(prop2)) {
					var y=value[prop],
						y2=value[prop2];
					
					if (res.hasOwnProperty(y)) {
						res[y] += 1;
					} else {
						res[y] = 1;
					}
					
					if (res2.hasOwnProperty(y2)) {
						res2[y2] += 1;
					} else {
						res2[y2] = 1;
					}
				}
			});
			
			res = $.map( res, function( value, key ) { return [[key, value]]; })
				.sort(function(a, b){ return b[1]-a[1] });
			
			res2 = $.map( res2, function( value, key ) { return [[key, value]];})
				.sort(function(a, b){ return b[1]-a[1] });

			var sear = {}, 
				sear2 = {};
			
			$.each(res,  function( i, value ) { 
				sear[value[0]] = {
						index: (i<N-1 ? i : N-1)
						}
				});
		
		
			$.each(res2, function( i, value ) { 
				sear2[value[0]] = {
						index: (i<N-1 ? i : N-1)
						}
				});
			

			var arr = $.map(new Array(Math.min(N,res.length)), function(i,v) { 
				return [ $.map(new Array(Math.min(N,res2.length)), function(i,v) {return 0;}) ];
				});
			
			$.each(vm.people, function( i, value ) {
				if (value.hasOwnProperty(prop) && value.hasOwnProperty(prop2)) {
					var y = value[prop], y2 = value[prop2];
					arr[sear[y]['index']][sear2[y2]['index']] += 1;
				}
			});
			
			var arr2 = [];
			for (var i=0; i<arr.length; i++) {
				for (var j=0; j<arr[i].length; j++) {
					arr2.push( [
						j<N-1 ? res2[j][0] : 'muu laitos',
						i<N-1 ? res[i][0] : 'muu arvo',
						arr[i][j] ] );
				}
			}

			var data = new google.visualization.DataTable();
	        data.addColumn('string', prop2);
	        data.addColumn('string', prop);
	        data.addColumn('number', 'Weight');
	        data.addRows(arr2);
	        
	        	
	        // Sets chart options.
	        var options = {
	        		title: 'Otsikko',
	        		sankey: {
	        			node: 	{ 
	        	        	label: { 
	        	        		fontSize: 14,
	        	                color: '#000',
	        	                bold: true },
	        	        labelPadding: 12
	        	        }
	        		},
	        };
			
	        // Instantiates and draws our chart, passing in some options.
	        var chart = new google.visualization.Sankey(document.getElementById('chart_sankey'));
	        chart.draw(data, options);
	        
		}
		
		
		function countByProperty(data, prop) {
			return countProperties(data, prop)
				.sort(function(a, b){ return b[1]-a[1] });
    	}
		
    	
		
		function countProperties(data, prop) {
			var res = {};
			$.each(data, function( i, value ) {
				if (value.hasOwnProperty(prop)) {
					var y=value[prop];
					
					if (res.hasOwnProperty(y)) {
						res[y] += 1;
					} else {
						res[y] = 1;
					}
				}
			});
			return $.map( res, function( value, key ) {
				return [[key, value]];
			});
    	}
		
		
        var latestUpdate;
        function fetchResults(facetSelections) {
            vm.isLoadingResults = true;
            vm.people = [];
            vm.years = [];
            vm.topTitles = [];
            vm.topOrgs = [];
            vm.error = undefined;

            var updateId = _.uniqueId();
            latestUpdate = updateId;

            return visuService.getResults2(facetSelections).then(function(res) {
            	if (latestUpdate !== updateId) {
                    return;
                }
               
                vm.isLoadingResults = false;
                vm.people = res[0];
                return res;
            }).catch(handleError);
        }

        function handleError(error) {
        	console.log(error)
            vm.isLoadingResults = false;
            vm.error = error;
        }
    }
    VisuController.$inject = ["$scope", "$location", "$q", "$state", "_", "visuService", "FacetHandler", "facetUrlStateHandlerService"];
})();

/*
 * Semantic faceted search
 *
 */

(function() {

    'use strict';

    angular.module('facetApp')

    /*
    * Controller for the results view.
    */
    .controller('VisuController2', VisuController2);

    /* @ngInject */
    function VisuController2($scope, $location, $q, $state, _, visuService,
            FacetHandler, facetUrlStateHandlerService) {

        var vm = this;
   
        vm.people = []; 
        vm.startYear = [];
        //vm.topTitles = [];
        //vm.topOrgs = [];
		vm.removeFacetSelections = removeFacetSelections;
		
		google.charts.load('current', {packages: ['corechart', 'line']});

        var initListener = $scope.$on('sf-initial-constraints', function(event, config) {
            updateResults(event, config);
            initListener();
        });
        $scope.$on('sf-facet-constraints', updateResults);

        visuService.getFacets().then(function(facets) {
            vm.facets = facets;
            vm.facetOptions = getFacetOptions();
            vm.facetOptions.scope = $scope;
            vm.handler = new FacetHandler(vm.facetOptions);
        });

        function removeFacetSelections() {
            $state.reload();
        }

        function getFacetOptions() {
            var options = visuService.getFacetOptions();
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }


        function updateResults(event, facetSelections) {
            if (vm.previousSelections && _.isEqual(facetSelections.constraint,
                    vm.previousSelections)) {
                return;
            }
            vm.previousSelections = _.clone(facetSelections.constraint);
            facetUrlStateHandlerService.updateUrlParams(facetSelections);
            
            return fetchResults(facetSelections).then(function (people) {
            	google.charts.setOnLoadCallback(function () {
            		drawYearChart(vm.ages, [1,120], 'Elinikä', 'chart_age')
            		});
            	google.charts.setOnLoadCallback(function () {
            		drawYearChart(vm.marriageAges, [1,120], 'Naimisiinmenoikä', 'chart_marriageAge')
            		});
            	google.charts.setOnLoadCallback(function () {
            		drawYearChart(vm.firstChildAges, [1,120], 'Lapsensaanti-ikä', 'chart_firstChildAge')
            		});
            	google.charts.setOnLoadCallback(function () { 
            		drawYearChart(vm.numberOfChildren, [1,25], 'Lasten lukumäärä', 'chart_numberOfChildren') 
            		});
            	google.charts.setOnLoadCallback(function () { 
            		drawYearChart(vm.numberOfSpouses, [1,7], 'Puolisoiden lukumäärä', 'chart_numberOfSpouses') 
            		});
            	
            	return;
	         });
        }
        
        
		function drawYearChart(res, range, label, target) {
			var 
				arr = $.map( countByYear(res, range),
					function( value, key ) {
						return [[ value[0],value[1] ]];
					}),
				stats = getStats(arr),
				
				data = new google.visualization.DataTable(),
				options = {
				    title: label+", keskiarvo: "+stats[0].toFixed(2) +', keskihajonta: '+stats[1].toFixed(2) ,
				    legend: { position: 'none' },
				    
            		tooltip: {format: 'none'},
				    colors: ['blue'],
				    
				    hAxis: {
				    	slantedText:false, 
				    	maxAlternation: 1, 
				    	format: '',
				    	ticks: ticksByRange(range)
				    
				    	},
				    vAxis: {
				    	 maxValue: 4
				    },
			    	width: '95%', 
			    	bar: {
			    	      groupWidth: '88%'
			    	    },
			    	height:500
				  },
			
				chart = new google.visualization.ColumnChart(document.getElementById(target));
			
	        data.addColumn('number', 'Ikä');
	        data.addColumn('number', 'Henkilöä');
	        
			data.addRows(arr);
			chart.draw(data, options);
		}
		
		function ticksByRange(range) {
			var ticks = [],
				x=10*Math.floor(1+range[0]/10);
			while (x<range[1]) {
				ticks.push(x);
				x+=10;
			}
			return ticks;
		}
		
		function getStats(data) {
			var sum=0.0,
				sum2=0.0,
				count=0;
			
			$.each(data, function( i, value ) {
				var x = value[0]*value[1];
				sum += x;
				sum2 += value[0]*x;
				count += value[1];
			});
			if (count>0) {
				var mu=sum/count;
				//	median, standard deviation
				return [mu, Math.sqrt(sum2/count-mu*mu)];
			} 
			return [0.0, 0.0];
		}
		
		function countByProperty(data, prop) {
			return countProperties(data, prop)
				.sort(function(a, b){ return b[1]-a[1] });
    	}
		
    	
		function countByYear(data, range) {
			var res = [];
			
			$.each(data, function( i, value ) {
				//if (value.hasOwnProperty('index') && value['index']==index) {
					res.push([ parseInt(value['value']), parseInt(value['count']) ]);
				//}
			});
			
			//	fill missing years with zero value
			res=fillEmptyYears(res, range);
			
			//	padding if only one result:
			if (res.length<2) {
				// add year before with zero result
				var y=parseInt(res[0][0])-1;
				res = [[y,0]].concat(res);
				
				// ... and after
				y=parseInt(res[res.length-1][0])+1;
				res.push([y,0]);
			}
			
			return res ;
    	}
		
		
		function fillEmptyYears(data, range) {
			if (data.length<2) return data;
			data.push([range[1], 0]);
			
			var res=[],
				y=parseInt(data[0][0]);
			if (y>range[0]) {
				data.unshift([range[0], 0]);
				y=range[0];
			}
			for (var i=0; i<data.length; i++) {
				var y2=parseInt(data[i][0]);
				//	fill missing years in the sequence with zero values:
				while (y<y2) {
					res.push([y, 0]);
					y++;
				}
				res.push(data[i]);
				y++;
			}
			return res;
		}
		
		function countProperties(data, prop) {
			var res = {};
			$.each(data, function( i, value ) {
				if (value.hasOwnProperty(prop)) {
					var y=value[prop];
					
					if (res.hasOwnProperty(y)) {
						res[y] += 1;
					} else {
						res[y] = 1;
					}
				}
			});
			return $.map( res, function( value, key ) {
				return [[key, value]];
			});
    	}
		
		
        var latestUpdate;
        function fetchResults(facetSelections) {
            vm.isLoadingResults = true;
            vm.ages = [];
            vm.marriageAges = [];
            vm.firstChildAges = [];
            vm.numberOfChildren = [];
            vm.numberOfSpouses = [];
            //vm.topSchools = [];
            vm.error = undefined;

            var updateId = _.uniqueId();
            latestUpdate = updateId;

            return visuService.getResults(facetSelections).then(function(res) {
            	if (latestUpdate !== updateId) {
                    return;
                }
            	
                vm.isLoadingResults = false;
                vm.ages = res[0];
                vm.marriageAges = res[1];
                vm.firstChildAges = res[2];
                vm.numberOfChildren = res[3];
                vm.numberOfSpouses = res[4];
                return res;
            }).catch(handleError);
        }

        function handleError(error) {
        	console.log(error)
            vm.isLoadingResults = false;
            vm.error = error;
        }
    }
    VisuController2.$inject = ["$scope", "$location", "$q", "$state", "_", "visuService", "FacetHandler", "facetUrlStateHandlerService"];
})();

(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('visuService', visuService);

    /* @ngInject */
    function visuService($q, $location, _, AdvancedSparqlService,
            objectMapperService, SPARQL_ENDPOINT_URL) {

        /* Public API */

        // Get the results based on facet selections.
        // Return a promise.
        this.getAge = getAge;
        this.getMarriageAge = getMarriageAge;
        this.getFirstChildAge = getFirstChildAge;
        this.getNumberOfChildren = getNumberOfChildren;
        this.getNumberOfSpouses = getNumberOfSpouses;
        
        this.getResults = getResults;
        
        // Get the facets.
        // Return a promise (because of translation).
        this.getFacets = getFacets;
        // Get the facet options.
        // Return an object.
        this.getFacetOptions = getFacetOptions;
        /* Implementation */

        var facets = {
            entryText: {
                facetId: 'entryText',
                graph: '<http://ldf.fi/nbf/people>',
                name: 'Haku',
                enabled: true
            },
            link: {
                facetId: 'link',
                choices: [
                    {
                        id: 'wikipedia',
                        pattern: '?id <http://ldf.fi/nbf/wikipedia> [] .',
                        label: 'Wikipedia'
                    },
                    {
                        id: 'wikidata',
                        pattern: '?id <http://ldf.fi/nbf/wikidata> [] .',
                        label: 'Wikidata'
                    },
                    {
                        id: 'sotasampo',
                        pattern: '?id <http://ldf.fi/nbf/warsampo> [] .',
                        label: 'Sotasampo'
                    },
                    {
                        id: 'norssit',
                        pattern: '?id <http://ldf.fi/nbf/norssi> [] .',
                        label: 'Norssit'
                    },
                    {
                        id: 'kirjasampo',
                        pattern: '?id <http://ldf.fi/nbf/kirjasampo> [] . ',
                        label: 'Kirjasampo'
                    },
                    {
                        id: 'blf',
                        pattern: '?id <http://ldf.fi/nbf/blf> [] .',
                        label: 'BLF'
                    },
                    {
                        id: 'ulan',
                        pattern: '?id <http://ldf.fi/nbf/ulan> [] .',
                        label: 'ULAN'
                    },
                    {
                        id: 'viaf',
                        pattern: '?id <http://ldf.fi/nbf/viaf> [] .',
                        label: 'VIAF'
                    },
                    {
                        id: 'genicom',
                        pattern: '?id <http://ldf.fi/nbf/genicom> [] .',
                        label: 'Geni.com'
                    },
                    {
                        id: 'website',
                        pattern: '?id <http://ldf.fi/nbf/website> [] .',
                        label: 'Kotisivu'
                    },
                    {
                        id: 'eduskunta',
                        pattern: '?id <http://ldf.fi/nbf/eduskunta> [] .',
                        label: 'Eduskunta'
                    }
                ],
                enabled: true,
                name: 'Linkit'
            },
            period: {
                facetId: 'period',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/<http://ldf.fi/nbf/has_period>/<http://www.w3.org/2004/02/skos/core#prefLabel>',
                name: 'Ajanjakso',
                enabled: true
            },
            familyName: {
                facetId: 'familyName',
                predicate: '<http://www.w3.org/2008/05/skos-xl#prefLabel>/<http://schema.org/familyName>',
                name: 'Sukunimi'
            },
            dataset: {
                facetId: 'dataset',
                predicate: '<http://purl.org/dc/terms/source>',
                name: 'Tietokanta'
            },
            birthYear: {
                facetId: 'birthYear',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/^<http://www.cidoc-crm.org/cidoc-crm/P98_brought_into_life>/<http://ldf.fi/nbf/time>',
                name: 'Synnyinaika',
                enabled: true
            },
            place: {
                facetId: 'place',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/(^<http://www.cidoc-crm.org/cidoc-crm/P98_brought_into_life>|^<http://www.cidoc-crm.org/cidoc-crm/P100_was_death_of>)/<http://ldf.fi/nbf/place>/<http://www.w3.org/2004/02/skos/core#prefLabel>',
                name: 'Paikkakunta',
                enabled: true
            },
            deathYear: {
                facetId: 'birthYear',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/^<http://www.cidoc-crm.org/cidoc-crm/P100_was_death_of>/<http://ldf.fi/nbf/time>',
                name: 'Kuolinaika',
                enabled: true
            },
            title: {
                facetId: 'title',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/^<http://ldf.fi/schema/bioc/inheres_in>/<http://ldf.fi/nbf/has_title>',
                name: 'Arvo tai ammatti',
                hierarchy: '<http://www.w3.org/2004/02/skos/core#broader>',
                depth: 3,
                enabled: true
            },
            company: {
                facetId: 'company',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/^<http://ldf.fi/schema/bioc/inheres_in>/<http://ldf.fi/nbf/related_company>',
                name: 'Yritys tai yhteisö',
                enabled: true
            },
            category: {
                facetId: 'category',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/<http://ldf.fi/nbf/has_category>',
                name: 'Kategoria',
                enabled: true
            },
            gender: {
                facetId: 'gender',
                predicate: '<http://xmlns.com/foaf/0.1/focus>/<http://ldf.fi/nbf/sukupuoli>',
                name: 'Sukupuoli',
                enabled: true
            }
        };

        //	TODO: query for a certain title, here "maisteri": http://yasgui.org/short/SJbyBeseM
        var prefixes =
        	'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
        	'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
        	'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ' +
        	'PREFIX bioc:  <http://ldf.fi/schema/bioc/>  ' +
        	'PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>  ' +
        	'PREFIX schema: <http://schema.org/>  ' +
        	'PREFIX skos:  <http://www.w3.org/2004/02/skos/core#>  ' +
        	'PREFIX skosxl: <http://www.w3.org/2008/05/skos-xl#>  ' +
        	'PREFIX	nbf:	<http://ldf.fi/nbf/>  ' +
        	'PREFIX	categories:	<http://ldf.fi/nbf/categories/>  ' +
        	'PREFIX	gvp:	<http://vocab.getty.edu/ontology#>	 ' +
        	'PREFIX crm:   <http://www.cidoc-crm.org/cidoc-crm/>  ' +
        	'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>  ' +
        	'PREFIX dcterms: <http://purl.org/dc/terms/>  ' +
        	'PREFIX foaf: <http://xmlns.com/foaf/0.1/>  ' +
        	'PREFIX gvp: <http://vocab.getty.edu/ontology#> ' +
        	'PREFIX	relations:	<http://ldf.fi/nbf/relations/> ' +
        	'PREFIX	sources:	<http://ldf.fi/nbf/sources/> ';

        // The query for the results.
        // ?id is bound to the norssit URI.
        var query = prefixes +
        	' SELECT distinct ?occupation ?education ?organization ?eduorganization ?id ' +
            '  WHERE {' +
            '  	 { <RESULT_SET> } ' +
        	'  { ?evt bioc:education_inheres_in ?id ; bioc:relates_to_title/skos:prefLabel ?education . ' +
        	'    OPTIONAL { ?evt bioc:relates_to ?org .' +
        	'	 	?org a schema:EducationalOrganization ; skos:prefLabel ?eduorganization }' +
        	'  }' +
        	'  UNION' +
        	'  { ?evt bioc:title_inheres_in ?id ;' +
        	'     	bioc:relates_to_title ?cls .' +
        	'    FILTER (?cls != bioc:Title)' +
        	'    ?cls skos:prefLabel ?occupation .' +
        	'    OPTIONAL { ?evt bioc:relates_to/skos:prefLabel ?organization }' +
        	'  }' +
        	'}';
            
       var queryAge = prefixes +
       'SELECT ?value (count(?value) AS ?count) WHERE { ' +
       ' { <RESULT_SET> } ' +
	   	' ' +
	   	'  ?id foaf:focus/^crm:P100_was_death_of/nbf:time [ gvp:estStart ?time ; gvp:estEnd ?time2 ] ; ' +
	   	'  	foaf:focus/^crm:P98_brought_into_life/nbf:time [ gvp:estStart ?birth ; gvp:estEnd ?birth2 ] ' +
	   	'  BIND (xsd:integer(0.5*(year(?time)+year(?time2)-year(?birth)-year(?birth2))) AS ?value) ' +
	   	'  FILTER (-1<?value && ?value<120) ' +
	   	'} GROUP BY ?value  ORDER BY ?value ';
       
       var queryMarriageAge = prefixes +
       'SELECT ?value (count(?value) AS ?count) ' +
	   	'WHERE { ' +
	   	'  { ' +
	   	'    SELECT distinct ?id (min(?age) AS ?value) WHERE { ' +
	   	'    { <RESULT_SET> } ' +
	   	'    VALUES ?rel { relations:Spouse } ' +
	   	'    ?id bioc:has_family_relation [ a ?rel ;  nbf:time/gvp:estStart ?time ] ; 	 ' +
	   	'        foaf:focus/^crm:P98_brought_into_life/nbf:time/gvp:estStart ?birth . ' +
	   	'    BIND (year(?time)-year(?birth) AS ?age) ' +
	   	'    FILTER (13<?age && ?age<120) ' +
	   	'    } GROUP BY ?id  } ' +
	   	'} GROUP BY ?value ORDER BY ?value ';
       
       var queryMarriageAgeAverage = prefixes +
       'SELECT ?value (count(?value) AS ?count) WHERE { ' +
       ' { <RESULT_SET> } ' +
	   	' ' +
	   	'  VALUES ?rel { relations:Spouse } ' +
	   	'  ?id bioc:has_family_relation [ a ?rel ;  nbf:time/gvp:estStart ?time ] ; ' +
	   	'   	foaf:focus/^crm:P98_brought_into_life/nbf:time/gvp:estStart ?birth . ' +
	   	'  BIND (year(?time)-year(?birth) AS ?value) ' +
	   	'  FILTER (13<?value && ?value<120) ' +
	   	'} GROUP BY ?value ORDER BY ?value ';
		    
       var queryFirstChildAge = prefixes +
       'SELECT ?value (count(?value) AS ?count) ' +
	   	'WHERE { ' +
	   	'  { ' +
	   	'    SELECT distinct ?id (min(?age) AS ?value) WHERE { ' +
	   	'    { <RESULT_SET> } ' +
	   	'    VALUES ?rel { relations:Child relations:Son relations:Daughter } ' +
	   	'    ?id bioc:has_family_relation [ a ?rel ;  nbf:time/gvp:estStart ?time ] ; 	 ' +
	   	'        foaf:focus/^crm:P98_brought_into_life/nbf:time/gvp:estStart ?birth . ' +
	   	'    BIND (year(?time)-year(?birth) AS ?age) ' +
	   	'    FILTER (13<?age && ?age<120) ' +
	   	'    } GROUP BY ?id  } ' +
	   	'} GROUP BY ?value ORDER BY ?value ';
       
       var queryAverageChildAge = prefixes +
       'SELECT ?age (count(?age) AS ?count) WHERE { ' +
       ' { <RESULT_SET> } ' +
	   	' ' +
	   	'  VALUES ?rel { relations:Child relations:Son relations:Daughter } ' +
	   	'  ?id bioc:has_family_relation [ a ?rel ;  nbf:time/gvp:estStart ?time ] ; ' +
	   	'   	foaf:focus/^crm:P98_brought_into_life/nbf:time/gvp:estStart ?birth . ' +
	   	'  BIND (year(?time)-year(?birth) AS ?age) ' +
	   	'  FILTER (13<?age && ?age<120) ' +
	   	'} GROUP BY ?age ORDER BY ?age ';
       
       var queryNumberOfChildren = prefixes +
   	' SELECT ?value (count(?id) AS ?count) ' +
	'WHERE { ' +
	'  { ' +
	'  SELECT ?id (count(?rel) AS ?value) ' +
	'  WHERE { ' +
	'    { <RESULT_SET> } ' +
	'    VALUES ?rel { relations:Child relations:Son relations:Daughter }  ' +
	'    ?id bioc:has_family_relation/a ?rel . ' +
	'    } GROUP BY ?id } ' +
	'  UNION ' +
	'  { ' +
	'    { <RESULT_SET> } ' +
	'  ?id dcterms:source sources:source1 ; ' +
	'    foaf:focus/nbf:has_biography/nbf:has_paragraph/nbf:id "2"^^xsd:integer . ' +
	'  FILTER not exists { ?id bioc:has_family_relation [ a relations:Child ]} ' +
	'  BIND (0 AS ?value) ' +
	'  } ' +
	'} GROUP BY ?value ORDER BY ?value ';
		   
       var queryNumberOfSpouses = prefixes +
       'SELECT ?value (count(?id) AS ?count) WHERE { ' +
		'  SELECT ?id (count(?rel) AS ?value) WHERE { ' +
		'    { <RESULT_SET> } ' +
		'    VALUES ?rel { relations:Spouse } ' +
		'    ?id bioc:has_family_relation/a ?rel . ' +
		'  } GROUP BY ?id ' +
		'} GROUP BY ?value ORDER BY ?value ';
       
      /**
        var queryTopTitles = prefixes + 
	    	' SELECT ?label ?year (count (distinct ?id) AS ?count) ' +
	    	' WHERE { ' +
	    	'    { ' +
	    	'    SELECT ?class (count (distinct ?id) AS ?no) ' +
	    	'    WHERE { ' +
	    	'      ?class rdfs:subClassOf+ bioc:Title . ' +
	    	'      ?evt bioc:relates_to_title ?class ; ' +
	    	'           bioc:title_inheres_in ?id . ' +
	    	'        { <RESULT_SET> } ' +
	    	'    } GROUP BY ?class ORDER BY desc(?no) LIMIT 5 ' +
	    	'    } ' +
	    	'    ?class skos:prefLabel ?label . ' +
	    	'    ?evt bioc:relates_to_title ?class ; ' +
	    	'         bioc:title_inheres_in ?id ; ' +
	    	'         schema:startDate ?date . ' +
	    	'    { <RESULT_SET> } ' +
	    	' 	 BIND (floor(year(?date)/10)*10 AS ?year)' +
	    	'  } GROUP BY ?label ?year ORDER by ?year ';
        
        var queryTopOrgs = prefixes + 
	        'SELECT ?label ?year (count (distinct ?id) AS ?count) ' +
	    	'  WHERE { ' +
	    	'    { ' +
	    	'    SELECT ?org (count (distinct ?id) AS ?no) ' +
	    	'    WHERE { ' +
	    	'  	   ?evt bioc:title_inheres_in ?id ; ' +
            '      		bioc:relates_to ?org . ' +
            '		?org a foaf:Organization . ' +
	    	'      { <RESULT_SET> } ' +
	    	'    } GROUP BY ?org ORDER BY desc(?no) LIMIT 5 ' +
	    	'    } ' +
	    	'    ?org skos:prefLabel ?label . ' +
	    	'    ?evt bioc:title_inheres_in ?id ; ' +
	    	'    	  bioc:relates_to ?org; ' +
	    	'         schema:startDate ?date . ' +
	    	'    { <RESULT_SET> } ' +
	    	' 	 BIND (floor(year(?date)/10)*10 AS ?year)' +
	    	'  } GROUP BY ?label ?year ORDER by ?year ';
	    
        var queryTopSchools = prefixes + 
	        ' SELECT ?label ?year (count (distinct ?id) AS ?count) ' +
	    	' WHERE { ' +
	    	'    { ' +
	    	'    SELECT ?org (count (distinct ?id) AS ?no) ' +
	    	'    WHERE { ' +
	    	'  	   ?evt bioc:education_inheres_in ?id ; ' +
	        '      		bioc:relates_to ?org . ' +
	        ' 	   ?org a schema:EducationalOrganization ' +	
	    	'      { <RESULT_SET> } ' +
	    	'    } GROUP BY ?org ORDER BY desc(?no) LIMIT 5 ' +
	    	'    } ' +
	    	'    ?org skos:prefLabel ?label .' +
	    	'    ?evt bioc:education_inheres_in ?id ; ' +
	    	'    	  bioc:relates_to ?org; ' +
	    	'         schema:startDate ?date . ' +
	    	'    { <RESULT_SET> } ' +
	    	' 	 BIND (floor(year(?date)/10)*10 AS ?year)' +
	    	' } GROUP BY ?label ?year ORDER by ?year ';
    
        */
       
        // The SPARQL endpoint URL
        var endpointUrl = SPARQL_ENDPOINT_URL;

        var facetOptions = {
            endpointUrl: endpointUrl,
            rdfClass: '<http://ldf.fi/nbf/PersonConcept>',
            preferredLang : 'fi'
        };

        var endpoint = new AdvancedSparqlService(endpointUrl, objectMapperService);
        
        
        function getMarriageAge(facetSelections) {
        	var cons = facetSelections.constraint.join(' '),
        		q = queryMarriageAge.replace("<RESULT_SET>", cons);
        	return endpoint.getObjectsNoGrouping(q) ;
        }
        
        function getFirstChildAge(facetSelections) {
        	var cons = facetSelections.constraint.join(' '),
    			q = queryFirstChildAge.replace("<RESULT_SET>", cons);
        	return endpoint.getObjectsNoGrouping(q) ;
	    }
        
        function getAge(facetSelections) {
        	var cons = facetSelections.constraint.join(' '),
        		q = queryAge.replace("<RESULT_SET>", cons);
        	// console.log(q);
        	return endpoint.getObjectsNoGrouping(q) ;
        }
        
        function getNumberOfChildren(facetSelections) {
        	var cons = facetSelections.constraint.join(' '),
    			q = queryNumberOfChildren.replace(/<RESULT_SET>/g, cons);
        	return endpoint.getObjectsNoGrouping(q) ;
        }
        
        function getNumberOfSpouses(facetSelections) {
        	var cons = facetSelections.constraint.join(' '),
    			q = queryNumberOfSpouses.replace("<RESULT_SET>", cons);
        	return endpoint.getObjectsNoGrouping(q) ;
        }
        
        
        function getResults(facetSelections) {
        	var promises = [
            	this.getAge(facetSelections),
            	this.getMarriageAge(facetSelections),
            	this.getFirstChildAge(facetSelections),
            	this.getNumberOfChildren(facetSelections),
            	this.getNumberOfSpouses(facetSelections)
            ];
        	return $q.all(promises);
        }
        
        
        function getFacets() {
            var facetsCopy = angular.copy(facets);
            return $q.when(facetsCopy);
        }

        function getFacetOptions() {
            return facetOptions;
        }

    }
    visuService.$inject = ["$q", "$location", "_", "AdvancedSparqlService", "objectMapperService", "SPARQL_ENDPOINT_URL"];
})();

angular.module('facetApp').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/cards.html',
    "<div class=\"container\"> <div class=\"row\"> <div class=\"col-md-2 col-sm-2 col-xs-2 vcenter push-xs-2\"> <!-- <img src=\"images/SKB.svg\" class=\"norssi-logo center-block img img-responsive\" /> --> </div><!-- DO NOT REMOVE THIS COMMENT, IT IS A HACK\n" +
    "--><div class=\"col-xs-9 col-md-9 col-lg-9 vcenter push-xs-9 toptext\"> <div ng-include=\"'views/description.partial.html'\"></div> </div> <!--  <div class=\"col-md-12 pull-md-12 col-lg-12\">\n" +
    "      <br/>BIRTH YEAR\n" +
    "          <rzslider rz-slider-model=\"minRangeSlider.minValue\" rz-slider-high=\"minRangeSlider.maxValue\" rz-slider-options=\"minRangeSlider.options\">\n" +
    "        </rzslider>\n" +
    "    </div> --> <div class=\"col-md-12 pull-md-12 col-lg-12\"> <!--\n" +
    "    <div class=\"col-md-4 pull-md-4 col-lg-3\"> --> <div ng-include=\"'views/facets.partial.html'\"></div> </div> <div class=\"col-md-12 pull-md-12 col-lg-12\"> <div class=\"sort-custom\"> <b class=\"subject\">Sort by</b> <span class=\"sort\"> <a href=\"\" ng-click=\"vm.sortBy('?birthDate')\">Birthdate</a> <span ng-class=\"vm.getSortClass('?birthDate', true)\" class=\"glyphicon\" aria-hidden=\"true\"></span>&emsp;&emsp;&emsp; <a href=\"\" ng-click=\"vm.sortBy('?familyName')\">Family Name</a> <span ng-class=\"vm.getSortClass('?familyName')\" class=\"glyphicon\" aria-hidden=\"true\"></span>&emsp;&emsp;&emsp; <a href=\"\" ng-click=\"vm.sortBy('?givenName')\">First Name</a> <span ng-class=\"vm.getSortClass('?givenName')\" class=\"glyphicon\" aria-hidden=\"true\"></span> </span> </div> <div ng-include=\"'views/cards.partial.html'\"></div> </div> </div> </div>"
  );


  $templateCache.put('views/cards.partial.html',
    "<img class=\"loading-img\" src=\"images/loading-lg.gif\" ng-if=\"vm.isLoadingResults\"> <div infinite-scroll=\"vm.nextPage()\" infinite-scroll-disabled=\"vm.isScrollDisabled()\" infinite-scroll-distance=\"0\"> <div class=\"row\"> <div ng-repeat=\"person in vm.people\" class=\"person-container\"> <div class=\"col-xs-12 col-sm-12 person-panel col-md-3 col-lg-2\"> <div class=\"thumbnail\"> <a ui-sref=\"person.detail({ personId: person.id })\"> <div class=\"person-profile-img vertical-center\"> <img class=\"img img-responsive center-block media-middle\" ng-src=\"{{ ::person.images | first }}\"> </div> </a> <div class=\"caption\"> <div class=\"visible-caption\"> <div class=\"row\"> <div class=\"col-xs-12 col-sm-3 col-md-12\"> <b><a ui-sref=\"person.detail({ personId: person.id })\">{{ ::person.givenName }} {{ ::person.familyName }}</a></b> </div> <div class=\"col-xs-12 col-sm-9 col-md-12\"> <p ng-if=\"::(person.birthPlace || person.birthDate || person.deathDate)\"> <span class=\"birth icon-born\"></span>&nbsp;<span ng-if=\"::person.birthPlace\">{{ ::person.birthPlace }}</span>{{ ::person.birthDate }} <span ng-if=\"::person.deathDate\"><span class=\"birth icon-death\"></span>&nbsp;{{ ::person.deathPlace }}&nbsp;{{ ::person.deathDate }}</span> </p> </div> <div ng-if=\"::person.occupation\" class=\"col-xs-12\"> <p>{{ ::person.occupation | castArray | join:', ' }}</p> </div> <!-- Glyphicon Section--> <div class=\"col-xs-12 icon-menu\"> <a title=\"Näytä matrikkeliteksti\" ng-attr-title=\"{{ showText ? 'Piilota matrikkeliteksti' : 'Näytä matrikkeliteksti' }}\" href=\"\" ng-click=\"showText = !showText\"><span class=\"bio\" ng-class=\"{ 'icon-bio-down': !showText, 'icon-bio-up': showText }\" aria-hidden=\"true\"></span></a> <a title=\"Data\" class=\"\" ng-href=\"{{ ::person.id }}\"><span class=\"bio icon-data\" aria-hidden=\"true\"></span></a> </div> </div> <!----> <div class=\"row\"> <div ng-if=\"::person.hasAchievements\" class=\"col-xs-6\"> <a href=\"\" class=\"link\" ng-click=\"vm.getAchievements(person)\" uib-popover-template=\"'views/achievements-popover.html'\" popover-trigger=\"'outsideClick'\" popover-append-to-body=\"true\" popover-placement=\"auto right\">Saavutukset</a> </div> <div ng-if=\"::person.wikipedia\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.wikipedia }}\">Wikipedia</a> </div> <div ng-if=\"::person.wikidata\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.wikidata }}\">Wikidata</a> </div> <div ng-if=\"::person.dbpedia\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.dbpedia }}\">DBpedia</a> </div> <div ng-if=\"::person.twitter\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.twitter }}\">Twitter</a> </div> <div ng-if=\"::person.norssi\" class=\"col-xs-6\"> <a ng-href=\"http://www.norssit.fi/semweb/#!/tiedot/http:~2F~2Fldf.fi~2Fnorssit~2F{{ ::person.norssi }}\">Norssi</a> </div> <div ng-if=\"::person.kirjasampo\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.kirjasampo }}\">Kirjasampo</a> </div> <div ng-if=\"::person.blf\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.blf }}\">BLF</a> </div> <div ng-if=\"::person.ulan\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.ulan }}\">ULAN</a> </div> <div ng-if=\"::person.viaf\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.viaf }}\">VIAF</a> </div> <div ng-if=\"::person.norssit\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.norssit }}\">Norssit</a> </div> <div ng-if=\"::person.eduskunta\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.eduskunta }}\">Eduskunta</a> </div> <div ng-if=\"::person.website\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.website }}\">Kotisivu</a> </div> <div ng-if=\"::person.genicom\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.genicom }}\">Kotisivu (Geni.com)</a> </div> <div ng-if=\"::person.genitree\" class=\"col-xs-6\"> <a ng-href=\"{{ ::person.genitree }}\">Sukupuu (Geni.com)</a> </div> </div> <div ng-if=\"::person.relative\" class=\"row\"> <div class=\"col-xs-12\">Sukulaiset:</div> <div class=\"col-sm-6 col-md-12\" ng-repeat=\"relative in person.relative | castArray\"> {{ ::relative.type }} <a ui-sref=\"person.detail({ personId: relative.id })\">{{ ::relative.name }}</a> </div> </div> <div ng-if=\"::person.hobby\" class=\"row\"> <div class=\"col-md-12\"> <p>Harrastukset: {{ ::person.hobby | castArray | join: ', ' }}</p> </div> </div> <div uib-collapse=\"!showText\"> <hr> <p>{{ ::person.short_description }}</p> </div> </div> </div> </div> </div> <div class=\"clearfix visible-lg-block\" ng-if=\"($index + 1) % 6 == 0\"></div> <div class=\"clearfix visible-md-block\" ng-if=\"($index + 1) % 4 == 0\"></div> <div class=\"clearfix visible-sm-block\" ng-if=\"($index + 1) % 1 == 0\"></div> <div class=\"clearfix visible-xs-block\" ng-if=\"($index + 1) % 1 == 0\"></div> </div> </div> </div>"
  );


  $templateCache.put('views/description.partial.html',
    "<h4>U.S. Congress Legislators</h4> <p> Biographical Repository of the U.S. Congress Legislators. This interface enables you to explore biographical and prosopographical data of the United States Congress members from the 1st through 115th Congresses (1789-2018).<br>Source: <a href=\"https://github.com/unitedstates/congress-legislators\">Members of the United States Congress</a>, <a href=\"http://k7moa.com/\">K7MOA Legacy Voteview Website</a> </p>"
  );


  $templateCache.put('views/description.statistics.partial.html',
    "<h1>This page is under construction</h1> <p> This page is under construction. </p>"
  );


  $templateCache.put('views/detail.html',
    "<div class=\"col-sm-12 col-md-8 text-center\" ng-show=\"vm.person\"> <div class=\"col-sm-12\" ng-show=\"!vm.person && !vm.error\"> <img class=\"loading-img\" src=\"images/loading-lg.gif\"> </div> <h1>{{ vm.person.givenName }} {{ vm.person.familyName }}</h1> <div class=\"thumbnail\"> <div class=\"person-profile-img\"> <div class=\"row\"> <div class=\"col-sm-12 text-center\"> <img ng-repeat=\"img in vm.person.images\" class=\"person-img img img-responsive\" ng-src=\"{{ img }}\"> </div> </div> </div> <div class=\"caption\"> <div class=\"visible-caption\"> <div class=\"row\"> <div class=\"col-xs-12\"> <p ng-if=\"(vm.person.birthPlace || vm.person.birthDate || vm.person.deathDate)\"> <span ng-if=\"(vm.person.birthPlace || vm.person.birthDate)\"><span class=\"birth icon-born\"></span>&nbsp;{{ vm.person.birthPlace }} {{ vm.person.birthDate }}</span> <br> <span ng-if=\"(vm.person.deathPlace || vm.person.deathDate)\"><span class=\"birth icon-death\"></span>&nbsp;{{ vm.person.deathPlace }}</span> <span ng-if=\"vm.person.deathDate\">{{ vm.person.deathDate }}</span> </p> </div> <div ng-if=\"vm.person.occupation\" class=\"col-xs-12\"> <p>{{ vm.person.occupation | castArray | join:', ' }}</p> </div> <div class=\"col-xs-12 icon-menu\"> <a title=\"Data\" class=\"\" ng-href=\"{{ vm.person.id }}\"><span class=\"bio icon-data\" aria-hidden=\"true\"></span></a> </div> </div> <div class=\"row\"> <div ng-if=\"vm.person.wikipedia\" class=\"col-xs-6 col-xs-offset-3\"> <a ng-href=\"{{ vm.person.wikipedia }}\">Wikipedia</a> </div><div ng-if=\"vm.person.wikidata\" class=\"col-xs-6 col-xs-offset-3\"> <a ng-href=\"{{ vm.person.wikidata }}\">Wikidata</a> </div> <div ng-if=\"vm.person.dbpedia\" class=\"col-xs-6 col-xs-offset-3\"> <a ng-href=\"{{ vm.person.dbpedia }}\">DBpedia</a> </div> <div ng-if=\"vm.person.twitter\" class=\"col-xs-6 col-xs-offset-3\"> <a ng-href=\"{{ vm.person.twitter }}\">Twitter</a> </div> </div> </div> <div ng-if=\"vm.person.committee\" class=\"row padded-row\"> <div class=\"col-xs-12\"><h4>Member of committees:</h4></div> <p style=\"white-space: pre-line\">{{ vm.person.committee.label }}</p> </div> <div ng-if=\"vm.person.description\" class=\"entry-text text-left\"> <hr> <p>{{ vm.person.description }}</p> </div> </div> </div> </div> <div class=\"col-md-4 text-left\" ng-if=\"vm.person.similar\"> <h3>Similar persons</h3> <img ng-if=\"!vm.person.similar\" class=\"loading-img\" src=\"images/loading-lg.gif\"> <div class=\"col-sm-6\" ng-repeat=\"person in vm.person.similar\"> <a ui-sref=\"person.detail({ personId: person.prs })\">{{ person.label }}</a> </div> </div>  "
  );


  $templateCache.put('views/facets.partial.html',
    "<a id=\"remove\" href=\"\" ng-click=\"vm.removeFacetSelections()\">Remove all selections</a> <div class=\"facets\"> <div class=\"row\"> <div class=\"col-md-12 pull-md-12 col-lg-12\"> <div id=\"sl\"> <seco-slider-facet data-options=\"vm.facets.slider\"></seco-slider-facet> </div> </div> </div> </div> <!-- Following facets divided in 2 rows (4 × 4)to avoid layout misaligning --> <div class=\"facets\"> <div class=\"row\"> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-jena-text-facet data-options=\"vm.facets.entryText\"></seco-jena-text-facet> <div class=\"show-facets row\"> <div class=\"col-xs-12\"> <button class=\"btn btn-default pull-right visible-xs-block visible-sm-block\" ng-click=\"show = !show\">{{ show ? 'Hide all facets' : 'Show all facets' }}</button> </div> </div> </div> <div class=\"hideable-facets\" ng-class=\"{ 'hidden-sm hidden-xs': !show }\"> <!--  <seco-basic-facet data-options=\"vm.facets.occupation\"></seco-basic-facet> --> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.familyName\"></seco-basic-facet> </div> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.givenName\"></seco-basic-facet> </div> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.gender\"></seco-basic-facet> </div> </div> </div> </div> <div class=\"facets\"> <div class=\"row\"> <div class=\"hideable-facets\" ng-class=\"{ 'hidden-sm hidden-xs': !show }\"> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.type\"></seco-basic-facet> </div> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.memberOf\"></seco-basic-facet> </div> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.state\"></seco-basic-facet> </div> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-checkbox-facet data-options=\"vm.facets.link\"></seco-checkbox-facet> </div> </div> </div> </div> <div class=\"facets\"> <div class=\"row\"> <div class=\"hideable-facets\" ng-class=\"{ 'hidden-sm hidden-xs': !show }\"> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.occupation\"></seco-basic-facet> </div> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-hierarchy-facet data-options=\"vm.facets.birthPlace\"></seco-hierarchy-facet> </div> <div class=\"col-md-3 pull-md-3 col-lg-3\"> <seco-basic-facet data-options=\"vm.facets.congress_number\"></seco-basic-facet> </div> </div> </div> </div>"
  );


  $templateCache.put('views/groupmap.html',
    "<div class=\"container-fluid\"> <div class=\"row\"> <div class=\"col-sm-12\" ng-show=\"!vm.markers && !vm.error\"> <img class=\"loading-img\" src=\"images/loading-lg.gif\"> </div> <div uib-alert ng-if=\"vm.error\"> {{ vm.error }} </div> <div class=\"text-center\"> On the map people's <b><span style=\"color:#0045b5\">BIRTH</span></b> and <b><span style=\"color:#f3224e\">DEATH</span></b> places are shown. The illustration is made based on the selections made in facets on the left. <div class=\"container-fluid thumbnail\"> <div class=\"col-md-4 pull-md-4 col-lg-3\"> <div id=\"sl-2\"> <seco-slider-facet data-options=\"vm.facets.slider\"></seco-slider-facet> </div> <div ng-include=\"'views/mapfacets.partial.html'\"></div> </div> <div class=\"col-md-8 col-lg-9\"> <ui-gmap-google-map id=\"ui-gmap-google-map\" center=\"vm.map.center\" zoom=\"vm.map.zoom\"> <ui-gmap-window id=\"ui-gmap-window\" show=\"vm.window.show\" options=\"vm.window\" templateurl=\"'views/groupmap.popup.html'\" templateparameter=\"vm\" closeclick=\"vm.closeWindow\"> <span></span> </ui-gmap-window> <ui-gmap-marker ng-repeat=\"marker in vm.markers\" coords=\"marker\" idkey=\"marker.id\" options=\"marker.options\" click=\"marker.onClick()\"></ui-gmap-marker> </ui-gmap-google-map> </div> </div> </div> </div> </div>"
  );


  $templateCache.put('views/groupmap.popup.html',
    "<div class=\"map-popup\"> <div id=\"popupcontainer\" class=\"col-sm-4 col-md-2 text-center\"> <h4 ng-show=\"parameter.place_label\">{{ parameter.place_label }}</h4> <ul class=\"list-group row list-group-persons ng-scope\" id=\"popupcontainer2\"> <li class=\"list-group-item col-xs-6 ng-scope\" ng-show=\"parameter.people\" ng-repeat=\"person in parameter.people\"> <a ui-sref=\"person.detail({ personId: person.uri })\">{{ person.label }}</a> </li> </ul> </div> </div>"
  );


  $templateCache.put('views/help.html',
    "<div class=\"modal-header\"> <div class=\"row\"> <div class=\"col-xs-10 text-left\"> <h3 class=\"modal-title\">U.S. Congress Legislators</h3> </div> <div class=\"col-xs-2\"> <a href=\"#\" ng-click=\"$close()\" class=\"no-decoration btn-lg pull-right glyphicon glyphicon-remove\"></a> </div> </div> </div> <div class=\"modal-body\"> <p> You can browse the congress legislators data (members list) by using the timline and the filters. The timeline enables you to filter data by the number fo congresses—starting from the 1st (1789) through 115th (2018). Each filter has its own search box as well as a list of options for the filter. To search the register for text search, enter the text in the 'Search' field. To add/remove the filters, press the '+'/'-' button on the right of each filter. Only one option can be selected for each filter, and the member list is filtered based on the choices (The selection can be deleted by selecting '- No selection -'). Furtheremore, this interface allows multiple selection. You can explore the data by selecting and combining different filters. </p> <hr> <p> <h4>Filter Selection:</h4> <ol> <li>Drag the timeline and select a range.</li> <li>Select one of the filters (open the filter by pressing the '+' button if needed).</li> <li>Select a value from the list in the filter, or type in the list in the text box above.<br>If you use text box, the list of filters below will be updated as you type.</li> <li>You can select a filter condition by clicking on the list<br>or delete by clicking on '—' button or '- No selection -' which can be found in the top of the list.</li> <li>The list will be updated.</li> <li>You can go over the previous steps 1-4, try different filters and combine them.</li> </ol> </p> </div>"
  );


  $templateCache.put('views/login.html',
    "<div class=\"container-fluid\"> <div class=\"row\"> <div class=\"col-sm-12\"> <h1>Kirjaudu</h1> <div ng-show=\"vm.error\" class=\"alert alert-danger\" role=\"alert\">{{ vm.error }}</div> <form> <div class=\"form-group\"> <label for=\"un\">Käyttäjätunnus</label> <input ng-model=\"vm.un\" type=\"text\" class=\"form-control\" id=\"un\" placeholder=\"Username\"> </div> <div class=\"form-group\"> <label for=\"pw\">Salasana</label> <input ng-model=\"vm.pw\" type=\"password\" class=\"form-control\" id=\"pw\" placeholder=\"Password\"> </div> <button ng-click=\"vm.login()\" type=\"submit\" class=\"btn btn-default\">Submit</button> </form> </div> </div> </div>"
  );


  $templateCache.put('views/map.html',
    "<div class=\"container\"> <div class=\"row\"> <div class=\"col-sm-12\" ng-show=\"!vm.person && !vm.error\"> <img class=\"loading-img\" src=\"images/loading-lg.gif\"> </div> <div uib-alert ng-if=\"vm.error\"> {{ vm.error }} </div> <div class=\"container-fluid text-center\" ng-show=\"vm.person\"> <h1>{{ vm.person.givenName }} {{ vm.person.familyName }}</h1> <div class=\"container-fluid thumbnail\"> <div> <div id=\"labelcontainer\" class=\"col-sm-4 col-md-2 text-center\" ng-show=\"vm.person\"> <p ng-repeat=\"event in ::vm.events\" class=\"{{event.class}}\" ng-mouseenter=\"vm.focusEvent(event)\" ng-mouseleave=\"vm.unfocusEvent(event)\"> <a ng-if=\"::event.relativelink\" ng-href=\"{{event.relativelink}}\">{{ event.id }}: {{ event.label }}</a> <span ng-if=\"::!event.relativelink\">{{ event.id }}: {{ event.label }}</span> </p> </div> </div> <div class=\"col-sm-12 col-md-10 text-center\"> <ui-gmap-google-map id=\"ui-gmap-google-map\" center=\"vm.map.center\" zoom=\"vm.map.zoom\"> <ui-gmap-marker ng-repeat=\"marker in vm.markers\" coords=\"marker\" idkey=\"marker.id\" options=\"marker.options\"></ui-gmap-marker> </ui-gmap-google-map> <svg id=\"timelinecontainer\" viewbox=\"-15,-7,120,27\" preserveaspectratio=\"none\" version=\"1.0\" x=\"0\" y=\"0\" width=\"900\" height=\"180\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"> <line ng-repeat=\"line in ::vm.mainline.lines\" ng-attr-x1=\"{{ line.x1 }}\" ng-attr-x2=\"{{ line.x2 }}\" ng-attr-y1=\"{{ line.y1 }}\" ng-attr-y2=\"{{ line.y2 }}\"> </line> <text ng-repeat=\"text in ::vm.mainline.texts\" ng-attr-x=\"{{ text.x }}\" ng-attr-y=\"{{ text.y }}\"> {{ text.year }} </text> <path ng-repeat=\"event in vm.events\" ng-mouseenter=\"vm.focusEvent(event)\" ng-mouseleave=\"vm.unfocusEvent(event)\" class=\"{{ event.class }}\" ng-attr-d=\"{{ event.path }}\"> </path> </svg> <p> <span>{{ vm.currentEvent }}</span> </p> </div> </div> </div> </div> </div>"
  );


  $templateCache.put('views/mapfacets.partial.html',
    "<a href=\"\" ng-click=\"vm.removeFacetSelections()\">Remove all selections</a> <div class=\"facets\"> <seco-jena-text-facet data-options=\"vm.facets.entryText\"></seco-jena-text-facet> <div class=\"show-facets row\"> <div class=\"col-xs-12\"> <button class=\"btn btn-default pull-right visible-xs-block visible-sm-block\" ng-click=\"show = !show\">{{ show ? 'Hide the facets' : 'Show the facets' }}</button> </div> </div> <div class=\"hideable-facets\" ng-class=\"{ 'hidden-sm hidden-xs': !show }\"> <seco-basic-facet data-options=\"vm.facets.familyName\"></seco-basic-facet> <seco-basic-facet data-options=\"vm.facets.givenName\"></seco-basic-facet> <seco-basic-facet data-options=\"vm.facets.gender\"></seco-basic-facet> <seco-hierarchy-facet data-options=\"vm.facets.birthPlace\"></seco-hierarchy-facet> <seco-basic-facet data-options=\"vm.facets.type\"></seco-basic-facet> <seco-basic-facet data-options=\"vm.facets.memberOf\"></seco-basic-facet> <seco-basic-facet data-options=\"vm.facets.state\"></seco-basic-facet> <seco-checkbox-facet data-options=\"vm.facets.link\"></seco-checkbox-facet> <seco-basic-facet data-options=\"vm.facets.occupation\"></seco-basic-facet> <seco-basic-facet data-options=\"vm.facets.congress_number\"></seco-basic-facet> </div> </div>"
  );


  $templateCache.put('views/page-modal.html',
    "<div class=\"modal-header\"> <div class=\"row\"> <div class=\"col-xs-8\"> <h3 class=\"modal-title\">{{ $ctrl.person.ordinal }} {{ $ctrl.person.givenName }} {{ $ctrl.person.familyName }}</h3> </div> <div class=\"col-xs-4 text-right\"> <button class=\"btn btn-default\" ng-click=\"$ctrl.previousPage()\" ng-disabled=\"$ctrl.pageNo === 1\" aria-label=\"Edellinen sivu\"> <span class=\"glyphicon glyphicon-step-backward\"></span> </button> <span>{{ $ctrl.pageNo }}</span> <button class=\"btn btn-default\" ng-click=\"$ctrl.nextPage()\" ng-disabled=\"$ctrl.pageNo === 716\" aria-label=\"Seuraava sivu\"> <span class=\"glyphicon glyphicon-step-forward\"></span> </button> <button ng-click=\"$ctrl.close()\" class=\"btn btn-default\" aria-label=\"Sulje\"> <span aria-hidden=\"true\" class=\"glyphicon glyphicon-remove\"></span> </button> </div> </div> </div><div class=\"modal-body\"> <img class=\"img img-responsive\" ng-src=\"{{ $ctrl.pageUrl }}\"> </div>"
  );


  $templateCache.put('views/person.html',
    "<div class=\"container-fluid\"> <div class=\"row\"> <div class=\"col-sm-12\"> <ul class=\"nav nav-tabs\"> <li ui-sref=\"person.detail\" ui-sref-active=\"active\"> <a href=\"\"><span class=\"glyphicon glyphicon-info-sign\" aria-hidden=\"true\"></span> Personal Information</a> </li> <li ui-sref=\"person.map\" ui-sref-active=\"active\"> <a href=\"\"><span class=\"glyphicon glyphicon-map-marker\" aria-hidden=\"true\"></span> Timeline</a> </li> </ul> </div> </div> <div class=\"row\"> <div ui-view></div> </div> </div>"
  );


  $templateCache.put('views/profile-image-popover.html',
    "<div> <img class=\"img img-responsive\" ng-src=\"{{ img }}\"> </div>"
  );


  $templateCache.put('views/sliderFacet.directive.html',
    "<div ng-if=\"vm.facet\"> <span>{{ vm.facet.name }}</span> <rzslider rz-slider-model=\"vm.facet.slider.minValue\" rz-slider-high=\"vm.facet.slider.maxValue\" rz-slider-options=\"vm.facet.slider.options\"></rzslider> </div>"
  );


  $templateCache.put('views/subnavbar.html',
    "<ul class=\"nav navbar-nav\"> <li><a href=\"\" id=\"show-help\" ng-click=\"vm.showHelp()\"><span class=\"glyphicon glyphicon-question-sign\" aria-hidden=\"true\"></span> Help</a></li> <li ui-sref-active=\"active\"><a ui-sref=\"cards\"><span class=\"glyphicon glyphicon-th\" aria-hidden=\"true\"></span> Grid</a></li> <li ui-sref-active=\"active\"><a ui-sref=\"table\"><span class=\"glyphicon glyphicon-align-justify\" aria-hidden=\"true\"></span> List</a></li> <li ui-sref-active=\"active\"><a ui-sref=\"groupmap\"><span class=\"glyphicon glyphicon glyphicon-globe\" aria-hidden=\"true\"></span> Map</a></li> <li class=\"dropdown\" ui-sref-active=\"{'active': 'visualizations.**'}\"> <a class=\"dropdown-toggle\" data-toggle=\"dropdown\" href=\"\" id=\"statistics\"><span class=\"glyphicon glyphicon-stats\" aria-hidden=\"true\"></span> Statistics<span class=\"caret\"></span></a> <ul class=\"dropdown-menu\"> <li ui-sref-active=\"active\"><a ui-sref=\"visualizations.visu2\"><span class=\"glyphicon glyphicon-stats\" aria-hidden=\"true\"></span> Statistics</a></li> </ul> </li> </ul>"
  );


  $templateCache.put('views/table.html',
    "<div class=\"container\"> <div class=\"row\"> <div class=\"col-md-2 col-sm-2 col-xs-2 vcenter push-xs-2\"> <!-- <img src=\"images/SKB.svg\" class=\"norssi-logo center-block img img-responsive\" /> --> </div><!-- DO NOT REMOVE THIS COMMENT, IT IS A HACK\n" +
    " --><div class=\"col-xs-9 col-md-9 col-lg-9 vcenter push-xs-9 toptext\"> <div ng-include=\"'views/description.partial.html'\"></div> </div> <!--  <div class=\"col-md-12 pull-md-12 col-lg-12\">\n" +
    "      <br/>BIRTH YEAR\n" +
    "          <rzslider rz-slider-model=\"minRangeSlider.minValue\" rz-slider-high=\"minRangeSlider.maxValue\" rz-slider-options=\"minRangeSlider.options\">\n" +
    "        </rzslider>\n" +
    "    </div> --> <div class=\"col-md-12 pull-md-12 col-lg-12\"> <div ng-include=\"'views/facets.partial.html'\"></div> </div> <div class=\"col-md-12 pull-md-12 col-lg-12\"> <div class=\"sort-custom\"> <b class=\"subject\">Sort by</b> <span class=\"sort\"> <a href=\"\" ng-click=\"vm.sortBy('?birthDate')\">Birthdate</a> <span ng-class=\"vm.getSortClass('?birthDate', true)\" class=\"glyphicon\" aria-hidden=\"true\"></span>&emsp;&emsp;&emsp; <a href=\"\" ng-click=\"vm.sortBy('?familyName')\">Family Name</a> <span ng-class=\"vm.getSortClass('?familyName')\" class=\"glyphicon\" aria-hidden=\"true\"></span>&emsp;&emsp;&emsp; <a href=\"\" ng-click=\"vm.sortBy('?givenName')\">First Name</a> <span ng-class=\"vm.getSortClass('?givenName')\" class=\"glyphicon\" aria-hidden=\"true\"></span> </span> </div> <div ng-include=\"'views/table.partial.html'\"></div> </div> </div> </div>"
  );


  $templateCache.put('views/table.partial.html',
    "<table class=\"table table-striped norssi-table ng-table-responsive\" ng-table=\"vm.tableParams\"> <thead> <tr> <th class=\"col-xs-4\">Name</th> <th class=\"col-xs-1\">Occupation</th> <th class=\"col-xs-1\">Links</th> <th class=\"col-xs-1\"><span class=\"hidden-xs hidden-sm\">Else</span></th> <th class=\"col-xs-5 hidden-xs hidden-sm\">Description</th> </tr> </thead> <tbody> <tr ng-show=\"!vm.isLoadingResults\" ng-repeat=\"person in $data\"> <td class=\"person-image-container\" data-title=\"'Nimi'\"> <div ng-class=\"::{ 'name-col col-md-6 col-lg-6': person.images }\"> <b><a ui-sref=\"person.detail({ personId: person.id })\">{{ ::person.givenName }} {{ ::person.familyName }}</a></b><br> <span ng-if=\"::(person.birthDate)\"><span class=\"birth icon-born\"></span>&nbsp;{{ ::person.birthPlace }} {{ ::person.birthDate }}</span> <span ng-if=\"::person.deathDate\"><span class=\"birth icon-death\"></span>&nbsp;{{ ::person.deathPlace }} {{ ::person.deathDate }}</span> </div> <div ng-if=\"::person.hasImage\" class=\"name-col col-md-4 col-lg-4\"> <div ng-repeat=\"img in ::person.images\" ng-class=\"{ 'col-md-12': ($first && $last), 'col-sm-6': !($first && $last) }\" class=\"person-img-col vcenter\"> <img uib-popover-template=\"'views/profile-image-popover.html'\" popover-trigger=\"'mouseenter'\" popover-placement=\"auto right\" popover-append-to-body=\"true\" class=\"person-image img img-responsive\" ng-src=\"{{ img  }}\"> </div> </div> </td> <td class=\"links\" data-title=\"'Henkilö'\"> <div ng-if=\"::person.occupation\" class=\"hidden-xs hidden-sm\"> <p>{{ ::person.occupation | castArray | join:', ' }}</p> </div> </td> <td class=\"links\" data-title=\"'Linkit'\"> <a class=\"link\" ng-if=\"::person.wikipedia\" ng-href=\"{{ ::person.wikipedia }}\">Wikipedia</a> <a class=\"link\" ng-if=\"::person.dbpedia\" ng-href=\"{{ ::person.dbpedia }}\">DBpedia</a> <a class=\"link\" ng-if=\"::person.twitter\" ng-href=\"{{ ::person.twitter }}\">Twitter</a> <span class=\"icon-menu\"> <a title=\"Data\" class=\"\" ng-href=\"{{ ::person.id }}\"><span class=\"bio icon-data\" aria-hidden=\"true\"></span></a> </span> </td><td data-title=\"'Else'\"> <div ng-if=\"::person.relativ\"> <span>Relatives: </span><br> <span ng-repeat=\"relative in person.relative | castArray\"> {{ ::relative.type }} <a ui-sref=\"person.detail({ personId: relative.id })\">{{ ::relative.name }}</a> </span> </div> </td> <td data-title=\"'Description'\" class=\"hidden-xs hidden-sm\"> <span ng-if=\"::person.short_description\">{{ ::person.short_description }}</span> </td> </tr> </tbody> </table> <img class=\"loading-img\" src=\"images/loading-lg.gif\" ng-if=\"vm.isLoadingResults\">"
  );


  $templateCache.put('views/visu.html',
    "<div class=\"container-fluid\"> <div class=\"row\"> <div class=\"col-md-2 col-sm-2 col-xs-2 vcenter push-xs-2\"> <img src=\"images/SKB.svg\" class=\"norssi-logo center-block img img-responsive\"> </div><!-- DO NOT REMOVE THIS COMMENT, IT IS A HACK\n" +
    " --><div class=\"col-xs-9 col-md-8 col-lg-9 vcenter push-xs-9\"> <div ng-include=\"'views/description.statistics.partial.html'\"></div> </div> <div class=\"col-md-3 pull-md-3 col-lg-2\"> <div ng-include=\"'views/facets.partial.html'\"></div> </div> <div class=\"col-md-9 col-lg-10\" min-height=\"500\"> Työn alla - under construction <img class=\"loading-img\" src=\"images/loading-lg.gif\" ng-if=\"vm.isLoadingResults\"> <div id=\"chart_education\" style=\"width: 100%; height: 500px\"></div> <div id=\"chart_eduorganization\" style=\"width: 100%; height: 500px\"></div> <div id=\"chart_occupation\" style=\"width: 100%; height: 500px\"></div> <div id=\"chart_organization\" style=\"width: 100%; height: 500px\"></div> <p style=\"font-family: Arial; font-size:15px; color:black\"><strong>Oppilaitoksista saatuja oppiarvoja</strong></p> <div id=\"chart_sankey\" style=\"width: 100%; height: 700px\"></div> </div> </div> </div>"
  );


  $templateCache.put('views/visu2.html',
    "<div class=\"container-fluid\"> <div class=\"row\"> <!--<div class=\"col-md-2 col-sm-2 col-xs-2 vcenter push-xs-2\">\n" +
    "      <img src=\"images/SKB.svg\" class=\"norssi-logo center-block img img-responsive\" />\n" +
    "    </div><!-- DO NOT REMOVE THIS COMMENT, IT IS A HACK\n" +
    " --><div class=\"col-xs-9 col-md-8 col-lg-9 vcenter push-xs-9\"> <div ng-include=\"'views/description.statistics.partial.html'\"></div> </div> <div class=\"col-md-3 pull-md-3 col-lg-2\"> <div ng-include=\"'views/facets.partial.html'\"></div> </div> <div class=\"col-md-9 col-lg-10\" min-height=\"500\"> <img class=\"loading-img\" src=\"images/loading-lg.gif\" ng-if=\"vm.isLoadingResults\"> <div id=\"chart_age\"></div> <div id=\"chart_marriageAge\"></div> <div id=\"chart_firstChildAge\"></div> <div id=\"chart_numberOfChildren\"></div> <div id=\"chart_numberOfSpouses\"></div> <!--\n" +
    "         <div id=\"chart_matriculationYear\"></div>\n" +
    "         <div id=\"chart_topschools\" style=\"width: 100%; height: 500px;\"></div>\n" +
    "         <div id=\"chart_toporganization\" style=\"width: 100%; height: 500px;\"></div>\n" +
    "         <div id=\"chart_topeducation\" style=\"width: 100%; height: 500px;\"></div>\n" +
    "          --> </div> </div> </div>"
  );

}]);
