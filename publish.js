const fs = require('fs')
const { exec, execSync } = require('child_process');
const { Web3Storage, getFilesFromPath } = require('web3.storage');
const { CarReader } = require('@ipld/car');

let queueGlobal = []
let publishedObjs = {}
let config = "", gateway = "", web3Token = "", web3Client = ""

let setweb3token = (token) => {
    let configFile = fs.readFileSync("config.json")
    config = JSON.parse(configFile)
    config["my-web3.storage-api-token"] = token
    fs.writeFileSync("config.json", JSON.stringify(config))
}

let setgateway = (gateway) => {
    let configFile = fs.readFileSync("config.json")
    config = JSON.parse(configFile)
    config["my-gateway"] = gateway
    fs.writeFileSync("config.json", JSON.stringify(config))
}

let listconfig = () => {
    let configFile = fs.readFileSync("config.json")
    config = JSON.parse(configFile)
    Object.entries(config).forEach(element => {
        console.log(element[0] + " : " + element[1])
    });
}

let processAsset = (assetName, assetType, directoryPath) => {
    let asset = {}
    if (assetType == "script") {
        asset = { "type": "script", "name": assetName, "specification": "", "imports": [], "text": {} }
        processFile(asset, ".thm", directoryPath)
    }
    else if (assetType == "specification") {
        asset = { "type": "specification", "name": assetName, "accum": [], "textmod": {}, "textsig": {} }
        processFile(asset, ".sig", directoryPath)
        processFile(asset, ".mod", directoryPath)
    }
}

