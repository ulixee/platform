"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
const IArgonFile_1 = require("@ulixee/platform-specification/types/IArgonFile");
const ValidationError_1 = require("@ulixee/specification/utils/ValidationError");
const Fs = require("fs");
exports.default = {
    async createCredit(credit, file) {
        if (await (0, fileUtils_1.existsAsync)(file))
            await Fs.promises.rm(file);
        await Fs.writeFileSync(file, JSON.stringify({
            credit,
        }));
    },
    async readFromPath(path) {
        const data = await (0, fileUtils_1.readFileAsJson)(path).catch(() => null);
        if (data) {
            const result = IArgonFile_1.ArgonFileSchema.safeParse(data);
            if (result.success === false) {
                throw ValidationError_1.default.fromZodValidation(`The Argon file you've just opened has invalid parameters.`, result.error);
            }
            return data;
        }
    },
};
//# sourceMappingURL=ArgonFile.js.map