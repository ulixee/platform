import { setupAutorunMjsHack } from './lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  IInputFilter,
  IOutputSchema
} = cjsImport;

export {
  IInputFilter, 
  IOutputSchema,
};

export default cjsImport.default;

setupAutorunMjsHack();
