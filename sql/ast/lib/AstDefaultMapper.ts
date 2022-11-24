// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable max-classes-per-file */
import { IAstMapper } from "./astMapper";
import { arrayNilMap, assignChanged, NotSupported } from './utils';
import * as a from '../interfaces/ISqlNode';
import INil from "../interfaces/INil";
import IAstPartialMapper from "../interfaces/IAstPartialMapper";

export default class AstDefaultMapper implements IAstMapper {

  wrapped?: IAstPartialMapper;
  skipNext?: boolean;

  super(): SkipModifier {
    return new SkipModifier(this);
  }

  statement(val: a.IStatement): a.IStatement | INil {
    switch (val.type) {
      case 'delete':
        return this.delete(val);
      case 'insert':
        return this.insert(val);
      case 'select':
        return this.selection(val);
      case 'update':
        return this.update(val);
      case 'comment':
        return this.comment(val);
      case 'values':
        return this.values(val);
      default:
        throw NotSupported.never(val);
    }
  }

  comment(val: a.ICommentStatement): a.IStatement | INil {
    // not really supported :/
    return val;
  }

  update(val: a.IUpdateStatement): a.IStatement | INil {
    if (!val) {
      return val;
    }
    const table = this.tableRef(val.table);
    if (!table) {
      return null; // nothing to update
    }

    const from = val.from && this.from(val.from);

    const where = val.where && this.expr(val.where);

    const sets = arrayNilMap(val.sets, x => this.set(x));
    if (!sets?.length) {
      return null; // nothing to update
    }
    const returning = arrayNilMap(val.returning, c => this.selectionColumn(c));

    return assignChanged(val, {
      table,
      where,
      sets,
      from,
      returning,
    });
  }

  insert(val: a.IInsertStatement): a.IStatement | INil {
    const into = this.tableRef(val.into);
    if (!into) {
      return null; // nowhere to insert into
    }

    const select = val.insert && this.select(val.insert);

    if (!select) {
      // nothing to insert
      return null;
    }

    const returning = arrayNilMap(val.returning, c => this.selectionColumn(c));

    return assignChanged(val, {
      into,
      insert: select,
      returning,
    });
  }

  delete(val: a.IDeleteStatement): a.IStatement | INil {
    const from = this.tableRef(val.from);
    if (!from) {
      return null; // nothing to delete
    }
    const where = val.where && this.expr(val.where);
    const returning = arrayNilMap(val.returning, c => this.selectionColumn(c));

    return assignChanged(val, {
      where,
      returning,
      from,
    });
  }

  set(st: a.ISetStatement): a.ISetStatement | INil {
    const value = this.expr(st.value);
    if (!value) {
      return null;
    }
    return assignChanged(st, {
      value,
    });
  }

  // =========================================
  // ================ STUFF ==================
  // =========================================

  /** Called when a data type definition is encountered */
  dataType(dataType: a.IDataTypeDef): a.IDataTypeDef {
    return dataType;
  }

  /** Called when an alias of a table is created */
  tableRef(st: a.IQNameAliased): a.IQNameAliased | INil {
    return st;
  }

  // =========================================
  // ============== SELECTIONS ==============
  // =========================================

  select(val: a.ISelectStatement): a.ISelectStatement | INil {
    switch (val.type) {
      case 'select':
        return this.selection(val);
      case 'values':
        return this.values(val);
      default:
        throw NotSupported.never(val);
    }
  }

  selection(val: a.ISelectFromStatement): a.ISelectStatement | INil {
    const from = arrayNilMap(val.from, c => this.from(c));
    const columns = arrayNilMap(val.columns, c => this.selectionColumn(c));
    const where = val.where && this.expr(val.where);
    const groupBy = arrayNilMap(val.groupBy, c => this.expr(c));
    const orderBy = this.orderBy(val.orderBy);
    const limit = assignChanged(val.limit, {
      limit: this.expr(val.limit?.limit),
      offset: this.expr(val.limit?.offset),
    });

    return assignChanged(val, {
      from,
      columns,
      where,
      groupBy,
      orderBy,
      limit,
    });
  }

  orderBy(orderBy: a.IOrderByStatement[] | null | undefined): a.IOrderByStatement[] {
    return arrayNilMap(orderBy, c => {
      const by = this.expr(c.by);
      if (!by) {
        return null;
      }
      if (by === c.by) {
        return c;
      }
      return {
        ...c,
        by,
      };
    });
  }

