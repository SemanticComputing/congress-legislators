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
                    name: 'Type of Congress',
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
})();
