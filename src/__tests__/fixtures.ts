import {
  ApiType,
  FunctionType,
  InterfaceType,
  StructType,
} from "../common/api.ts";

const execute: FunctionType = {
  name: "execute",
  params: [{ name: "command", type: "Uint8Array" }],
  returnType: "Uint8Array",
  returnOptional: false,
  throws: false,
};

const commandHandler: InterfaceType = {
  name: "CommandHandler",
  singleton: true,
  handle: false,
  fold: false,
  functions: [execute],
};

export const commandHandlerApi: ApiType = {
  interfaces: [commandHandler],
  enums: [],
  structs: [],
};

const sourceType: StructType = {
  name: "SourceType",
  properties: [
    { name: "FS", type: "string", enum: true },
    { name: "GIT", type: "string", enum: true },
    { name: "S3", type: "string", enum: true },
    { name: "HTTP", type: "string", enum: true },
  ],
};

const contentType: StructType = {
  name: "ContentType",
  properties: [
    { name: "BLOBS", type: "string", enum: true },
    { name: "CONFIGS", type: "string", enum: true },
  ],
};

const storeSource: StructType = {
  name: "StoreSource",
  properties: [
    { name: "src", type: "string" },
    { name: "typ", type: "SourceType" },
    { name: "content", type: "ContentType" },
  ],
};

const storeCfg: StructType = {
  name: "StoreCfg",
  properties: [{ name: "sources", type: "StoreSource[]" }],
};

const open: FunctionType = {
  name: "open",
  params: [{ name: "cfg", type: "StoreCfg" }],
  returnType: "Store",
  returnOptional: false,
  throws: false,
};

const close: FunctionType = {
  name: "close",
  params: [{ name: "store", type: "Store" }],
  returnType: "void",
  returnOptional: false,
  throws: false,
};

const stores: InterfaceType = {
  name: "Stores",
  singleton: true,
  handle: false,
  fold: false,
  functions: [open, close],
};

const storeStatus: StructType = {
  name: "StoreStatus",
  properties: [
    { name: "ready", type: "boolean" },
    { name: "progress", type: "number" },
  ],
};

const config: FunctionType = {
  name: "config",
  params: [],
  returnType: "StoreCfg",
  returnOptional: false,
  throws: false,
};

const status: FunctionType = {
  name: "status",
  params: [],
  returnType: "StoreStatus",
  returnOptional: false,
  throws: false,
};

const getBlobReader: FunctionType = {
  name: "blobReader",
  params: [{ name: "basePath", type: "string" }],
  returnType: "BlobReader",
  returnOptional: false,
  throws: false,
};

const store: InterfaceType = {
  name: "Store",
  singleton: false,
  handle: true,
  fold: false,
  functions: [config, status, getBlobReader],
};

const path: FunctionType = {
  name: "path",
  params: [],
  returnType: "string",
  returnOptional: false,
  throws: false,
};

const getReadOnlyBlob: FunctionType = {
  name: "readOnlyBlob",
  params: [{ name: "path", type: "string" }],
  returnType: "ReadOnlyBlob",
  returnOptional: false,
  throws: false,
};

const syncBlobsToFs: FunctionType = {
  name: "syncBlobsToFs",
  params: [{ name: "path", type: "string" }],
  returnType: "string",
  returnOptional: false,
  throws: true,
};

const blobReader: InterfaceType = {
  name: "BlobReader",
  singleton: false,
  handle: false,
  fold: true,
  functions: [path, getReadOnlyBlob, syncBlobsToFs],
};

const path2: FunctionType = {
  name: "path",
  params: [],
  returnType: "string",
  returnOptional: false,
  throws: false,
};

const exists: FunctionType = {
  name: "exists",
  params: [],
  returnType: "boolean",
  returnOptional: false,
  throws: false,
};

const size: FunctionType = {
  name: "size",
  params: [],
  returnType: "bigint",
  returnOptional: true,
  throws: false,
};

const readOnlyBlob: InterfaceType = {
  name: "ReadOnlyBlob",
  singleton: false,
  handle: false,
  fold: true,
  functions: [path2, exists, size],
};

export const storesApi: ApiType = {
  interfaces: [stores, store, blobReader, readOnlyBlob],
  enums: [sourceType, contentType],
  structs: [storeCfg, storeSource, storeStatus],
};

export const fixtures = [
  {
    name: "simple command handler",
    api: commandHandlerApi,
  },
  {
    name: "handle and fold",
    api: storesApi,
  },
];