  from(from: a.IFrom): a.IFrom | INil {
    switch (from.type) {
      case 'table':
        return this.fromTable(from);
      case 'statement':
        return this.fromStatement(from);
      case 'call':
        return this.fromCall(from);
      default:
        throw NotSupported.never(from);
    }
  }

  fromCall(from: a.IFromCall): a.IFrom | INil {
    const call = this.call(from);
    if (!call || call.type !== 'call') {
      return null;
    }
    return assignChanged(from, call);
  }

  fromStatement(from: a.IFromStatement): a.IFrom | INil {
    const statement = this.select(from.statement);
    if (!statement) {
      return null; // nothing to select from
    }
    const join = from.join && this.join(from.join);
    return assignChanged(from, {
      statement,
      join,
    })
  }

  values(from: a.IValuesStatement): a.ISelectStatement | INil {
    const values = arrayNilMap(from.values, x => arrayNilMap(x, y => this.expr(y)));
    if (!values?.length) {
      return null; // nothing to select from
    }
    return assignChanged(from, {
      values,
    });
  }

  join(join: a.IJoinClause): a.IJoinClause | INil {
    const on = join.on && this.expr(join.on);
    if (!on && !join.using) {
      return join;
    }
    return assignChanged(join, {
      on,
    });
  }

  fromTable(from: a.FromTable): a.IFrom | INil {
    const nfrom = this.tableRef(from.name);
    if (!nfrom) {
      return null; // nothing to select from
    }
    const join = from.join && this.join(from.join);
    return assignChanged(from, {
      name: nfrom,
      join,
    })
  }

  selectionColumn(val: a.ISelectedColumn): a.ISelectedColumn | INil {
    const expr = this.expr(val.expr);
    if (!expr) {
      return null; // not selected anymore
    }
    return assignChanged(val, {
      expr,
    });
  }

  // =========================================
  // ============== EXPRESSIONS ==============
  // =========================================

  expr(val: a.IExpr | INil): a.IExpr | INil {
    if (!val) {
      return val;
    }
    switch (val.type) {
      case 'binary':
        return this.binary(val);
      case 'unary':
        return this.unary(val);
      case 'ref':
        return this.ref(val);
      case 'string':
      case 'numeric':
      case 'integer':
      case 'boolean':
      case 'constant':
      case 'null':
        return this.constant(val);
      case 'list':
      case 'array':
        return this.array(val);
      case 'array select':
        return this.arraySelect(val);
      case 'call':
        return this.call(val);
      case 'cast':
        return this.cast(val)
      case 'case':
        return this.case(val);
      case 'member':
        return this.member(val);
      case 'arrayIndex':
        return this.arrayIndex(val);
      case 'ternary':
        return this.ternary(val);
      case 'select':
        return this.select(val);
      case 'keyword':
        return this.valueKeyword(val);
      case 'parameter':
        return this.parameter(val);
      case 'extract':
        return this.extract(val);
      case 'overlay':
        return this.callOverlay(val);
      case 'substring':
        return this.callSubstring(val);
      case 'values':
        return this.values(val);
      case 'default':
        return this.default(val);
      default:
        throw NotSupported.never(val);
    }
  }

  arraySelect(val: a.IExprArrayFromSelect): a.IExprArrayFromSelect {
    const select = this.select(val.select);
    if (!select) {
      return null;
    }
    return assignChanged(val, { select });
  }

  extract(st: a.IExprExtract): a.IExpr | INil {
    const from = this.expr(st.from);
    if (!from) {
      return null;
    }
    return assignChanged(st, { from })
  }

  valueKeyword(val: a.IExprValueKeyword): a.IExpr | INil {
    return val;
  }

  ternary(val: a.IExprTernary): a.IExpr | INil {
    const value = this.expr(val.value);
    const lo = this.expr(val.lo);
    const hi = this.expr(val.hi);
    if (!value || !lo || !hi) {
      return null; // missing a branch
    }
    return assignChanged(val, {
      value,
      lo,
      hi,
    });
  }

  parameter(st: a.IExprParameter): a.IExpr | INil {
    return st;
  }

