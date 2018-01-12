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

outfilename = "../ttl/extractsFromWikidata.ttl"

def main():
    
    arr = getCongressWikilinks()
    res = """@prefix schema: <http://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix : <http://ldf.fi/congress/> .

"""
    count = 0
    for uri, entity in arr:
        res += '<{}>\t :wikidata\t <http://www.wikidata.org/entity/{}> .\n'.format(uri, entity)
        
        wfields = getWikidataFields(entity)
        S = set()
        for field in wfields:
            for prop in field:
                S.add((prop, field[prop]))
        
        for prop, val in S:
            if prop == 'deathDate':
                res += '<{}>\t schema:{}\t "{}"^^xsd:date .\n'.format(uri, prop, val)
            else:
                res += '<{}>\t schema:{}\t "{}" .\n'.format(uri, prop, val)
                
        count += 1
        if count%20==0:
            print("Processing {}".format(count))
    
    outfile = codecs.open(outfilename, encoding='utf-8', mode='wb')
    #for row in arr:
    outfile.write(str(res))
    outfile.close()
    print("Results written to {}".format(outfilename))  
    return


def getCongressWikilinks():
    query = """
PREFIX schema: <http://schema.org/>  
PREFIX congress: <http://ldf.fi/congress/>  

SELECT DISTINCT * WHERE {
  ?id a schema:Person ;
      congress:wikipedia_id ?wiki_id .
  BIND (concat('https://en.wikipedia.org/wiki/', replace(?wiki_id, ' ','_')) AS ?wikipedia)
} LIMIT 250
    """
    endpoint = "http://ldf.fi/congress/sparql"
    res=makeSparqlQuery(query, endpoint)
    arr=[]
    for r in res:
        if 'wikipedia' in r:
            wikilink = r['wikipedia']
            html = getWikipage(wikilink)
            # print(html)
            wikidatas = re.findall(r'"https://www.wikidata.*?(Q\d+)',html)
            for w in wikidatas:
                arr.append((r['id'], w))
    return arr
    

def getWikidataFields(entity):
    query = """PREFIX entity: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?image ?birthPlace ?deathPlace ?deathDate ?hasOccupation WHERE {
  VALUES ?sub { entity:"""+entity+""" }
  OPTIONAL { ?sub wdt:P18 ?image ;  }
  OPTIONAL { ?sub wdt:P19/rdfs:label ?birthPlace . FILTER (lang(?birthPlace)='en') }
  OPTIONAL { ?sub wdt:P20/rdfs:label ?deathPlace . FILTER (lang(?deathPlace)='en') }
  OPTIONAL { ?sub wdt:P570 ?deathTime . BIND(xsd:date(?deathTime) AS ?deathDate) }
  OPTIONAL { ?sub wdt:P106/rdfs:label ?hasOccupation . FILTER (lang(?hasOccupation)='en')}
} """
    arr=makeSparqlQuery(query, "https://query.wikidata.org/sparql")
    return arr

def getWikipage(wikilink):
    html=b""
    url = wikilink
    # url = 'http://example.com/unicodè'
    url = urllib.parse.urlsplit(url)
    url = list(url)
    url[2] = urllib.parse.quote(url[2])
    wikilink = urllib.parse.urlunsplit(url)
    
    try:
        response = urllib.request.urlopen(wikilink)
        html = response.read()
    except UnicodeEncodeError as e:
        print("Link {}".format(wikilink))
        print(html)
        pass
    except Exception as e:
        print("Link {}".format(wikilink))
        print(e)
    return html.decode("utf-8") 
        
    
def makeSparqlQuery(query, endpoint):
    
    urldata= endpoint+ \
            '?'+ \
            urllib.parse.urlencode({'query': query, 'format':"json" })
    
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
        # KeyError: no result
        raise e
    return []




if __name__ == '__main__':
    main()