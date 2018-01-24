cat ttl/people/*.ttl > seco-store/people.ttl
cat ttl/places/*.ttl > seco-store/places.ttl
scp seco-store/*.ttl ptleskin@seco-store.tml.hut.fi:Congress
ssh ptleskin@seco-store.tml.hut.fi