let processFile = (asset, fileExtension, directoryPath) => {
    let fileText = fs.readFileSync(directoryPath + "/" + asset["name"] + fileExtension).toString()
    let lines = fileText.split("\n")
    let rawText = ""
    if (fileExtension == ".thm") {
        lines.forEach(line => {
            line.trim()
            if (line[0] == "%") {
                // escaping special characters in a comment since they might exist
                line = line.replace(/[\$"]/g, '\\$&\"');
                rawText += line
            } // still have to deal with the /* ... */ comment
            else {
                let commands = line.split(".")
                commands.forEach(command => {
                    command = command.trim()
                    if (command.substring(0, 13) == "Specification") {
                        let specName = command.split("\"")[1]
                        if (specName.substring(0, 7) == "ipfs://") {
                            let parts = specName.split("//")
                            let path = parts[parts.length - 1]
                            let cmd = "wget '" + gateway + "/api/v0/dag/export?arg=" + path + "' -O tmpdag.car --quiet"
                            execSync(cmd, { encoding: 'utf-8' })
                            cmd = "ipfs dag import tmpdag.car"
                            execSync(cmd)
                            execSync("rm tmpdag.car")
                            execSync("wget '" + gateway + "/api/v0/dag/get" + path + "' --quiet")
                            let output = JSON.parse(fs.readFileSync(path))
                            execSync("rm " + path)
                            asset["specification"] = output["name"]
                            publishedObjs[output["name"]] = { "/": path }
                        }
                        else {
                            asset["specification"] = specName
                        }
                    }
                    else if (command.substring(0, 6) == "Import") {
                        let importedName = command.split("\"")[1]
                        if (importedName.substring(0, 7) == "ipfs://") {    // -- Import "ipfs://bafyre.../.../.." --> read the object, and store by its name as stored in the ipfs object
                            let parts = importedName.split("//")
                            let path = parts[parts.length - 1]
                            let cmd = "wget '" + gateway + "/api/v0/dag/export?arg=" + path + "' -O tmpdag.car --quiet"
                            execSync(cmd, { encoding: 'utf-8' })
                            cmd = "ipfs dag import tmpdag.car"
                            execSync(cmd)
                            execSync("rm tmpdag.car")
                            execSync("wget '" + gateway + "/api/v0/dag/get/" + path + "' --quiet")
                            let output = JSON.parse(fs.readFileSync(path))
                            execSync("rm " + path)
                            asset["imports"].push(output["name"])
                            publishedObjs[output["name"]] = { "/": path }
                        }
                        else asset["imports"].push(importedName)
                    }
                    else {
                        if (command != "" && command != "\r\n" && command != "\n") {
                            line = line.trim()
                            if (command == line && line[line.length - 1] == ".") {
                                rawText += command + "."
                            }
                            else if (command == line || command == "*/")
                                rawText += command
                            else
                                rawText += command + "."
                        }
                    }
                })
            }
            rawText += "\r\n"
        });
        publishRawText(asset, rawText, fileExtension)

        queueGlobal.push(asset)

        asset["imports"].forEach(importedName => {
            if (!publishedObjs[importedName]) {
                processAsset(importedName, "script", directoryPath)
            }
        });
        if (asset["specification"]) {
            if (!publishedObjs[asset["specification"]]) {
                processAsset(asset["specification"], "specification", directoryPath)
            }
        }
    }
    else if (fileExtension == ".sig" || fileExtension == ".mod") {
        let modorsiglinefound = false
        //lines = lines.toString().split("\n")
        lines.forEach(line => {
            line.trim()
            if (line[0] == "%") {
                // escaping special characters in a comment since they might exist
                line = line.replace(/[\$"]/g, '\\$&\"');
                rawText += line
            } // still have to deal with the /* ... */ comment
            else if (!modorsiglinefound && (line.substring(0, 6) == "module" || line.substring(0, 3) == "sig")) {
                modorsiglinefound = true
                // do nothing (don't add this line to the text to make it easier at the construction step)
            }
            else {
                let commands = line.split(".")
                commands.forEach(command => {
                    command = command.trim()
                    if ((fileExtension == ".sig" && command.substring(0, 9) == "accum_sig")
                        || (fileExtension == ".mod" && command.substring(0, 10) == "accumulate")) {
                        if (fileExtension == ".sig") {
                            let specName = command.split(" ")[1]
                            if (specName.substring(0, 7) == "ipfs://") {
                                let parts = specName.split("//")
                                let path = parts[parts.length - 1]
                                let cmd = "wget '" + gateway + "/api/v0/dag/export?arg=" + path + "' -O tmpdag.car --quiet"
                                execSync(cmd, { encoding: 'utf-8' })
                                cmd = "ipfs dag import tmpdag.car"
                                execSync(cmd)
                                execSync("rm tmpdag.car")
                                execSync("wget '" + gateway + "/api/v0/dag/get" + path + "' --quiet")
                                let output = JSON.parse(fs.readFileSync(path))
                                execSync("rm " + path)
                                asset["accum"].push(output["name"])
                                publishedObjs[output["name"]] = { "/": path }
                            }
                            else asset["accum"].push(specName)
                        }
                    }
                    else {
                        if (command != "" && command != "\r\n" && command != "\n") {
                            line = line.trim()
                            if (command == line && line[line.length - 1] == ".") {
                                rawText += command + "."
                            }
                            else if (command == line || command == "*/")
                                rawText += command
                            else
                                rawText += command + "."
                        }
                    }
                })
            }
            rawText += "\r\n"
        });
        publishRawText(asset, rawText, fileExtension)

        if (fileExtension == ".sig") { // to add it once to the queue
            queueGlobal.push(asset)
        }

        asset["accum"].forEach(accumName => {
            if (!publishedObjs[accumName] && fileExtension == ".sig") { // to create the asset only once 
                processAsset(accumName, "specification", directoryPath)
            }
        });
    }


}

let publishRawText = (asset, rawText, fileExtension) => {
    fs.writeFileSync("rawText.txt", rawText)
    const output = execSync('ipfs add rawText.txt --quieter --cid-version 1', { encoding : 'utf-8' });  // the default is 'buffer'
    if (fileExtension == ".thm")
        asset["text"]["/"] = output.substring(0, output.length - 1) // without the final "\n"
    else if (fileExtension == ".sig")
        asset["textsig"]["/"] = output.substring(0, output.length - 1) // without the final "\n"
    else if (fileExtension == ".mod")
        asset["textmod"]["/"] = output.substring(0, output.length - 1) // without the final "\n"
}

// this is a local publish --> adding into the local ipfs space(node)
let publish = (current, target) => {
    if (current["type"] == "script") {
        if (current["imports"].length == 0) {
            current["imports"] = {}
        }
        else {
            let imports = current["imports"]
            current["imports"] = {}
            imports.forEach(importedName => {
                current["imports"][importedName] = publishedObjs[importedName]
            });
        }
        if (current["specification"] != "") {
            let specName = current["specification"]
            current["specification"] = {}
            current["specification"][specName] = publishedObjs[specName]
        }
    }
    else if (current["type"] == "specification") {
        if (current["accum"].length == 0) {
            current["accum"] = {}
        }
        else {
            let accumulations = current["accum"]
            current["accum"] = {}
            accumulations.forEach(accumName => {
                current["accum"][accumName] = publishedObjs[accumName]
            });
        }
    }
    let cmd = "echo '" + JSON.stringify(current) + "' > tmpJSON.json"
    execSync(cmd)
    let addcmd = "ipfs dag put tmpJSON.json --pin"
    let output = execSync(addcmd, { encoding: 'utf-8' })
    publishedObjs[current["name"]] = { "/": output.substring(0, output.length - 1) }
    if (queueGlobal.length > 0) publish(queueGlobal.pop(), target)
    // finished
    else if (queueGlobal.length == 0 && target.toString() == "web3storage") {
        publishFinalDag(output.substring(0, output.length - 1)).catch((err) => {
            console.error(err)
            process.exit(1)
        })
    }
    else if (queueGlobal.length == 0 && target.toString() == "local") {
        console.log(output.substring(0, output.length - 1))
    }
    //console.log(target)
}

// this is where the final dag structure is published publicly (through web3.storage api) 
let publishFinalDag = async (cid) => {
    let cmd = "ipfs dag export " + cid + " > tmpcar.car"
    execSync(cmd, { encoding: 'utf-8' })
    const inStream = fs.createReadStream('tmpcar.car')
    // read and parse the entire stream in one go, this will cache the contents of
    // the car in memory so is not suitable for large files.
    const reader = await CarReader.fromIterable(inStream)
    const cid1 = await web3Client.putCar(reader)
    //console.log("Uploaded CAR file to Web3.Storage! CID:", cid1)
    console.log(cid1)
    execSync("rm tmpcar.car")
    //console.log(await web3Client.status(cid1))
}

let main = (mainAssetName, mainAssetType, directoryPath, target) => {
    try {
        let configFile = fs.readFileSync("config.json")
        config = JSON.parse(configFile)
        if (config["my-gateway"]) gateway = config["my-gateway"]
        else throw (err)
        if (config["my-web3.storage-api-token"]) {
            web3Token = config["my-web3.storage-api-token"]
            web3Client = new Web3Storage({ token: web3Token })
        }
        else if (!config["my-web3.storage-api-token"] && target == "web3storage") {
            console.log("setting a web3.storage token is required as the chosen mode for publishing is `web3storage` and not `local`")
            throw (err)
        }
    } catch (err) {
        console.log("unable to read configuration file, or incorrect format of expected configuration file")
        process.exit(1)
    }

    if (!(process.argv[2] && process.argv[3] && process.argv[4])) {
        console.log("Missing arguments for process")
        process.exit(1)
    }

    //const mainAssetName = process.argv[2]
    //const mainAssetType = process.argv[3]
    //const directoryPath = process.argv[4]

    processAsset(mainAssetName, mainAssetType, directoryPath)
    let current = queueGlobal.pop()
    publish(current, target)

    execSync("rm rawText.txt")
    execSync("rm tmpJSON.json")
}

module.exports = { main, setweb3token, setgateway, listconfig}
