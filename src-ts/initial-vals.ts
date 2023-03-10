const os = require('os')

const xdg_config_dir = process.env.XDG_CONFIG_DIR
const confdirpath =
    xdg_config_dir ? xdg_config_dir : os.homedir() + '/.config/dispatch'

const configpath = confdirpath +  "/config.json"
const keystorepath = confdirpath + "/keystore.json"
const agentprofilespath = confdirpath + "/agentprofiles.json"
const toolprofilespath = confdirpath + "/toolprofiles.json"
const languagespath = confdirpath + "/languages.json"
const allowlistpath = confdirpath + "/allowlist.json"

export = { configpath, confdirpath, keystorepath, agentprofilespath,
           toolprofilespath, languagespath, allowlistpath }
