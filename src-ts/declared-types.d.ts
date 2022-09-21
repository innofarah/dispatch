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

type formula = {  
    "format": "formula",
    "formula": string,
    "Sigma": [string]
}

type namedFormula = {
    "format": "named-formula",
    "name": string,
    "formula": ipfsLink
}

type sequent = {
    "format": "sequent",
    "lemmas": [ipfsLink],
    "conclusion": ipfsLink
}

type assertion = {
    "format": "assertion",
    "agent": string,
    "sequent": ipfsLink,
    "signature": string
}

type sequence = {
    "format": "sequence",
    "name" : string,
    "sequents": [ipfsLink]
}