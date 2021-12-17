import { MappedPosition, SourceMapConsumer } from 'source-map-js';
import * as fs from 'fs';
import * as path from 'path';
import ISourceCodeLocation from '../interfaces/ISourceCodeLocation';
import { URL } from 'url';

// ATTRIBUTION: forked from https://github.com/evanw/node-source-map-support

const sourceMapDataUrlRegex = /^data:application\/json[^,]+base64,/;
const sourceMapUrlRegex =
  /(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/gm;
const fileUrlPrefix = 'file://';

export class SourceMapSupport {
  private static sourceMapCache: { [source: string]: { map: SourceMapConsumer; url: string } } = {};
  private static resolvedPathCache: { [file_url: string]: string } = {};
  private static fileContentsCache: { [filepath: string]: string } = {};

  static resetCache(): void {
    this.sourceMapCache = {};
    this.resolvedPathCache = {};
    this.fileContentsCache = {};
  }

  static install(): void {
    if (!Error[Symbol.for('source-map-support')]) {
      Error[Symbol.for('source-map-support')] = true;
      Error.prepareStackTrace = this.prepareStackTrace.bind(this);
    }
  }

  static getOriginalSourcePosition(position: ISourceCodeLocation): MappedPosition {
    this.sourceMapCache[position.filename] ??= this.retrieveSourceMap(position.filename);

    const sourceMap = this.sourceMapCache[position.filename];
    if (sourceMap?.map) {
      const originalPosition = sourceMap.map.originalPositionFor(position);

      // Only return the original position if a matching line was found
      if (originalPosition.source) {
        originalPosition.source = this.resolvePath(sourceMap.url, originalPosition.source);
        return originalPosition;
      }
    }

    return {
      source: position.filename,
      line: position.line,
      column: position.column,
    };
  }

  static getFileContents(filepath: string, cache = true): string {
    if (this.fileContentsCache[filepath]) return this.fileContentsCache[filepath];

    const originalFilepath = filepath;
    // Trim the path to make sure there is no extra whitespace.
    let lookupFilepath: string | URL = filepath.trim();
    if (filepath.startsWith(fileUrlPrefix)) {
      lookupFilepath = new URL(filepath);
    }

    let data: string = null;
    try {
      data = fs.readFileSync(lookupFilepath, 'utf8');
    } catch (err) {
      // couldn't read
    }
    if (cache) {
      this.fileContentsCache[filepath] = data;
      this.fileContentsCache[originalFilepath] = data;
    }
    return data;
  }

  private static prepareStackTrace(error: Error, stack: NodeJS.CallSite[]): string {
    const name = error.name ?? error[Symbol.toStringTag] ?? error.constructor?.name ?? 'Error';
    const message = error.message ?? '';
    const errorString = name + ': ' + message;

    // track fn name as we go backwards through stack
    const processedStack = [];
    let containingFnName: string = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      let frame = stack[i];
      if (frame.isNative()) {
        containingFnName = null;
      } else {
        const filename = frame.getFileName() || (frame as any).getScriptNameOrSourceURL();
        if (filename) {
          const position = this.getOriginalSourcePosition({
            filename,
            line: frame.getLineNumber(),
            column: frame.getColumnNumber() - 1,
          });
          if (position.source !== filename) {
            const fnName = containingFnName ?? frame.getFunctionName();
            containingFnName = position.name;
            frame = new Proxy(frame, {
              get(target: NodeJS.CallSite, p: string | symbol): any {
                if (p === 'getFunctionName') return () => fnName;
                if (p === 'getFileName') return () => position.source;
                if (p === 'getScriptNameOrSourceURL') return () => position.source;
                if (p === 'getLineNumber') return () => position.line;
                if (p === 'getColumnNumber') return () => position.column + 1;
                if (p === 'toString') return CallSiteToString.bind(frame);

                return target[p]?.bind(target);
              },
            });
          }
        }
      }

      processedStack.unshift(`\n    at ${frame.toString()}`);
    }
    return errorString + processedStack.join('');
  }

  private static retrieveSourceMap(source: string): { url: string; map: SourceMapConsumer } {
    const fileData = this.getFileContents(source, false);

    // Find the *last* sourceMappingURL to avoid picking up sourceMappingURLs from comments, strings, etc.
    let sourceMappingURL: string;
    let sourceMapData: string;

    let match: RegExpMatchArray;
    while ((match = sourceMapUrlRegex.exec(fileData))) {
      sourceMappingURL = match[1];
    }

    if (sourceMappingURL) {
      if (sourceMapDataUrlRegex.test(sourceMappingURL)) {
        const rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(',') + 1);
        sourceMapData = Buffer.from(rawData, 'base64').toString();
        sourceMappingURL = source;
      } else {
        sourceMappingURL = this.resolvePath(source, sourceMappingURL);
        sourceMapData = this.getFileContents(sourceMappingURL);
      }
    }

    if (!sourceMapData) {
      return {
        url: null,
        map: null,
      };
    }

    const rawData = JSON.parse(sourceMapData);
    return {
      url: sourceMappingURL,
      map: new SourceMapConsumer(rawData),
    };
  }

  private static resolvePath(base: string, relative: string): string {
    if (!base) return relative;
    const key = `${base}__${relative}`;

    if (!this.resolvedPathCache[key]) {
      let protocol = base.startsWith(fileUrlPrefix) ? fileUrlPrefix : '';

      let basePath = path.dirname(base).slice(protocol.length);

      // handle file:///C:/ paths
      if (protocol && /^\/\w:/.test(basePath)) {
        protocol += '/';
        basePath = basePath.slice(1);
      }

      this.resolvedPathCache[key] = protocol + path.resolve(basePath, relative);
    }
    return this.resolvedPathCache[key];
  }
}

