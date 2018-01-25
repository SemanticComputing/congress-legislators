(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('nbfService', nbfService);

    /* @ngInject */
    function nbfService($q, $location, _, FacetResultHandler, SPARQL_ENDPOINT_URL,
            AdvancedSparqlService, personMapperService) {

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
                name: 'Gender',
                enabled: true 
            },
            occupation: {
                facetId: 'occupation',
                predicate: '<http://schema.org/hasOccupation>',
                name: 'Occupation',
                enabled: true
            },
           state: {
                facetId: 'state',
                predicate: '<http://schema.org/state>',
                name: 'State',
                enabled: true
            },
            memberOf: {
                facetId: 'memberOf',
                predicate: '<http://schema.org/memberOf>',
                name: 'Political Party',
                enabled: true
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
        ' PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ';
        
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
        ' }';
        
        //	the query for single person pages, e.g. http://localhost:9000/#!/http:~2F~2Fldf.fi~2Fcongress~2Fp1045
        var detailQuery =
            'SELECT DISTINCT * WHERE {' +
            '  { ' +
            '    <RESULT_SET> ' +
            '  } ' +
            '  	OPTIONAL { ?id schema:familyName ?familyName . }' +
            '  OPTIONAL { ?id schema:givenName ?givenName . } 	' +
            '  	OPTIONAL { ?id schema:description ?description . }' +
            '  OPTIONAL { ?id schema:birthDate ?birthDate . }   ' +
            '  OPTIONAL { ?id schema:birthPlace/rdfs:label ?birthPlace . }   ' +
            '  OPTIONAL { ?id schema:deathDate ?deathDate . }   ' +
            '  OPTIONAL { ?id schema:deathPlace/rdfs:label ?deathPlace . }   ' +
            '  OPTIONAL { ?id congress:wikipedia_id ?wikipedia . }  	' +
            '  OPTIONAL { ?id congress:wikidata ?wikidata . }  	' +
            '   OPTIONAL { ?id congress:dbpedia_id ?dbpedia . }' +
            '   OPTIONAL { ?id congress:twitter ?twitter . }' +
            '  OPTIONAL { ?id schema:gender ?gender . }' +
            '  	OPTIONAL { ?id schema:image ?images . }' +
            '	OPTIONAL { ?id schema:hasOccupation ?occupation . }' +
            '  OPTIONAL { ?id congress:bioguide_id ?committee__id .' +
            '    	?mship congress:bioguide_id ?committee__id ;' +
            '            congress:committee ?committee__label ;' +
            '            schema:memberOf ?committee__memberOf .' +
            '  }' +
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
            var cls = numeric ? 'glyphicon-sort-by-order' : 'glyphicon-sort-by-alphabet';

            if (sort === sortBy) {
                if ($location.search().desc) {
                    return cls + '-alt';
                }
                return cls;
            }
        }
    }
})();
