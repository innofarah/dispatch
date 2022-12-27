type config = {
    "my-gateway": string,
    "my-web3.storage-api-token": string
}

type profile = {
    "name": string,
    "target": "local" | "cloud"
    "private-key": string,
    "public-key": string,
    "fingerprint": string
}

type cid = string

type ipldLink = { "/": cid }

//type ipfsLink = { "ipfs": cid }


type declarations = {
    "format": "declarations",
    "language": string,
    "content": ipldLink 
}

type formula = {  
    "format": "formula",
    "language": string,
    "content": ipldLink,
    "declarations": ipldLink
}

type namedFormula = {
    "format": "named-formula",
    "name": string,
    "formula": ipldLink
}

type sequent = {
    "format": "sequent",
    "lemmas": [ipldLink],
    "conclusion": ipldLink
}

type assertion = {
    "format": "assertion",
    "sequent": ipldLink,
    "agent": string,
    "signature": string
}

type sequence = {
    "format": "sequence",
    "name" : string,
    "assertions": [ipldLink]
}