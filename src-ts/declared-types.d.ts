/*
 * Copyright (C) 2023  Inria
 *
 * Inria: Institut National de Recherche en Informatique et en Automatique
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * A copy of the license is provided in the file "LICENSE" distributed
 * with this file. You may also obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
type contextLink = ipldLink
type formulaLink = ipldLink
type sequentLink = ipldLink
type toolLink = ipldLink
type productionLink = ipldLink
type assertionLink = ipldLink
type annotatedContextLink = ipldLink
type annotatedFormulaLink = ipldLink
type annotatedSequentLink = ipldLink
type annotatedProductionLink = ipldLink
type globalTypeLink = contextLink | formulaLink | sequentLink | productionLink | assertionLink
                        | annotatedContextLink | annotatedFormulaLink 
                        | annotatedSequentLink | annotatedProductionLink
/****************************/
/* For Illustration Purposes */


/* Global Object Types */
/****************************/

/* Core Types */

// --> maybe add more structure to it later
type language = {
    "format": "language",
    "content": ipldLink
}

type context = {
    "format": "context",
    "language": languageLink,
    "content": ipldLink
}

type formula = {
    "format": "formula",
    "language": languageLink,
    "content": ipldLink,
    "context": contextLink[]
}

type sequent = {
    "format": "sequent",
    "dependencies": formulaLink[], // a lemma, is a dependency on some other formula; when to include it is specific to each publishing agent/mode: doesn't matter from the global view
    // means that "the provability (being able to reach) of conclusion depends on that of the lemmas"
    "conclusion": formulaLink
}

type tool = {
    "format": "tool",
    "content": ipldLink
}

// having a sequent as a standalone object (instead of putting "lemmas" and "conclusion" here directly) has the benefit of it having a unique identifier for maybe other uses
// also, possible that several productions can refer to same sequent? 
// "mode"/tool as an [input] -> output medium -- function, routine? :: cid not need to refer to an explicit tool identifying description (tool in the literal sense: software..), maybe other things as well?
// the "mode" could be empty ("none")(null) -> in such case, a production will denote a sequent directly: in case an agent want to assert something without specifying a mode
// for now, we say that "mode" could be null, "axiom", "conjecture", or toolLink. However, this is extensible
// having a tool identifier means: possible to decide whether to trust or not
type production = {
    "format": "production",
    "sequent": sequentLink,
    "mode": toolLink | null | "axiom" | "conjecture"
}

// the meaning of an "assertion": a signed claim 
//--> the claim could be a "production" or ..
//--> case of "production": "I say (with confidence: It's up to you now to trust me or not) that I produced this sequent|product in this mode (where mode could be unspecified(none))"
//--> where "says" means: digitally signing by crypto key
type assertion = {
    "format": "assertion",
    "claim": productionLink | annotatedProductionLink // productionLink for now, claim is more general so more could be added later
    "agent": publicKey,
    "signature": digitalSignature
}

/* Core Types */


/* Annotated Object Types */
// atomic annotation objects
type annotatedContext = {
    "format": "annotated-context",
    "context": contextLink,
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
