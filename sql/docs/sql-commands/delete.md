# Delete

> DELETE deletes rows of a table

```
DELETE FROM table_name [ [ AS ] alias ]
    [ WHERE condition ]
    [ RETURNING * | output_expression [ [ AS ] output_name ] [, ...] ]
```

## Description

DELETE deletes rows that satisfy the WHERE clause from the specified table. If the WHERE clause is absent, the effect is to delete all rows in the table. The result is a valid, but empty table.
Tip

There are two ways to delete rows in a table using information contained in other tables in the database: using sub-selects, or specifying additional tables in the USING clause. Which technique is more appropriate depends on the specific circumstances.

The optional RETURNING clause causes DELETE to compute and return value(s) based on each row actually deleted. Any expression using the table's columns can be computed. The syntax of the RETURNING list is identical to that of the output list of SELECT.

You must have the DELETE privilege on the table to delete from it, as well as the SELECT privilege for any table in the USING clause or whose values are read in the condition.

## Parameters

### table_name

    The name of the table to delete rows from.

#### alias

    A substitute name for the target table. When an alias is provided, it completely hides the actual name of the table. For example, given DELETE FROM foo AS f, the remainder of the DELETE statement must refer to this table as f not foo.

### condition

    An expression that returns a value of type boolean. Only rows for which this expression returns true will be deleted.

### output_expression

    An expression to be computed and returned by the DELETE command after each row is deleted. The expression can use any column names of the table named by table_name. Write * to return all columns.

### output_name

    A name to use for a returned column.

## Outputs

On successful completion, a DELETE command returns a command tag of the form

```
DELETE count
```

The count is the number of rows deleted. If count is 0, no rows were deleted by the query (this is not considered an error).

If the DELETE command contains a RETURNING clause, the result will be similar to that of a SELECT statement containing the columns and values defined in the RETURNING list, computed over the row(s) deleted by the command.

## Examples

Delete all films but musicals:

```
DELETE FROM films WHERE kind <> 'Musical';
```

Clear the table films:

```
DELETE FROM films;
```

Delete completed tasks, returning full details of the deleted rows:

```
DELETE FROM tasks WHERE status = 'DONE' RETURNING *;
```

Delete the row of tasks on which the cursor c_tasks is currently positioned:

```
DELETE FROM tasks WHERE CURRENT OF c_tasks;
```
