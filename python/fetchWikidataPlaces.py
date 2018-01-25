'''
Created on 24 Jan 2018
# coding: utf-8
@author: ptleskin
'''
import codecs
import csv
import json
import re
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError

outfilename = "../ttl/places/places.ttl"

def main():
    
    query = """PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX skosxl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX xml: <http://www.w3.org/XML/1998/namespace>
PREFIX : <http://ldf.fi/congress/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX geo:   <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX wd_ent: <http://www.wikidata.org/entity/>

CONSTRUCT {
  ?place a schema:Place ;
    schema:containedInPlace ?region ;
    rdfs:label ?label ;
    geo:lat ?lat ;
    geo:long ?long .
}
WHERE {
  { SELECT DISTINCT * WHERE { ?id :wikidata ?sub . } }
  SERVICE <https://query.wikidata.org/sparql> {
    SELECT * WHERE {
      ?sub wdt:P19|wdt:P20|(wdt:P19/wdt:P131)|(wdt:P19/wdt:P131/wdt:P131)|(wdt:P20/wdt:P131)|(wdt:P20/wdt:P131/wdt:P131) ?place .
      ?place rdfs:label ?label . FILTER (lang(?label)='en')
    OPTIONAL { ?place wdt:P625 ?coords .
        BIND (replace(str(?coords), '[a-zA-Z()]', '') AS ?coords2)
      BIND (xsd:decimal(STRBEFORE(?coords2,' ')) AS ?long)
      BIND (xsd:decimal(STRAFTER(?coords2,' ')) AS ?lat)
      }
      OPTIONAL { ?place wdt:P131 ?region . OPTIONAL { ?region rdfs:label ?rlabel . FILTER (lang(?rlabel)='en') } }
      }
  }
}"""
    # endpoint = "http://ldf.fi/congress/sparql"
    endpoint = "http://localhost:3030/ds/query"
    
    arr = makeSparqlConstruct(query, endpoint).decode("utf-8")
    
    if arr=="": 
        print('Construct failed')
        return
    
    outfile = codecs.open(outfilename, encoding='utf-8', mode='wb')
    
    outfile.write(str(arr))
    outfile.close()
    print("Results written to {}".format(outfilename)) 


def makeSparqlConstruct(query, endpoint, retry=False):
    
    urldata= endpoint+ \
            '?'+ \
            urllib.parse.urlencode({'query': query, 'format':"text" })
    
    req = urllib.request.Request(urldata)
        
    try:
        response = urllib.request.urlopen(req)
        r = response.read()
        return  r
    
    except HTTPError as e:
        print('urllib.error.HTTPError: HTTP Error 503: Service Unavailable')
        if retry==False:
            time.sleep(2)
            return makeSparqlConstruct(query, endpoint, True)
        
    except Exception as e:
        # KeyError: no result
        raise e
    
    return b""

if __name__ == '__main__':
    main()