  arrayIndex(val: a.IExprArrayIndex): a.IExpr | INil {
    const array = this.expr(val.array);
    const index = this.expr(val.index);
    if (!array || !index) {
      return null;
    }
    return assignChanged(val, {
      array,
      index,
    });
  }

  member(val: a.IExprMember): a.IExpr | INil {
    const operand = this.expr(val.operand);
    if (!operand) {
      return null;
    }
    return assignChanged(val, {
      operand,
    });
  }

  case(value: a.IExprCase): a.IExpr | INil {
    const val = value.value && this.expr(value.value);
    const whens = arrayNilMap(value.whens, when => {
      const w = this.expr(when.when);
      const v = this.expr(when.value);
      if (!w || !v) {
        return null;
      }
      return assignChanged(when, {
        value: v,
        when: w,
      });
    });
    if (!whens?.length) {
      return null; // no case
    }
    const els = value.else && this.expr(value.else);

    return assignChanged(value, {
      value: val,
      whens,
      else: els,
    });
  }

  cast(val: a.IExprCast): a.IExpr | INil {
    const operand = this.expr(val.operand);
    if (!operand) {
      return null;
    }
    return assignChanged(val, {
      operand,
    });
  }

  call(val: a.IExprCall): a.IExpr | INil {
    const args = arrayNilMap(val.args, arg => this.expr(arg));
    if (!args) {
      return null;
    }
    const orderBy = this.orderBy(val.orderBy);
    const filter = this.expr(val.filter);
    return assignChanged(val, {
      args,
      orderBy,
      filter,
    });
  }

  callSubstring(val: a.IExprSubstring): a.IExpr | INil {
    return assignChanged(val, {
      value: this.expr(val.value),
      from: this.expr(val.from),
      for: this.expr(val.for),
    })
  }

  callOverlay(val: a.IExprOverlay): a.IExpr | INil {
    return assignChanged(val, {
      value: this.expr(val.value),
      placing: this.expr(val.placing),
      from: this.expr(val.from),
      for: this.expr(val.for),
    })
  }

  array(val: a.IExprList): a.IExpr | INil {
    const expressions = arrayNilMap(val.expressions, exp => this.expr(exp));
    if (!expressions) {
      return null;
    }
    return assignChanged(val, {
      expressions,
    });
  }

  constant(value: a.IExprLiteral): a.IExpr | INil {
    return value;
  }

  default(value: a.IExprDefault): a.IExpr | INil {
    return value;
  }

  /** Called when a reference is used */
  ref(val: a.IExprRef): a.IExpr | INil {
    return val;
  }

  unary(val: a.IExprUnary): a.IExpr | INil {
    const operand = this.expr(val.operand);
    if (!operand) {
      return null;
    }
    return assignChanged(val, {
      operand,
    });
  }

  binary(val: a.IExprBinary): a.IExpr | INil {
    const left = this.expr(val.left);
    const right = this.expr(val.right);
    if (!left || !right) {
      return null;
    }
    return assignChanged(val, {
      left,
      right,
    });
  }
}

// ====== auto implement the replace mechanism
const proto = AstDefaultMapper.prototype as any;

for (const k of Object.getOwnPropertyNames(proto)) {
  const orig = proto[k] as Function;
  if (k === 'constructor' || k === 'super' || typeof orig !== 'function') {
    continue;
  }
  Object.defineProperty(proto, k, {
    configurable: false,
    get() {
      // eslint-disable-next-line func-names
      return function (this: AstDefaultMapper, ...args: []) {
        if (this.skipNext) {
          this.skipNext = false;
          return orig.apply(this, args);
        }
        const impl = (this.wrapped as any)?.[k];
        if (!impl) {
          return orig.apply(this, args);
        }
        return impl.apply(this.wrapped, args);
      }
    }
  });
}

// ====== auto implement the skip mechanism
class SkipModifier extends AstDefaultMapper {
  constructor(readonly parent: AstDefaultMapper) {
    super();
  }
}

for (const k of Object.getOwnPropertyNames(proto)) {
  const orig = proto[k] as Function;
  if (k === 'constructor' || k === 'super' || typeof orig !== 'function') {
    continue;
  }
  Object.defineProperty(SkipModifier.prototype, k, {
    configurable: false,
    get() {
      // eslint-disable-next-line func-names
      return function (this: SkipModifier, ...args: []) {
        this.parent.skipNext = true;
        return orig.apply(this.parent, args);
      }
    }
  });
}
