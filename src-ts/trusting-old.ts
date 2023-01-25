const fs = require('fs')

import utilities = require("./utilities")
const { isSequent, isAssertion, isSequence,
    verifySignature, fingerPrint, inAllowList, ipfsGetObj, ensureFullDAG } = utilities

//NO returns {"axioms": [], "saysStatements": []}
// returns list of seq([lemmas], conclusion) statements; cids of "formula" objects
// - changed !!!! change to include cids of "formulas" not "named-formulas", let's say for now as the most basic equality checking mechanism between formulas
let filterByAllowList = async (fileName: string) => {
    try {
        // expected: [cid1, cid2, ....]
        let input = JSON.parse(fs.readFileSync(fileName))
        // first produce the list of statements for K (the executing user) if the agent is in K's allow list 
        // let's say now that K is considered an arbitrary name for the executing user (no explicit signing, just says-statements for local usage)
        // check later if we should produce the list for all agents (whether in allow list or not) and then do the deduction with giving who-to-trust instead of just if trusted (........)
        //let axioms = []
        let statements = []

        for (let cid of input) {
            await ensureFullDAG(cid)
            let obj = await ipfsGetObj(cid)
            //if (!(isAssertion(obj) || isSequent(obj) || isSequence(obj)))
            if (!(isAssertion(obj) || isSequence(obj)))
                throw new Error("a cid " + cid + " in the input refers to an unaccepted object format")

            // if expected format:
            //else if (obj["format"] == "sequent") {
             //   axioms.push(cid)
            //}
            else if (obj["format"] == "assertion") {
                if (!verifySignature(obj))
                    throw new Error("The signature of + " + cid + "is invalid!") // change the place of this (not necessary to check if agent isn't inallowlist in the first place)

                // else, if signature is valid
                if (inAllowList(fingerPrint(obj["agent"]))) {
                    let sequent = await ipfsGetObj(obj["sequent"]["/"])

                    let statement = "seq("
                    let lemmasCids = [] // formula, not named-formula
                    for (let lemmaLink of sequent["lemmas"]) {
                        let namedFormulaObj = await ipfsGetObj(lemmaLink["/"])
                        lemmasCids.push(namedFormulaObj["formula"]["/"])
                    }

                    if (lemmasCids.length > 0) statement += "[" + lemmasCids.toString() + "], "

                    let namedConclusionObj = await ipfsGetObj(sequent["conclusion"]["/"])
                    let conclusionCid = namedConclusionObj["formula"]["/"]
                    statement += conclusionCid + ")"

                    statements.push(statement)
                }

            }
            else if (obj["format"] == "sequence") {
                let assertionsLinks = obj["assertions"]
                for (let link of assertionsLinks) {
                    let cidAssertion = link["/"]
                    let assertionObj = await ipfsGetObj(cidAssertion)
                    if (!verifySignature(assertionObj))
                        throw new Error("The signature of + " + cid + "is invalid!")

                    // else, if signature is valid
                    if (inAllowList(fingerPrint(assertionObj["agent"]))) {
                        let sequent = await ipfsGetObj(assertionObj["sequent"]["/"])

                        let statement = "seq("
                        let lemmasCids = [] // formula, not named-formula
                        for (let lemmaLink of sequent["lemmas"]) {
                            let namedFormulaObj = await ipfsGetObj(lemmaLink["/"])
                            lemmasCids.push(namedFormulaObj["formula"]["/"])
                        }

                        if (lemmasCids.length > 0) statement += "[" + lemmasCids.toString() + "], "

                        let namedConclusionObj = await ipfsGetObj(sequent["conclusion"]["/"])
                        let conclusionCid = namedConclusionObj["formula"]["/"]
                        statement += conclusionCid + ")"

                        statements.push(statement)
                    }
                }
            }
        }

        //return { "axioms": axioms, "saysStatements": saysStatements }
        return statements

    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

// expected input: file name of file containing a list [] of CIDs: check for assertion, sequence (of assertions)
// expected output: list of logic program statements --> of the form; seq([lemmas], conclusion) --> just list filtered assertions through allow list; no deduction
let whatISay = async (fileName: string) => {
    let result = await filterByAllowList(fileName)

    let axioms = result["axioms"]
    let saysStatements = result["saysStatements"]

    console.log("Based on your allow list and the given list of assertions, your says-statements (as agent K) are:")
    for (let statement of saysStatements) {
        console.log(statement)
    }

}

// query command , takes input a cidlist and a cid of a conclusion;"formula" format cid and not "named-formula"
// as in "Do I trust thm(cid) based on this set of cids and my allow list?"
// make the equality checking a separate thing -> extendable --> 
// check languages and translation,
let doISay = async (cidThm: string, cidListFileName: string) => {

    try {
        let result = await filterByAllowList(cidListFileName)
        console.log("searching for theorem " + cidThm)
        console.log("in the logic program: ")
        console.log(result)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

export = { whatISay, doISay }

