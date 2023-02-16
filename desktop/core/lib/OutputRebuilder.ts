import { IOutputChangeRecord } from '@ulixee/hero-core/models/OutputTable';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

export interface IOutputSnapshot {
  output: any;
  bytes: number;
  changes: { type: string; path: string }[];
}

export default class OutputRebuilder {
  private snapshotsByCommandId = new Map<number, IOutputSnapshot>();
  private latestCommandId = -1;

  public getLatestSnapshot(commandId?: number): IOutputSnapshot {
    commandId ??= this.latestCommandId;

    for (let id = commandId; id >= 0; id -= 1) {
      if (this.snapshotsByCommandId.has(id)) {
        return this.snapshotsByCommandId.get(id);
      }
    }
  }

  public applyChanges(changes: IOutputChangeRecord[]): void {
    for (const output of changes) {
      const path = parseIfNeeded(output.path) as PropertyKey[];
      if (output.lastCommandId > this.latestCommandId)
        this.latestCommandId = output.lastCommandId;

      const snapshot = this.getSnapshotAtPoint(output.lastCommandId, path);

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
        const order = output.value as unknown as number[];
        if (property) {
          const startArray = propertyOwner[property];
          propertyOwner[property] = order.map(x => startArray[x]);
        } else {
          snapshot.output = order.map(x => snapshot.output[x]);
        }
      } else {
        propertyOwner[property] = output.value;
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
    lastCommandId: number,
    firstPathEntry: PropertyKey[],
  ): IOutputSnapshot {
    let prevCommandId = lastCommandId;
    while (prevCommandId >= 0) {
      if (this.snapshotsByCommandId.has(prevCommandId)) {
        break;
      }
      prevCommandId -= 1;
    }

    let startOutput = this.snapshotsByCommandId.get(prevCommandId)?.output;

    if (!startOutput) {
      if (typeof firstPathEntry[0] === 'number') startOutput = [];
      else startOutput = {};
    } else if (Array.isArray(startOutput)) {
      startOutput = [...startOutput];
    } else {
      startOutput = { ...startOutput };
    }

    if (!this.snapshotsByCommandId.has(lastCommandId)) {
      this.snapshotsByCommandId.set(lastCommandId, {
        output: null,
        changes: [],
        bytes: 0,
      });
    }
    const changeEntry = this.snapshotsByCommandId.get(lastCommandId);
    changeEntry.output = startOutput;
    return changeEntry;
  }
}

function parseIfNeeded(json: string | unknown): unknown {
  if (typeof json === 'string') {
    return TypeSerializer.parse(json);
  }
  return json;
}
