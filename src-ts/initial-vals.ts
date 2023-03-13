/*
 * Copyright (C) 2023  Inria
 *
 * Inria: Institut National de Recherche en Informatique et en Automatique
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * A copy of the license is provided in the file "LICENSE" distributed
 * with this file. You may also obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
