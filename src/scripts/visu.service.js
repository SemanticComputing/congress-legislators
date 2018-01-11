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
})();
