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

import os from "os";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "path";

export class FileBacked {
    public readonly fileName: string;
    private obj: any;
    private loaded: boolean;

    private static xdgConfigDir = process.env.XDG_CONFIG_DIR;
    public static configDir = FileBacked.xdgConfigDir ??
        path.join(os.homedir(), ".config/dispatch");

    private async ensureConfigDirExists() {
        try {
            const dir = await fs.opendir(FileBacked.configDir);
            await dir.close();
        } catch {
            await fs.mkdir(FileBacked.configDir, { recursive: true });
        }
    }

    public constructor(fileName: string,
                       initial: any = {}) {
        this.fileName = path.join(FileBacked.configDir, fileName);
        this.obj = initial;
        this.loaded = false;
    }

    public async hasFile() {
        try {
            await fs.access(this.fileName,
                            constants.F_OK | constants.R_OK | constants.W_OK);
            return true;
        } catch {
            return false;
        }
    }

    private async load() {
        if (!this.loaded) {
            await this.ensureConfigDirExists();
            if (await this.hasFile()) {
                const data = await fs.readFile(this.fileName);
                this.obj = JSON.parse(data.toString());
            }
            // else read from initial value
        }
        this.loaded = true;
    }

    public async read(key: string) {
        await this.load();
        return this.obj[key];
    }

    public async readAll() {
        await this.load();
        return this.obj;
    }

    public async write(key: string, val: any) {
        const old = await this.read(key);
        if (old !== val) {
            this.obj[key] = val;
            await fs.writeFile(this.fileName, JSON.stringify(this.obj));
        }
    }
}

export const config        = new FileBacked("config.json", {
    "my-gateway": "http://dweb.link",
    "my-web3.storage-api-token": "**insert your token here**",
});
export const keyStore      = new FileBacked("keystore.json");
export const agentProfiles = new FileBacked("agentprofiles.json");
export const toolProfiles  = new FileBacked("toolprofiles.json");
export const languages     = new FileBacked("languages.json");
export const allowList     = new FileBacked("allowlist.json", {
    "list": [],
});

export default {
    config, keyStore, agentProfiles, toolProfiles, languages, allowList
};
