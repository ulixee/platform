Ulixee allows you to filter records on any combination of fields, including related models, and supports a variety of conditions.

## equals

```
Value equals n.
```

### Examples


Return all users where name equals "Eleanor"
```
const result = await stream.query({
  command: 'delete',
  from: 'testers'
  where: {
    name: {
      equals: 'Eleanor',
    },
  },
});
```

const result = await stream.query(deleteFrom('testers', {
  where: {
    name: {
      equals: 'Eleanor',
    },
  },
}));
```