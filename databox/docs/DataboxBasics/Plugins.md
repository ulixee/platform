# Plugins

## Properties

## Callbacks

### onStarted?(
    databoxInternal: DataboxInternal<TInput, TOutput>,
    options: IDataboxExecOptions, 
    defaults: any, 
  ): void | Promise<void>;

### onBeforeRun?(databoxObject: DataboxObject<TInput, TOutput>): void | Promise<void>;

### onBeforeClose?(): void | Promise<void>;

### onClose?(): void | Promise<void>;