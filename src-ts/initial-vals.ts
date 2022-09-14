const os = require('os')

const confdirpath = os.homedir() + '/.config/w3proof-dispatch'

const configpath = confdirpath +  "/config.json"
const keystorepath = confdirpath + "/keystore.json"
const profilespath = confdirpath + "/profiles.json"

export = { configpath, confdirpath, keystorepath, profilespath }