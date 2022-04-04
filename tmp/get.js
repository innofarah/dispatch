const fs = require('fs')
const { exec, execSync } = require('child_process')
const os = require('os')
const wget = require('wget-improved');
const crypto = require('crypto')


let config = "", gateway = ""

let importFullDag = (ipfsPath, ipfsStation) => {
    let parts = ipfsPath.split("/")
    let cid = parts[0]
    let cmd = ""
    if (ipfsStation == "gateway") {
        let url = gateway + "/api/v0/dag/export?arg=" + cid
        //cmd = "wget '" + gateway + "/api/v0/dag/export?arg=" + cid + "' -O tmpdag.car --quiet"
        let download = wget.download(url, "tmpdag.car")
        download.on('end', function () {
            cmd = "ipfs dag import tmpdag.car"; execSync(cmd)
            fs.unlink('tmpdag.car', (err) => {
                if (err) throw err;
            });
        });
    }
    else if (ipfsStation == "local") {
        cmd = "ipfs dag export " + cid + " > tmpdag.car"
        execSync(cmd, { encoding: 'utf-8' })
        cmd = "ipfs dag import tmpdag.car"
        execSync(cmd)
        fs.unlinkSync('tmpdag.car', (err) => {
            if (err) throw err;
        });
    }
}

let constructFile = (ipfsPath, localDirectoryPath) => {
    let cmd = "ipfs dag get " + ipfsPath
    let output = execSync(cmd, { encoding: 'utf-8' })
    let asset = JSON.parse(output)
    let fileName = ""
   /* if (asset["type"] == "signed_script") {
        const verify = crypto.createVerify('SHA256')
        verify.write(asset["asset"]["/"]) // we want to verify the assetcid (it is what's assumed to have been signed)
        verify.end()
        if(verify.verify(asset['principal'], asset['signature'], 'hex')) {
            
        }
    } */
    if (asset["type"] == "script") {
        fileName = asset["name"] + ".thm"
        let fileContent = ""
        if (asset["specification"] != "") {
            let specName = Object.keys(asset["specification"])[0]
            fileContent += 'Specification "' + specName + '".\r\n'
            constructFile(ipfsPath + "/specification/" + specName, localDirectoryPath)
        }
        Object.entries(asset["imports"]).forEach(element => {
            fileContent += 'Import "' + element[0] + '".\r\n'
            constructFile(ipfsPath + "/imports/" + element[0], localDirectoryPath)
        })
        let fileText = execSync("ipfs cat " + ipfsPath + "/text")
        fileContent += fileText
        fs.writeFileSync(localDirectoryPath + "/" + fileName, fileContent)
    }
    else if (asset["type"] == "specification") {
        // construct 2 files : sig and mod
        let sigFileName = asset["name"] + ".sig"
        let modFileName = asset["name"] + ".mod"
        let sigFileContent = "sig " + asset["name"] + ".\r\n"
        let modFileContent = "module " + asset["name"] + ".\r\n"

        Object.entries(asset["accum"]).forEach(element => {
            sigFileContent += "accum_sig " + element[0] + ".\r\n"
            modFileContent += "accumulate " + element[0] + ".\r\n"
            constructFile(ipfsPath + "/accum/" + element[0], localDirectoryPath)
        })
        let sigFileText = execSync("ipfs cat " + ipfsPath + "/textsig")
        sigFileContent += sigFileText
        fs.writeFileSync(localDirectoryPath + "/" + sigFileName, sigFileContent)

        let modFileText = execSync("ipfs cat " + ipfsPath + "/textmod")
        modFileContent += modFileText
        fs.writeFileSync(localDirectoryPath + "/" + modFileName, modFileContent)
    }
}

let mainget = (ipfsPath, directory, ipfsStation) => {

    //let platform = os.platform()
    let configpath = ""
    //if (platform == 'freebsd' || platform == 'linux' || platform == 'sunos' || platform == 'darwin' || platform == 'win32') {
    configpath = os.homedir() + "/.config/w3proof-dispatch/config.json"
    //}

    try {
        let configFile = fs.readFileSync(configpath)
        config = JSON.parse(configFile)

        if (config["my-gateway"]) gateway = config["my-gateway"]
        else throw (err)
    } catch (err) {
        console.log("unable to read configuration file, or incorrect format of expected configuration file")
        process.exit(1)
    }

    if (!(process.argv[2] && process.argv[3])) {
        console.log("Missing arguments for process")
        process.exit(1)
    }

    // create the given directorypath if it does not exist (starting from directory of execution)
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    //const ipfsPath = process.argv[2]
    //const localDirectoryPath = process.argv[3]

    importFullDag(ipfsPath, ipfsStation)

    constructFile(ipfsPath, directory)
}

module.exports = { mainget }
//mainget()
