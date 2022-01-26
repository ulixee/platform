import { IOutputChangeRecord } from '../models/OutputTable';

export interface IOutputSnapshot {
  output: any;
  bytes: number;
  changes: { type: string; path: string }[];
}

export default class OutputRebuilder {
  private snapshotsByExternalId = new Map<number, IOutputSnapshot>();
  private latestExternalId = -1;

  public getLatestSnapshot(externalId?: number): IOutputSnapshot {
    externalId ??= this.latestExternalId;

    for (let id = externalId; id >= 0; id -= 1) {
      if (this.snapshotsByExternalId.has(id)) {
        return this.snapshotsByExternalId.get(id);
      }
    }
  }

  public applyChanges(changes: IOutputChangeRecord[]): void {
    for (const output of changes) {
      const path = parseIfNeeded(output.path) as PropertyKey[];
      if (output.lastExternalId > this.latestExternalId)
        this.latestExternalId = output.lastExternalId;

      const snapshot = this.getSnapshotAtPoint(output.lastExternalId, path);

      let propertyOwner = snapshot.output;
      const property = path.pop();
      // re-build objects up to the last entry so we don't modify previous entries
      for (const entry of path) {
        const existing = propertyOwner[entry];
        if (existing && typeof existing === 'object') {
          if (Array.isArray(existing)) propertyOwner[entry] = [...existing];
          else propertyOwner[entry] = { ...existing };
        }
        propertyOwner = propertyOwner[entry];
      }

      if (output.type === 'delete') {
        if (Array.isArray(propertyOwner)) {
          propertyOwner.splice(property as number, 1);
        } else {
          delete propertyOwner[property];
        }
      } else if (output.type === 'reorder') {
        const order = parseIfNeeded(output.value) as number[];
        if (property) {
          const startArray = propertyOwner[property];
          propertyOwner[property] = order.map(x => startArray[x]);
        } else {
          snapshot.output = order.map(x => snapshot.output[x]);
        }
      } else {
        propertyOwner[property] = parseIfNeeded(output.value);
      }

      let flatPath = '';
      for (const part of path.concat([property])) {
        if (typeof part === 'number') {
          flatPath += `[${part}]`;
        } else if (typeof part === 'string' && part.includes('.')) {
          flatPath += `["${part}"]`;
        } else {
          flatPath += `.${part as string}`;
        }
      }
      snapshot.changes.push({ path: flatPath, type: output.type });
      snapshot.bytes = Buffer.byteLength(JSON.stringify(snapshot.output));
    }
  }

  private getSnapshotAtPoint(
    lastExternalId: number,
    firstPathEntry: PropertyKey[],
  ): IOutputSnapshot {
    let prevExternalId = lastExternalId;
    while (prevExternalId >= 0) {
      if (this.snapshotsByExternalId.has(prevExternalId)) {
        break;
      }
      prevExternalId -= 1;
    }

    let startOutput = this.snapshotsByExternalId.get(prevExternalId)?.output;

    if (!startOutput) {
      if (typeof firstPathEntry[0] === 'number') startOutput = [];
      else startOutput = {};
    } else if (Array.isArray(startOutput)) {
      startOutput = [...startOutput];
    } else {
      startOutput = { ...startOutput };
    }

    if (!this.snapshotsByExternalId.has(lastExternalId)) {
      this.snapshotsByExternalId.set(lastExternalId, {
        output: null,
        changes: [],
        bytes: 0,
      });
    }
    const changeEntry = this.snapshotsByExternalId.get(lastExternalId);
    changeEntry.output = startOutput;
    return changeEntry;
  }
}

function parseIfNeeded(json: string | unknown): unknown {
  if (typeof json === 'string') {
    return JSON.parse(json);
  }
  return json;
}
