import ISourceCodeLocation from '../interfaces/ISourceCodeLocation';
import { SourceMapSupport } from './SourceMapSupport';

export default class SourceLoader {
  private static sourceLines: { [source: string]: string[] } = {};

  static getSource(codeLocation: ISourceCodeLocation): ISourceCodeLocation & { code: string } {
    if (!codeLocation) return null;

    const originalSourcePosition = SourceMapSupport.getOriginalSourcePosition(codeLocation);
    if (originalSourcePosition.source !== codeLocation.filename) {
      codeLocation = {
        line: originalSourcePosition.line,
        filename: originalSourcePosition.source,
        column: originalSourcePosition.column,
      };
    }
    if (!this.sourceLines[codeLocation.filename]) {
      const file = SourceMapSupport.getFileContents(codeLocation.filename);
      this.sourceLines[codeLocation.filename] = file.split(/\r?\n/);
    }

    const code = this.sourceLines[codeLocation.filename][codeLocation.line - 1];
    return {
      code,
      ...codeLocation,
    };
  }
}
