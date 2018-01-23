'''
Created on 12 Jan 2018
# coding: utf-8
@author: ptleskin
'''
import codecs
import csv
import json
import re
import urllib.parse
import urllib.request

outfilename = "../ttl/extractsFromDBpedia.ttl"

PREFICES =  ['@prefix schema: <http://schema.org/> .',
           '@prefix : <http://ldf.fi/congress/> .',
           '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
           '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .']


def main():
    arr =  PREFICES + ['']
    outfile = codecs.open(outfilename, encoding='utf-8', mode='wb')
    
    data = getWikipediaIds()
    # data = [{'id': 'http://ldf.fi/congress/p0000', 'wikipedia_id': 'James Soloman Biery'}]
    
    for entry in data:
        res = makeDBpediaQuery(entry['wikipedia_id'])
        if res!=None and len(res)>0:
            entry = {**entry, **res[0]}
            entry_id = entry['id'].replace('http://ldf.fi/congress/',':')
            
            if 'dbpedia_id' in entry:
                arr.append('{} \t{} \t<{}> .'.format(
                        entry_id,
                        ':dbpedia_id',
                        entry['dbpedia_id']))
                
            if 'description' in entry:
                arr.append('{} \t{} \t"""{} """ .'.format(
                        entry_id,
                        'schema:description',
                        entry['description']))
            
            if 'comment' in entry:
                arr.append('{} \t{} \t"""{} """ .'.format(
                        entry_id,
                        'rdfs:comment',
                        entry['comment']))
            
            #    values of children can either be an integer "3" or a string "Mary"
            '''
            if 'children' in entry:
                arr.append('{} \t{} \t"{}"^^xsd:integer .'.format(
                        entry_id,
                        ':children',
                        entry['children']))
            '''    
            arr.append('')
        
        if len(arr)>1:
            for x in arr:
                outfile.write("{}\n".format(x))
        arr = []
    
    outfile.close()
    print("Results written to {}".format(outfilename))  
    
    
def getWikipediaIds():
    #    get all the resources with property wikipedia_id
    endpoint="http://ldf.fi/congress/sparql"
    query = """
PREFIX schema: <http://schema.org/>
PREFIX : <http://ldf.fi/congress/> 

SELECT * WHERE {
  ?id a schema:Person ; 
      :wikipedia_id ?wikipedia_id .
} 
"""
    res = makeSparqlQuery(query, endpoint)
    return res


def makeDBpediaQuery(uri):
    endpoint="http://dbpedia.org/sparql"
    uri = urllib.parse.quote(uri.replace(' ','_'))
    
    dbpedia_id = "http://dbpedia.org/resource/{}".format(uri)
    
    #    example of a query: http://yasgui.org/short/BJfr7iNrM
    query = """
PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbp: <http://dbpedia.org/property/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT * where {
  values ?dbpedia_id { <"""+dbpedia_id+"""> }
  
  OPTIONAL { ?dbpedia_id dbo:abstract ?description . FILTER (lang(?description)='en')}
  OPTIONAL { ?dbpedia_id dbp:children ?children }
  OPTIONAL { ?dbpedia_id rdfs:comment ?comment . FILTER (lang(?comment)='en') }
}    """
    
    res = makeSparqlQuery(query, endpoint)
    return res


    
def makeSparqlQuery(query, endpoint):
    
    urldata= endpoint+ '?'+ urllib.parse.urlencode({'query': query, 'format':"json" })
    
    req = urllib.request.Request(urldata)
    
    try:
        response = urllib.request.urlopen(req)
        r = response.read()
        
        cont = json.loads(r.decode('utf-8'))
        fields = cont['head']['vars']
        #print(fields)
        bind = cont['results']['bindings']
        #print(bind)
        res = []
        for x in bind:
            row = {}
            for f in fields:
                if f in x and 'value' in x[f] and x[f]['value'] != "":
                    row[f] = x[f]['value']
            res.append(row)
        return  res
    except Exception as e:
        print(e)
        print("Error with query\n{}".format(query))
        
    return []



if __name__ == '__main__':
    main()