SourceMapSupport.install();

// Converted from the V8 source code at:
// https://github.com/v8/v8/blob/dc712da548c7fb433caed56af9a021d964952728/src/objects/stack-frame-info.cc#L344-L393
function CallSiteToString(
  this: NodeJS.CallSite & {
    getScriptNameOrSourceURL(): string;
    isAsync(): boolean;
    isPromiseAll?(): boolean;
    isPromiseAny?(): boolean;
    getPromiseIndex?(): number;
  },
) {
  let fileName;
  let fileLocation = '';
  if (this.isNative()) {
    fileLocation = 'native';
  } else {
    fileName = this.getScriptNameOrSourceURL();
    if (!fileName && this.isEval()) {
      fileLocation = this.getEvalOrigin();
      fileLocation += ', '; // Expecting source position to follow.
    }

    if (fileName) {
      fileLocation += fileName;
    } else {
      // Source code does not originate from a file and is not native, but we
      // can still get the source position inside the source string, e.g. in
      // an eval string.
      fileLocation += '<anonymous>';
    }
    const lineNumber = this.getLineNumber();
    if (lineNumber != null) {
      fileLocation += ':' + lineNumber;
      const columnNumber = this.getColumnNumber();
      if (columnNumber) {
        fileLocation += ':' + columnNumber;
      }
    }
  }

  let line = '';
  const isAsync = this.isAsync ? this.isAsync() : false;
  if (isAsync) {
    line += 'async ';
    const isPromiseAll = this.isPromiseAll ? this.isPromiseAll() : false;
    const isPromiseAny = this.isPromiseAny ? this.isPromiseAny() : false;
    if (isPromiseAny || isPromiseAll) {
      line += isPromiseAll ? 'Promise.all (index ' : 'Promise.any (index ';
      const promiseIndex = this.getPromiseIndex();
      line += promiseIndex + ')';
    }
  }
  const functionName = this.getFunctionName();
  let addSuffix = true;
  const isConstructor = this.isConstructor();
  const isMethodCall = !(this.isToplevel() || isConstructor);
  if (isMethodCall) {
    const typeName = this.getTypeName();
    const methodName = this.getMethodName();
    if (functionName) {
      if (typeName && functionName.indexOf(typeName) != 0) {
        line += typeName + '.';
      }
      line += functionName;
      if (
        methodName &&
        functionName.indexOf('.' + methodName) != functionName.length - methodName.length - 1
      ) {
        line += ' [as ' + methodName + ']';
      }
    } else {
      line += typeName + '.' + (methodName || '<anonymous>');
    }
  } else if (isConstructor) {
    line += 'new ' + (functionName || '<anonymous>');
  } else if (functionName) {
    line += functionName;
  } else {
    line += fileLocation;
    addSuffix = false;
  }
  if (addSuffix) {
    line += ' (' + fileLocation + ')';
  }
  return line;
}
