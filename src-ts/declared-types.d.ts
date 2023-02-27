/* for local configuration */
//*************************//
type config = {
    "my-gateway": string,
    "my-web3.storage-api-token": string
}

type agentProfile = {
    "name": string,
    "private-key": string,
    "public-key": string,
    "fingerprint": string
}

type toolProfile = {
    "name": string,
    "tool": cid
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
type declarationLink = ipldLink
type formulaLink = ipldLink
type sequentLink = ipldLink
type toolLink = ipldLink
type productionLink = ipldLink
type assertionLink = ipldLink
type annotatedDeclarationLink = ipldLink
type annotatedFormulaLink = ipldLink
type annotatedSequentLink = ipldLink
type annotatedProductionLink = ipldLink
type globalTypeLink = declarationLink | formulaLink | sequentLink | productionLink | assertionLink
                        | annotatedDeclarationLink | annotatedFormulaLink 
                        | annotatedSequentLink | annotatedProductionLink
/****************************/
/* For Illustration Purposes */


/* Global Object Types */
/****************************/

/* Core Types */
type declaration = {
    "format": "declaration",
    "language": languageLink,
    "content": ipldLink
}

type formula = {
    "format": "formula",
    "language": languageLink,
    "content": ipldLink,
    "declarations": declarationLink[]
}

type sequent = {
    "format": "sequent",
    "dependencies": formulaLink[], // a lemma, is a dependency on some other formula; when to include it is specific to each publishing agent/tool: doesn't matter from the global view
    // means that "the provability (being able to reach) of conclusion depends on that of the lemmas"
    "conclusion": formulaLink
}

type tool = {
    "format": "tool",
    "content": ipldLink
}

// maybe also add "language" as a type later.

// having a sequent as a standalone object (instead of putting "lemmas" and "conclusion" here directly) has the benefit of it having a unique identifier for maybe other uses
// also, possible that several productions can refer to same sequent? 
// "tool" as an [input] -> output medium -- function, routine? :: cid not need to refer to an explicit tool identifying description (tool in the literal sense: software..), maybe other things as well?
// the "tool" could be empty ("none")(null) -> in such case, a production will denote a sequent directly: in case an agent want to assert something without specifying a tool
// having a tool identifier means: possible to decide whether to trust or not
type production = {
    "format": "production",
    "sequent": sequentLink,
    "tool": toolLink | null
}

// the meaning of an "assertion": a signed claim 
//--> the claim could be a "production" or ..
//--> case of "production": "I say (with confidence: It's up to you now to trust me or not) that I produced this sequent|product using this tool (where tool could be unspecified(none))"
//--> where "says" means: digitally signing by crypto key
type assertion = {
    "format": "assertion",
    "statement": productionLink | annotatedProductionLink // productionLink for now, claim is more general so more could be added later
    "agent": publicKey,
    "signature": digitalSignature
}

/* Core Types */


/* Annotated Object Types */
// atomic annotation objects
type annotatedDeclaration = {
    "format": "annotated-declaration",
    "declaration": declarationLink,
    "annotation": ipldLink
}

type annotatedFormula = {
    "format": "annotated-formula",
    "formula": formulaLink,
    "annotation": ipldLink
}

type annotatedSequent = {
    "format": "annotated-sequent",
    "sequent": sequentLink,
    "annotation": ipldLink
}

type annotatedProduction =  {
    "format": "annotated-production",
    "production": productionLink,
    "annotation": ipldLink
}

/*type annotation = {
    "format": "annotation",
    "content": ipldLink // sequent, formula, production, ..
    "annotation": ipldLink // {}
}*/

/* Annotated Object Types */


/* Collection Object Types */
// a general collection type: just refers to links of objects: ONE possible collection type; many can potentially be added
type collection = {
    "format": "collection",
    "name": string,
    "elements": globalTypeLink[]
}
// is a collection an "annotated" type by nature or not? 

// collection type of annotations could be added later, etc..

/****************************/
/* Global Object Types */
