const fs = require('fs')
const crypt = require('crypto')

//const { configpath, confdirpath, keystorepath, profilespath } = require('./initial-vals')
import initialVals = require("./initial-vals")
const { configpath, confdirpath, keystorepath, profilespath } = initialVals

let setup = () => {
    // try to read ~/.config/w3proof-dispatch/config.json --> create if doesn't exist
    if (!fs.existsSync(configpath)) {
        fs.mkdirSync(confdirpath, { recursive: true }) // it creates any directory in the specified path if it does not exist
        let configObj = { 
            "my-gateway": "http://dweb.link",
            "my-web3.storage-api-token": "**insert your token here**",
        }
        fs.writeFileSync(configpath, JSON.stringify(configObj))
    }

    if (!fs.existsSync(keystorepath)) {
        fs.writeFileSync(keystorepath, JSON.stringify({}))
    }

    if (!fs.existsSync(profilespath)) {
        fs.writeFileSync(profilespath, JSON.stringify({}))
    }


}

let keygen = (profileName: string, target: string) => { // now just using default parameters
    /* const {
        publicKey,
        privateKey
    } = crypto.generateKeyPairSync('rsa', {
        modulusLength : 4096,
        publicKeyEncoding: {
            type : 'spki',
            format : 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: 'top secret'
        }
    }) */

    const { privateKey, publicKey } = crypt.generateKeyPairSync('ec', {
        namedCurve: 'sect239k1',
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
  
    // create a profile and add it to the profiles file
    let fingerPrint = crypt.createHash('sha256').update(publicKey).digest('hex')

    let profiles = JSON.parse(fs.readFileSync(profilespath))
    let newProfile = {
        "name": profileName,
        "target": target,
        "public-key": publicKey,
        "private-key": privateKey,
        "fingerprint": fingerPrint
    }

    profiles[profileName] = newProfile

    try {
        fs.writeFileSync(profilespath, JSON.stringify(profiles))
    }
    catch (err) {
        console.log(err)
    }
}

let setweb3token = (token: string) => {
    let configFile = fs.readFileSync(configpath)
    let config = JSON.parse(configFile)
    config["my-web3.storage-api-token"] = token
    try {
        fs.writeFileSync(configpath, JSON.stringify(config))
    }
    catch (err) {
        console.log(err)
    }
}

let setgateway = (gateway: string) => {
    let configFile = fs.readFileSync(configpath)
    let config = JSON.parse(configFile)
    config["my-gateway"] = gateway
    try {
        fs.writeFileSync(configpath, JSON.stringify(config))
    }
    catch (err) {
        console.log(err)
    }
}

let listconfig = () => {
    let configFile = fs.readFileSync(configpath)
    let config = JSON.parse(configFile)
    console.log(config)
}

export = { setup, keygen, setweb3token, setgateway, listconfig }