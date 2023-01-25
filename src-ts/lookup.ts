const fs = require('fs')

import utilities = require("./utilities")
const { isSequent, isAssertion, isSequence,
    verifySignature, fingerPrint, inAllowList, ipfsGetObj, ensureFullDAG } = utilities

let resultUnits = {}


let getResult = async (cidFormula: string, assertionsList: {}) => {

    let result = []

    // for the formula itself
    result.push({"lemmas": [cidFormula], "agents": []}) //

    // if the formula exists in the file
    if (assertionsList[cidFormula]) {
        let desiredRecord = assertionsList[cidFormula]
        //console.log(desiredRecord)

        for (let assertion of desiredRecord) {
            let lemmas = assertion["lemmas"]
            for (let lemma of lemmas) {
                //console.log(lemma)
                // if not computed previously
                if (!resultUnits[lemma]) {
                    if (assertionsList[lemma]) { // if lemma exists in the file, compute and save its result
                        resultUnits[lemma] = await getResult(lemma, assertionsList)
                    }
                }
            }
            // after computing (if not previously done) the resultUnit for each lemma
            let combinations = await getAllCombinationsFrom(assertion)
            for (let combination of combinations) {
                // maybe here it's best for now to remove repetitions
                // in "lemmas" and "agents"
                result.push({"lemmas": [...new Set(combination["lemmas"])], 
                    "agents": [...new Set(combination["agents"])]}
                )
                //result.push(combination)
            }
        }
    }
    //return result
    return [...new Set(result)]
}

// A, B, C |- N,  |- N,  A |- N
let getAllCombinationsFrom = async (assertion: {}) => {
    // combination of 
    let combinations = [] // combination of form {"lemmas": [], "agents": []}

    let lemmas = assertion["lemmas"]
    let agent = assertion["agent"]

    // consider 2 initial cases: no lemmas -- one lemma:
    // no lemmas: we should return 
        // with combinations = [{"lemmas":[], "agents": [agent]}]
    if (lemmas.length == 0) return [{"lemmas":[], "agents": [agent]}]
    // one lemmas: we should return the resultUnits[lemma] as it is since one lemma, no combinations with other lemmas
    // but with adding the current agent? 
    else if (lemmas.length == 1) {
        //console.log("here " + lemmas[0])
        //console.log(resultUnits)
        if (resultUnits[lemmas[0]]) { 
            
            for (let unit of resultUnits[lemmas[0]]) {
                let agentsPlus = unit["agents"].concat([agent])
                //console.log(agentsPlus)
                let newUnit = {"lemmas":unit["lemmas"], "agents": agentsPlus}
                combinations.push(newUnit)
            }
            return combinations
        }
        else { // if the lemma didn't exist anywhere in the file
            return [{"lemmas":lemmas, "agents": [agent]}]
        }
    }


    // now if lemmas.length >= 2

    // if resultUnits[lemma] is undefined --> terminating case
    // if resultUnits[lemma] is contains the lemma itself -> terminating case
    let localResults = {}
    for (let lemma of lemmas) {
        if (resultUnits[lemma]) { // if defined; if the lemma existed in the searchset (in the file)
            localResults[lemma] = resultUnits[lemma]
        }
        // if resultUnits[lemma] is not defined, we need to only use the lemma (cidFormula) itself for combination
        else localResults[lemma] = [{"lemmas":[lemma], "agents":[]}]
        // but even if it's defined we also need to use it for combination (which was added in getResult)
    }

    // now we have localResults consisting of a list of combinations (records) per lemma

    // compute cartesian product for each 2 sets incrementally until reach end? 


    let keys = Object.keys(localResults)
    let tmp = localResults[keys[0]]
    for (let i = 1; i < keys.length; i++) {
        tmp = await getCartesian(tmp, localResults[keys[i]])
    }

    for (let unit of tmp) {
        combinations.push({"lemmas": unit["lemmas"], "agents":  unit["agents"].concat([agent])})
    }
    return combinations

}

let getCartesian = async (fst: [{"lemmas": [string], "agents": [string]}], snd: [{"lemmas": [string], "agents": [string]}]) => {

    let cartesian = []

    let lemmasFst, lemmasSnd, agentsFst, agentsSnd
    
    for (let unitFst of fst) {
        lemmasFst = unitFst["lemmas"]
        agentsFst = unitFst["agents"]
        for (let unitSnd of snd) {
            lemmasSnd = unitSnd["lemmas"]
            agentsSnd = unitSnd["agents"]
            cartesian.push(
                {"lemmas": lemmasFst.concat(lemmasSnd), "agents": agentsFst.concat(agentsSnd)}
            )
        }
    }
    // where should we add the current agent of the assertion?
    return cartesian
}

// expected filepath: of file assertion-list-for-lookup.json; this is considered to produced from assertioncidlist (do later)
// assuming that the assertions existing in this file have their signatures verified previously.
let lookup = async (cidFormula: string, filepath: string) => {

    let assertionsListJSON = JSON.parse(fs.readFileSync(filepath))

    let result = await getResult(cidFormula, assertionsListJSON)
    //return result
    console.log(result)
}

export = { lookup }

