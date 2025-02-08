import { FunctionType, InterfaceType, VarType } from "./api.ts";

export type Type =
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "Uint8Array"
  | "void";

export type TypeMapping = Record<Type, string>;

export type ValueMapping = Record<Type, (value: string) => string>;

export type Special = {
  handle: string[];
  fold: string[];
  folded: {
    [key: string]: {
      params: string[];
      returnType: string;
    };
  };
};

export type BridgeMapping = {
  handle: string;
  closer: string;
  paramIn: (param: VarType) => string;
  paramOut: (param: VarType) => string;
  handles: (type: string) => string;
  handleValue: (type: string) => string;
  typeToName: (type: string) => string;
  cleanup: (type: string) => string;
  folded: (obj: string) => string;
  obj: (type: string, handle: boolean, fold: boolean) => string;
  wrapper: (iname: string, fname: string) => string;
  wrapped: (iname: string, fname: string) => string;
  call: (obj: string, func: string, params: string[]) => string;
  body1: (
    type: string,
    obj: string,
    func: string,
    params: string[]
  ) => string[];
  body2: (
    f: FunctionType,
    obj: string,
    func: string,
    params: string[]
  ) => string[];
  body3: (
    type: string,
    obj: string,
    func: string,
    params: string[]
  ) => string[];

  paramRet: (f: FunctionType) => string[];
  return: (type: string, handle: boolean, fold: boolean) => string;
  funcDef: (
    name: string,
    params: string,
    returns: string,
    body: string
  ) => string;
};

export const typeToLang = (
  type: string,
  mapping: TypeMapping,
  toArray: (type: string) => string,
  toCustom = (type: string) => type
): string => {
  const isArray = type.endsWith("[]");
  const typ = isArray ? type.substring(0, type.length - 2) : type;

  if (!Object.hasOwn(mapping, typ)) {
    if (type.startsWith("[")) {
      throw new Error(`Tuples not supported: ${type}`);
    }
    if (type[0] === type[0].toLowerCase()) {
      throw new Error(`Unknown type: ${type}`);
    }
  }

  const mappedType = Object.hasOwn(mapping, typ)
    ? mapping[typ as Type]
    : toCustom(typ);

  return isArray ? toArray(mappedType) : mappedType;
};

export const valueToLang = (
  type: string,
  value: string,
  prefix: string,
  mapping: ValueMapping,
  toArray: (type: string, value: string) => string,
  toCustom: (type: string, value: string) => string
): string => {
  const isArray = type.endsWith("[]");
  const typ = isArray ? type.substring(0, type.length - 2) : type;

  if (!Object.hasOwn(mapping, typ)) {
    if (type.startsWith("[")) {
      throw new Error(`Tuples not supported: ${type}`);
    }
    if (type[0] === type[0].toLowerCase()) {
      throw new Error(`Unknown type: ${type}`);
    }
  }

  const mappedType = Object.hasOwn(mapping, typ)
    ? mapping[typ as Type](value)
    : toCustom(typ, value);

  return type !== "void"
    ? `${prefix}${mappedType}`
    : isArray
    ? toArray(mappedType, value)
    : mappedType;
};

export const funcToLang = (
  i: InterfaceType,
  f: FunctionType,
  special: Special,
  bridge: BridgeMapping
): string => {
  const func = bridge.wrapped(i.name, f.name);
  const cfunc = bridge.wrapper(i.name, f.name);
  const paramHandle = i.handle ? [bridge.handle] : [];
  const closer =
    f.params.length === 1 &&
    special.handle.includes(f.params[0].type) &&
    f.returnType === bridge.closer;
  const closerHandle = closer
    ? bridge.handleValue(bridge.typeToName(f.params[0].type))
    : "";
  const paramsIn = closer ? [bridge.handle] : f.params.map(bridge.paramIn);
  const paramsOut = closer ? [closerHandle] : f.params.map(bridge.paramOut);
  const obj = bridge.obj(i.name, i.handle, i.fold);

  const cleanup = closer ? bridge.cleanup(closerHandle) : "";
  const returnsNew = [];

  if (special.handle.includes(f.returnType)) {
    returnsNew.push(bridge.body1(f.returnType, obj, func, paramsOut));
  } else if (f.returnOptional || f.throws) {
    returnsNew.push(bridge.body2(f, obj, func, paramsOut));
  } else {
    returnsNew.push(bridge.body3(f.returnType, obj, func, paramsOut));
  }
  const returns = returnsNew.join("\n  ");

  const returnType = bridge.return(
    f.returnType,
    special.handle.includes(f.returnType),
    special.fold.includes(f.returnType)
  );
  const paramsFolded = i.fold ? special.folded[i.name]?.params || [] : [];
  const folded = i.fold ? `${special.folded[i.name]?.returnType || ""}\n` : "";

  const newParams = bridge.paramRet(f);

  if (special.fold.includes(f.returnType)) {
    const multi = Object.hasOwn(special.folded, i.name);
    const params = multi ? special.folded[i.name].params : paramHandle;
    const ret = multi ? special.folded[i.name].returnType : bridge.folded(obj);

    special.folded[f.returnType] = {
      params: [...params, ...paramsIn],
      returnType: bridge.call(ret, func, paramsOut),
    };
    return "";
  }

  const allParams = [
    ...paramsFolded,
    ...paramHandle,
    ...paramsIn,
    ...newParams,
  ].join(", ");

  return bridge.funcDef(
    cfunc,
    allParams,
    returnType,
    `${folded}${returns}${cleanup}`
  );
};
