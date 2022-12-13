# Insert

> INSERT creates new rows in a table

```
INSERT INTO table_name [ AS alias ] [ ( column_name [, ...] ) ]
    { DEFAULT VALUES | VALUES ( { expression | DEFAULT } [, ...] ) [, ...] | query }
    [ RETURNING * | output_expression [ [ AS ] output_name ] [, ...] ]
```

INSERT inserts new rows into a table. One can insert one or more rows specified by value expressions, or zero or more rows resulting from a query.

The target column names can be listed in any order. If no list of column names is given at all, the default is all the columns of the table in their declared order; or the first N column names, if there are only N columns supplied by the VALUES clause or query. The values supplied by the VALUES clause or query are associated with the explicit or implicit column list left-to-right.

Each column not present in the explicit or implicit column list will be filled with a default value, either its declared default value or null if there is none.

If the expression for any column is not of the correct data type, automatic type conversion will be attempted.

The optional RETURNING clause causes INSERT to compute and return value(s) based on each row actually inserted. This is primarily useful for obtaining values that were supplied by defaults, such as a serial sequence number. However, any expression using the table's columns is allowed. The syntax of the RETURNING list is identical to that of the output list of SELECT. Only rows that were successfully inserted or updated will be returned. For example, if a row was locked but not updated because an ON CONFLICT DO UPDATE ... WHERE clause condition was not satisfied, the row will not be returned.

You must have INSERT privilege on a table in order to insert into it. 

### table_name
The name (optionally schema-qualified) of an existing table.

### alias
A substitute name for table_name. When an alias is provided, it completely hides the actual name of the table. This is particularly useful when ON CONFLICT DO UPDATE targets a table named excluded, since that will otherwise be taken as the name of the special table representing the row proposed for insertion.

### column_name
The name of a column in the table named by table_name. The column name can be qualified with a subfield name or array subscript, if needed. (Inserting into only some fields of a composite column leaves the other fields null.) When referencing a column with ON CONFLICT DO UPDATE, do not include the table's name in the specification of a target column. For example, INSERT INTO table_name ... ON CONFLICT DO UPDATE SET table_name.col = 1 is invalid (this follows the general behavior for UPDATE).

### DEFAULT VALUES
All columns will be filled with their default values, as if DEFAULT were explicitly specified for each column. (An OVERRIDING clause is not permitted in this form.)

### output_expression

An expression to be computed and returned by the INSERT command after each row is inserted or updated. The expression can use any column names of the table named by table_name. Write * to return all columns of the inserted or updated row(s).

### output_name

A name to use for a returned column.

## Compatibility

INSERT conforms to the SQL standard, except that the RETURNING clause is a PostgreSQL extension, as is the ability to use WITH with INSERT, and the ability to specify an alternative action with ON CONFLICT. Also, the case in which a column name list is omitted, but not all the columns are filled from the VALUES clause or query, is disallowed by the standard. If you prefer a more SQL standard conforming statement than ON CONFLICT, see MERGE.

The SQL standard specifies that OVERRIDING SYSTEM VALUE can only be specified if an identity column that is generated always exists. PostgreSQL allows the clause in any case and ignores it if it is not applicable.