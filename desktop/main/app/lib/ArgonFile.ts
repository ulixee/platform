import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import IArgonFile, { ArgonFileSchema } from '@ulixee/platform-specification/types/IArgonFile';
import ValidationError from '@ulixee/platform-specification/utils/ValidationError';
import serdeJson from '@ulixee/platform-utils/lib/serdeJson';
import * as Fs from 'fs';

export { IArgonFile };
export default {
  async create(data: IArgonFile, file: string): Promise<void> {
    if (await existsAsync(file)) await Fs.promises.rm(file);
    await Fs.writeFileSync(file, serdeJson(data));
  },

  async readFromPath(path: string): Promise<IArgonFile> {
    const data = await readFileAsJson<IArgonFile>(path).catch(() => null);
    if (data) {
      const result = ArgonFileSchema.safeParse(data);
      if (result.success === false) {
        throw ValidationError.fromZodValidation(
          `The Argon file you've just opened has invalid parameters.`,
          result.error,
        );
      }
      return data;
    }
  },
};
