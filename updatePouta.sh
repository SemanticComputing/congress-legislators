cat ttl/people/*.ttl > congress_ttl/people.ttl
cat ttl/places/*.ttl > congress_ttl/places.ttl
scp congress_ttl/*.ttl 193.166.25.181:congress_ttl
scp update_congress_ttl.sh 193.166.25.181:congress_ttl
ssh 193.166.25.181
# on the remote server, run command bash congress_ttl/update_congress_ttl.sh