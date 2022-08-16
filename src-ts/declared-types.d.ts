
type config = {
    "my-gateway": string,
    "my-web3.storage-api-token": string
}

type storage = "local" | "cloud"

type profile = {
    "name": string,
    "public-key": string,
    "private-key": string,
    "fingerprint": string
}

type cid = string

type ipfsLink = { "/": cid }

type asset = formula | sequent | sequence

type formula = {  
    "format": "asset",
    "assetType": "formula",
    "name": string,
    "formula": string,
    "sigma": [string]
}

type sequent = {
    "format": "asset",
    "assetType": "sequent",
    "lemmas": [ipfsLink],
    "conclusion": ipfsLink
}

type assertion = {
    "format": "assertion",
    "principal": string,
    "asset": ipfsLink,
    "signature": string
}

type sequence = {
    "format": "asset",
    "assetType": "sequence",
    "name" : string,
    "sequents": [ipfsLink]
    //"sequents": { [key: string]: ipfsLink }
}



/*type trustInfo = {
    "principalsToTrustList": Set<string>,
    "unverifiedAssertionsList": { [key: cid]: assertion },
    "verifiedAssertionsList": { [key: cid]: assertion },
    "unsignedObjectsList": { [key: cid]: asset },
}*/