"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
test('should be able to create a string schema', () => {
    const schema = (0, index_1.string)();
    expect(schema.validate('test').success).toBe(true);
    expect(schema.validate(1).success).toBe(false);
});
test('should be able to test an email format', () => {
    const schema = (0, index_1.string)({ format: 'email' });
    expect(schema.validate('test@test.com').success).toBe(true);
    expect(schema.validate('tes').success).toBe(false);
    expect(schema.validate(1).success).toBe(false);
});
test('should be able to specify a url format', () => {
    const schema = (0, index_1.string)({ format: 'url' });
    expect(schema.validate('https://url.com').success).toBe(true);
    expect(schema.validate('test@test.com').success).toBe(false);
    expect(schema.validate('tes').success).toBe(false);
    expect(schema.validate(1).success).toBe(false);
});
test('should be able to specify a date format', () => {
    const schema = (0, index_1.string)({ format: 'date' });
    expect(schema.validate('2022-01-01').success).toBe(true);
    expect(schema.validate('2022-12-31').success).toBe(true);
    expect(schema.validate('2022-12-32').success).toBe(false);
});
test('should be able to specify a time format', () => {
    const schema = (0, index_1.string)({ format: 'time' });
    expect(schema.validate('01:01').success).toBe(true);
    expect(schema.validate('23:59').success).toBe(true);
    expect(schema.validate('24:01').success).toBe(false);
});
test('should be able to validate a string length', () => {
    expect((0, index_1.string)({ length: 5 }).validate('12345').success).toBe(true);
    expect((0, index_1.string)({ length: 5 }).validate('1234').success).toBe(false);
    expect((0, index_1.string)({ maxLength: 5 }).validate('125').success).toBe(true);
    expect((0, index_1.string)({ maxLength: 5 }).validate('123456').success).toBe(false);
    expect((0, index_1.string)({ minLength: 5 }).validate('12345').success).toBe(true);
    expect((0, index_1.string)({ minLength: 5 }).validate('1234').success).toBe(false);
});
test('should be able to validate a regex', () => {
    const schema = (0, index_1.string)({ regexp: /[ABC]{3,5}/ });
    expect(schema.validate('AAA').success).toBe(true);
    expect(schema.validate('acb').success).toBe(false);
});
//# sourceMappingURL=String.test.js.map