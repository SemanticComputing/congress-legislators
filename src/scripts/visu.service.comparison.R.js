(function() {

    'use strict';

    /* eslint-disable angular/no-service-method */
    angular.module('facetApp')

    .service('visucomserviceR', visucomserviceR);

    /* @ngInject */
    function visucomserviceR($q, $location, _, FacetResultHandler, SPARQL_ENDPOINT_URL,
            AdvancedSparqlService, personMapperService, numericFacetMapperService) {

        /* Public API */

        // Get the results based on facet selections.
        // Return a promise.
        this.getResults = getResults;
        this.getResults1 = getResults1;
        this.getResultsPage1 = getResultsPage1;
        this.getResultsRecord =  getResultsRecord;
        this.getResultsServe =  getResultsServe;
        this.getResultsBelong =  getResultsBelong;
      //  this.getCommitteeMember =  getCommitteeMember;

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
                graph: '<http://ldf.fi/congress/people>',
                name: 'Search',
                enabled: true
            },
            slider: {
                facetId: 'slider',
                name: 'Timeline: 33th (1854) - 115th (2018) Congresses',
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
                name: 'Gender',
                chart: true
            },
            occupation: {
                facetId: 'occupation',
                predicate: '<http://schema.org/hasOccupation>',
                name: 'Occupation',
                chart: true
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
                name: 'Republican Party',
                chart: true,
                enabled: true
            },
            type: {
                facetId: 'type',
                predicate: '<http://ldf.fi/congress/type>',
                name: 'Chamber',
                chart: true,
                enabled: true
            },
            congress_number: {
                facetId: 'congress_number',
                predicate: '<http://ldf.fi/congress/icpsr_id>/^<http://ldf.fi/congress/icpsr_id>/<http://ldf.fi/congress/congress_number>',
                name: 'Number per Congress',
                chart: true,
                mapper: numericFacetMapperService
            }
        };


        //	TODO: query for a certain title, here "maisteri": http://yasgui.org/short/SJbyBeseM
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


        // The query for the results.
        // ?id is bound to the person URI.
        var query = prefixes +
        ' SELECT DISTINCT ?id ?occupation ?type ?memberOf ?place ?committee ' +
        ' WHERE{ ' +
        '  { <RESULT_SET> } ' +
        ' {VALUES (?evt_place ?evt_time ?class) ' +
        ' { (schema:birthPlace schema:birthDate "Birth"@en) } ' +
        ' ?id a schema:Person; ' +
        ' ?evt_place ?place__uri. ' +
        ' ?place__uri rdfs:label ?place__label. ' +
        ' BIND(?place__label AS ?place).} ' +
        ' UNION ' +
        ' {  ?id congress:bioguide_id ?committee__id . ' +
        ' ?mship congress:bioguide_id ?committee__id ; ' +
        ' congress:committee ?committee__label. ' +
        ' FILTER regex(str(?id), "/p") . ' +
        ' ?mship congress:committee/^skos:altLabel/skos:prefLabel ?prefLabel. ' +
        ' BIND (CONCAT( str(?prefLabel)," (", str(?committee__label),")") AS ?committee). ' +
        ' } ' +
        ' UNION  { ' +
        ' ?id congress:type ?type;' +
        ' schema:memberOf ?memberOf.' +
        ' } ' +
        ' UNION  { ' +
        ' ?id schema:hasOccupation ?occupation. ' +
        ' } ' +
        ' } ' +
        ' GROUP BY ?id ?occupation ?type ?memberOf ?place ?committee ' ;

        var queryResultsRecord = prefixes +
        ' SELECT DISTINCT (?id AS ?id__uri) ?id__name ?value ' +
        ' WHERE{ ' +
        '  { <RESULT_SET> } ' +
        ' OPTIONAL { ?id schema:familyName ?familyName . } ' +
        ' OPTIONAL { ?id schema:givenName ?givenName . } ' +
        ' BIND (CONCAT(?givenName, " ",?familyName) AS ?id__name) ' +
        ' ?id schema:birthDate ?birthDate; ' +
        ' schema:deathDate ?deathDate. ' +
        ' BIND (xsd:integer(year(?deathDate)-year(?birthDate)) AS ?value)  ' +
        ' FILTER (0<?value && ?value<121) ' +
        ' } ORDER BY ?value ?familyName ?givenName ';

        var queryResultsServe = prefixes +
        ' SELECT DISTINCT (?id AS ?id__uri) ?id__name (count (DISTINCT ?congress_number) as ?value)  ' +
        ' WHERE{ ' +
        '  { <RESULT_SET> } ' +
        ' ?id congress:icpsr_id/^congress:icpsr_id/congress:congress_number ?congress_number . ' +
        ' ?id schema:familyName ?familyName .  ' +
        ' ?id schema:givenName ?givenName .  ' +
        ' BIND (CONCAT(?givenName, " ",?familyName) AS ?id__name)  ' +
        ' }  ' +
        ' GROUP BY ?value ?id__name ?id' +
        ' HAVING (0<?value && ?value < 31) ';

        var queryResultsBelong = prefixes +
        ' SELECT DISTINCT ?type ?memberOf (count (?memberOf) as ?count)' +
        ' WHERE {' +
        ' ?id congress:type ?type;' +
        ' schema:memberOf ?memberOf.' +
        ' } ' +
        ' GROUP BY ?type ?memberOf ?count';

/*
        var queryCommitteeMember = prefixes +
        ' SELECT DISTINCT (?id AS ?id__uri) ?id__name ?value ' +
        ' WHERE{ ' +
        '  { <RESULT_SET> } '
        ' id schema:familyName ?familyName . ' +
        ' ?id schema:givenName ?givenName . ' +
        ' BIND (CONCAT(?givenName, " ",?familyName) AS ?id__name) ' +
        ' ?id congress:bioguide_id ?committee__id . ' +
        ' ?mship congress:bioguide_id ?committee__id ; ' +
        ' congress:committee ?committee__label. ' +
        ' ?congress skos:prefLabel ?prefLabel; ' +
        ' skos:altLabel ?altLabel. ' +
        ' FILTER (str(?altLabel) = str(?committee__label)). ' +
        ' BIND (CONCAT(?altLabel, " (",?prefLabel,")") AS ?value) ' +
        ' }  ';
        */

        // The SPARQL endpoint URL
        var endpointUrl = SPARQL_ENDPOINT_URL;

        var facetOptions = {
          endpointUrl: endpointUrl,
          rdfClass: '<http://schema.org/Person>',
          preferredLang : 'en',
          constraint: '?id <http://ldf.fi/congress/icpsr_id>/^<http://ldf.fi/congress/icpsr_id>/<http://ldf.fi/congress/congress_number> ?congress_number . ?id <http://schema.org/memberOf> ?memberOf . FILTER (?memberOf="Republican"^^xsd:string) FILTER (32<?congress_number) ',
        };

        var endpoint = new AdvancedSparqlService(endpointUrl, personMapperService);


        function getResults1(facetSelections) {
        	var q = query.replace("<RESULT_SET>", facetSelections.constraint.join(' '));
        	return endpoint.getObjectsNoGrouping(q);
        }

        function getResultsRecord(facetSelections) {
          var cons = facetSelections.constraint.join(' '),
          q = queryResultsRecord.replace("<RESULT_SET>", cons);
          return endpoint.getObjectsNoGrouping(q) ;
        }

        function getResultsServe(facetSelections) {
          var cons = facetSelections.constraint.join(' '),
          q = queryResultsServe.replace("<RESULT_SET>", cons);
          return endpoint.getObjectsNoGrouping(q) ;
        }

        function getResultsBelong(facetSelections) {
          var cons = facetSelections.constraint.join(' '),
          q = queryResultsBelong.replace("<RESULT_SET>", cons);
          return endpoint.getObjectsNoGrouping(q) ;
        }

/*        function getCommitteeMember(facetSelections) {
          var cons = facetSelections.constraint.join(' '),
          q = queryCommitteeMember.replace("<RESULT_SET>", cons);
          return endpoint.getObjectsNoGrouping(q) ;
        } */

        function getResults(facetSelections) {
        	var promises = [
            	this.getResults1(facetSelections),
              this.getResultsRecord(facetSelections),
              this.getResultsServe(facetSelections),
              this.getResultsBelong(facetSelections)
          //   this.getCommitteeMember(facetSelections)
            ];
        	return $q.all(promises);
        }

        function getResultsPage1(facetSelections) {
        	var promises = [
            	this.getResults1(facetSelections)
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
})();
