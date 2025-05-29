"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = jsonToSchemaCode;
exports.getFieldName = getFieldName;
function jsonToSchemaCode(json, schemaImports) {
    if (!json)
        return undefined;
    if (json.typeName) {
        return parseField(json, schemaImports);
    }
    let js = `{\n`;
    for (const [field, schemaJson] of Object.entries(json)) {
        js += `  ${getFieldName(field)}: ${parseField(schemaJson, schemaImports, 2)},\n`;
    }
    return `${js}}`;
}
function parseField(json, schemaImports, leadingSpaces = 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { typeName, element, fields, values, keys, ...config } = json;
    if (config.optional !== true)
        delete config.optional;
    schemaImports.add(typeName);
    if (typeName === 'object') {
        return parseObjectSchema(json, schemaImports, leadingSpaces);
    }
    if (typeName === 'array') {
        // use shortcut by default
        if (Object.keys(config).length === 0) {
            const field = parseField(element, schemaImports, leadingSpaces);
            return `array(${field})`;
        }
        config.element = element;
    }
    if (typeName === 'record') {
        config.values = values;
        if (keys)
            config.keys = keys;
    }
    let js = `${typeName}(`;
    const configEntries = Object.keys(config).length;
    if (configEntries > 0) {
        js += '{';
        if (configEntries > 1)
            js += '\n';
        for (const [key, value] of Object.entries(config)) {
            if (configEntries > 1) {
                js += spaces(leadingSpaces + 2);
            }
            else {
                js += ' ';
            }
            js += `${getFieldName(key)}: `;
            if (key === 'element' || key === 'values' || key === 'keys') {
                js += `${parseField(value, schemaImports, leadingSpaces + 2)},\n`;
            }
            else {
                js += JSON.stringify(value);
            }
            if (configEntries > 1)
                js += ',\n';
        }
        if (configEntries === 1)
            js += ' ';
        else
            js += spaces(leadingSpaces);
        js += '}';
    }
    return `${js})`;
}
function parseObjectSchema(json, schemaImports, leadingSpaces = 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { typeName, fields, ...config } = json;
    if (config.optional !== true)
        delete config.optional;
    schemaImports.add('object');
    let js = `object({\n`;
    const configEntries = Object.keys(config).length;
    const indented = spaces(leadingSpaces + 2);
    if (configEntries > 0) {
        js += `${indented}fields: {\n`;
    }
    for (const [field, schemaJson] of Object.entries(fields)) {
        js += `${indented}${getFieldName(field)}: ${parseField(schemaJson, schemaImports, leadingSpaces + 2)},\n`;
    }
    if (configEntries > 0) {
        // close fields
        js += '},\n';
        for (const [key, value] of Object.entries(config)) {
            js += `${indented}${getFieldName(key)}: ${JSON.stringify(value)},\n`;
        }
    }
    js += spaces(leadingSpaces);
    return `${js}})`;
}
const identifierRE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function getFieldName(str) {
    if (identifierRE.test(str)) {
        return str;
    }
    return JSON.stringify(str);
}
function spaces(count) {
    let spacesStr = '';
    for (let i = 0; i < count; i += 1)
        spacesStr += ' ';
    return spacesStr;
}
//# sourceMappingURL=jsonToSchemaCode.js.map