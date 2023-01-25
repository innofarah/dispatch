const os = require('os')

const confdirpath = os.homedir() + '/.config/w3proof-dispatch'

const configpath = confdirpath +  "/config.json"
const keystorepath = confdirpath + "/keystore.json"
const profilespath = confdirpath + "/profiles.json"
const allowlistpath = confdirpath + "/allowlist.json"

export = { configpath, confdirpath, keystorepath, profilespath, allowlistpath }