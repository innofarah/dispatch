const os = require('os')

const confdirpath = os.homedir() + '/.config/w3proof-dispatch'

const configpath = confdirpath +  "/config.json"
const keystorepath = confdirpath + "/keystore.json"
const agentprofilespath = confdirpath + "/agentprofiles.json"
const toolprofilespath = confdirpath + "/toolprofiles.json"
const languagespath = confdirpath + "/languages.json"
const allowlistpath = confdirpath + "/allowlist.json"

export = { configpath, confdirpath, keystorepath, agentprofilespath, toolprofilespath, languagespath, allowlistpath }