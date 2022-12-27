// in this file a lot should be added; for example, verifying that all things refered in the sequence are of the same language (check first if this is what we want?)

// for now only check that the the object has the correct attributes (without checking the types of their values)

const crypto = require('crypto')

let isDeclarations = (obj: {}) => {
    if (Object.keys(obj).length == 3 && "format" in obj && obj["format"] == "declarations") {
        return ("language" in obj && "content" in obj)
    }
}

let isFormula = (obj: {}) => {
    if (Object.keys(obj).length == 4 && "format" in obj && obj["format"] == "formula") {
        return ("language" in obj && "content" in obj && "declarations" in obj)
    }
    return false
}

let isNamedFormula = (obj: {}) => {
    if (Object.keys(obj).length == 3 && "format" in obj && obj["format"] == "named-formula") {
        return ("name" in obj && "formula" in obj)
    }
    return false
}

let isSequent = (obj: {}) => {
    if (Object.keys(obj).length == 3 && "format" in obj && obj["format"] == "sequent") {
        return ("lemmas" in obj && "conclusion" in obj)
    }
    return false
}

let isAssertion = (obj: {}) => {
    if (Object.keys(obj).length == 4 && "format" in obj && obj["format"] == "assertion") {
        return ("agent" in obj && "sequent" in obj && "signature" in obj)
    }
    return false
}

let isSequence = (obj: {}) => {
    if (Object.keys(obj).length == 3 && "format" in obj && obj["format"] == "sequence") {
        return ("name" in obj && "assertions" in obj)
    }
    return false
}



let verifySignature = (assertion: {}) => {
    let signature = assertion["signature"]
    let claimedPublicKey = assertion["agent"]
    // the data to verify : here it's the asset's cid in the object
    let dataToVerify = assertion["sequent"]["/"]

    const verify = crypto.createVerify('SHA256')
    verify.write(dataToVerify)
    verify.end()
    let signatureVerified: boolean = verify.verify(claimedPublicKey, signature, 'hex')
    return signatureVerified
}

export = { isDeclarations, isFormula, isNamedFormula, isSequent, isAssertion, isSequence, verifySignature }