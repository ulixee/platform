import IAstPartialMapper from '../interfaces/IAstPartialMapper';
import { ReplaceReturnType } from './utils';
export declare type IAstPartialVisitor = {
    [key in keyof IAstPartialMapper]: ReplaceReturnType<IAstPartialMapper[key], any>;
};
export declare type IAstFullVisitor = {
    [key in keyof IAstPartialVisitor]-?: IAstPartialVisitor[key];
};
export declare type IAstVisitor = IAstFullVisitor & {
    super(): IAstVisitor;
};
/**
 * Builds an AST visitor based on the default implementation, merged with the one you provide.
 *
 * Example of visitor which counts references to a column 'foo':
 *
 * ```ts
 * let cnt = 0;
 * const visitor = astVisitor(v => ({
 *      ref: r => {
 *          if (r.name === 'foo') {
 *              cnt++;
 *          }
 *          v.super().ref(r);
 *      }
 *  }));
 *
 * visitor.statement(myStatementToCount);
 * console.log(`${cnt} references to foo !`);
 * ```
 */
export declare function astVisitor<T extends IAstPartialVisitor = IAstPartialVisitor>(visitorBuilder: (defaultImplem: IAstVisitor) => T): IAstVisitor;
