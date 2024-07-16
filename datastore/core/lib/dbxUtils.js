"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unpackDbxFile = exports.packDbx = exports.unpackDbx = void 0;
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
const Fs = require("fs/promises");
const stream_1 = require("stream");
const Tar = require("tar");
function unpackDbx(compressedDbx, toDirectory) {
    const dbxStream = new stream_1.PassThrough().end(compressedDbx);
    return new Promise(resolve => {
        dbxStream
            .pipe(Tar.extract({
            cwd: toDirectory,
            preserveOwner: false,
        }))
            .on('finish', resolve);
    });
}
exports.unpackDbx = unpackDbx;
async function packDbx(fromDirectory) {
    const file = `${fromDirectory}.tgz`;
    if (!(await (0, fileUtils_1.existsAsync)(file))) {
        await Tar.create({
            gzip: true,
            cwd: fromDirectory,
            file,
        }, ['datastore.js', 'datastore.js.map', 'datastore-manifest.json', 'docpage.json']);
    }
    return await Fs.readFile(file);
}
exports.packDbx = packDbx;
async function unpackDbxFile(file, toDirectory) {
    await Tar.extract({
        file,
        cwd: toDirectory,
        preserveOwner: false,
    });
}
exports.unpackDbxFile = unpackDbxFile;
//# sourceMappingURL=dbxUtils.js.map