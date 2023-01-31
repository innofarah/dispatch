type config = {
    "my-gateway": string,
    "my-web3.storage-api-token": string
}

type profile = {
    "name": string,
    "private-key": string,
    "public-key": string,
    "fingerprint": string
}

type cid = string

type ipldLink = { "/": cid }

type target = "local" | "cloud" // to be an argument for the `publish` command --> `dispatch publish /file.json target`

//type ipfsLink = { "ipfs": cid }


type declaration = {
    "format": "declaration",
    "language": string,
    "content": ipldLink 
}

type formula = {  
    "format": "formula",
    "language": string,
    "content": ipldLink,
    "declaration": ipldLink
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

/*type sequent = {
    "format": "sequent",
    "lemmas": [ipldLink],
    "conclusion": ipldLink,
    "evidence": ipldLink | ""
}

type evidence = {
    "format": "evidence",
    "language": string,
    "content": ipldLink
}*/

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