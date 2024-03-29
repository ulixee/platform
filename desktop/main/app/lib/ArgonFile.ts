import { existsAsync, readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import IArgonFile, { ArgonFileSchema } from '@ulixee/platform-specification/types/IArgonFile';
import ValidationError from '@ulixee/specification/utils/ValidationError';
import * as Fs from 'fs';

export { IArgonFile };
export default {
  async createCredit(credit: IArgonFile['credit'], file: string): Promise<void> {
    if (await existsAsync(file)) await Fs.promises.rm(file);
    await Fs.writeFileSync(
      file,
      JSON.stringify(<IArgonFile>{
        credit,
      }),
    );
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
