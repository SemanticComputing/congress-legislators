'''
Created on 5.1.2018
# coding: utf-8
@author: petrileskinen
'''

import re
import codecs
import csv
from urllib.parse import quote


def main():
    infilename = "../csv/legislators-current.csv"
    num_uri = 1
    
    
    writeRDF(infilename,
            './template.ttl',
            num_uri,
            '../ttl/legislators-current.ttl')
    
    


def writeRDF(infilename, templatefilename, num_uri, outfilename):
    
    
    templatefile=codecs.open(templatefilename, encoding='utf-8', mode='r') 
    template=templatefile.read()+'\n'
    prefixes=re.findall(r'@prefix.*(?=\n)', template, re.IGNORECASE)
    template=re.sub(r'@prefix.*\n','',template)
    templatefields=re.findall(r'[{]([^}]+)[}]',template)
    
    template=re.sub(r'[{]([^}]+)[}]','{row[\g<1>]}',template)
    
    csvfile=codecs.open(infilename, encoding='utf-8', mode='r')
    
    reader = csv.DictReader(csvfile, delimiter=',')
    
    fields=reader.fieldnames
    
    for f in templatefields:
        if not f in fields: fields.append(f)
    
    outfile = codecs.open(outfilename, encoding='utf-8', mode='w')
    for f in prefixes:
        outfile.write('{}\n'.format(f))
        
    count = 0
    occupations = {}
    
    for row in reader:
        
        
        if num_uri: 
            row['uri'] = str(num_uri)
            num_uri += 1
        if not 'puri' in row or row['puri']==None or row['puri']=="":
            row['puri'] = quote(str(row['uri']))
        
        for x in fields:
            if x in row and row[x]!=None and row[x]!='':
                row[x] = row[x].strip()
        
        if "gender" in row:
            y = row["gender"]
            if y =="F": row["gender"] = "schema:Female"
            if y =="M": row["gender"] = "schema:Male"
            # todo 'suku', 'pariskunta'
        
        
        
        for f in fields:
            if row[f]==None or row[f].strip()=="": row[f]="0qqq0"
        
        # print(row[fields[0]],row[fields[1]])
        print(row)
        entry=template.format(row=row)
        entry=re.sub(r'\n.*0qqq0.*(?=\n)','',entry).rstrip()
        entry=entry[:-1]+".\n"
        
        outfile.write('{}\n'.format(entry))
        
        count+=1
        # if count>500: break
    
    csvfile.close()
    
    outfile.close()
    print('{} rdf entries saved to file {}'.format(count,outfilename))
    
    
    
    return 

def quoteOccupations(txt):
    arr=[x.strip().strip('"') for x in txt.split(',')]
    arr2=['occupations:'+quote(x).lower() for x in arr]
    return (arr, arr2)


def extractFromMainTitle(txt):
    m = re.match(r'([^,]+),\s+([^(]+)\s+([^)]+)',txt)
    if m!=None:
        etun = m.group(2).strip()
        sukun = m.group(1).strip()
        #    van, von, af etc:
        m = re.match(r'(.+?)\s+([a-zöäå]{,4})$', etun)
        if m:
            etun = m.group(1)
            sukun = m.group(2)+ ' '+sukun
            # print(m.group(2))
        return (sukun, etun)
    else:
        m = re.match(r'([^(]+)[(]([^)]+)',txt)
        if m!=None:
            return ('',m.group(1).strip())
    return ('',txt.strip())

def getBirthInfo(txt):
    if txt:
        m=re.findall(r'.*? S (.+?)[.,](\s*K |\s*V |\s*P |\s*P1 |\s*Lapsi|\s*Lapset|$)',txt)
        if m != None and len(m)>0:
            return m[0][0]
    return None

def getDeathInfo(txt):
    if txt:
        txt=re.split(r' V | P\d | PV ',txt)[0]
        m=re.findall(r'.*? K (.+?)[.,](\s*V |\s*P |\s*P1 |\s*Lapsi|\s*Lapset|$)',txt)
        if m != None and len(m)>0:
            return m[0][0]
    return None

main()
