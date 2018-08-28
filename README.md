# Congress Legislators

The repository contains the Congress Legislators data as Linked Data and U.S. Congress Prosopographer for exploring the data.

## Publishing the Linked Data in a Fuseki Docker container

Build: `docker build -t congress-fuseki .`

Run: `docker run --rm -it -p 3030:3030 --name congress-fuseki congress-fuseki`