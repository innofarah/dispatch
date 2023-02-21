/* for local configuration */
//*************************//
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
//*************************//
/* for local configuration */


type target = "local" | "cloud" // to be an argument for the `publish` command --> `dispatch publish /file.json target`

// MAYBE IPLD Schemas would be useful for this specification later -- 

/* For Illustration Purposes */
/****************************/
type cid = string
type ipldLink = { "/": cid }
type publicKey = string
type digitalSignature = string
type languageLink = ipldLink
type rawDeclarationLink = ipldLink
type namedDeclarationLink = ipldLink
type declarationLink = rawDeclarationLink | namedDeclarationLink
type rawFormulaLink = ipldLink
type namedFormulaLink = ipldLink
type formulaLink = rawFormulaLink | namedFormulaLink
type sequentLink = ipldLink
type toolLink = ipldLink
type productionLink = ipldLink
type claimLink = productionLink
type assertionLink = ipldLink
/****************************/
/* For Illustration Purposes */


/* Global Object Types */
/****************************/
type rawDeclaration = {
    "format": "declaration",
    "language": languageLink,
    "content": ipldLink
}

type namedDeclaration = { // originally (locally) possibly given name as meta-data (the global name is the cid) - maybe remove it later from being a single attribute if we include a more general "meta-data" field
    "format": "named-declaration",
    "language": languageLink,
    "name": string,
    "content": ipldLink
}

type declaration = rawDeclaration | namedDeclaration

type rawFormula = {
    "format": "formula",
    "language": languageLink,
    "content": ipldLink,
    "declarations": [declarationLink]
}

type namedFormula = { // originally (locally) possibly given name as meta-data (the global name is the cid)
    "format": "named-formula",
    "name": string,
    "formula": rawFormula
}

type formula = rawFormula | namedFormula

type sequent = {
    "format": "sequent",
    "lemmas": [formulaLink], // a lemma, is a dependency on some other formula; when to include it is specific to each publishing agent/tool: doesn't matter from the global view
    // means that "the provability (being able to reach) of conclusion depends on that of the lemmas"
    "conclusion": formulaLink
}

// having a sequent as a standalone object (instead of putting "lemmas" and "conclusion" here directly) has the benefit of it having a unique identifier for maybe other uses
// also, possible that several productions can refer to same sequent? 
// "tool" as an [input] -> output medium -- function, routine? :: cid not need to refer to an explicit tool identifying description (tool in the literal sense: software..), maybe other things as well?
// the "tool" could be empty ("none") -> in such case, a production will denote a sequent directly: in case an agent want to assert something without specifying a tool
// having a tool identifier means: possible to decide whether to trust or not
type production = {
    "format": "production",
    "sequent": sequentLink,
    "tool": toolLink | "none"
}

// the meaning of an "assertion": a signed claim 
//--> the claim could be a "production" or ..
//--> case of "production": "I say (with confidence: It's up to you now to trust me or not) that I produced this sequent|product using this tool (where tool could be unspecified(none))"
//--> where "says" means: digitally signing by crypto key
type assertion = {
    "format": "assertion",
    "claim": productionLink
    "agent": publicKey,
    "signature": digitalSignature
}

// a sequence of assertions(assertionProduction): ONE possible collection type; many can potentially be added
type sequence = {
    "format": "sequence",
    "name": string,
    "assertions": [assertionProductionLink]
}
/****************************/
/* Global Object Types */