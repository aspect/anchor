import { IdlEvent, IdlTypeDef } from "../idl";
import { Event } from "../program/event.js";

export * from "./borsh/index.js";
export * from "./spl-token/index.js";

export interface EnumDataObject extends Object{}
export type EnumDataField = (string|number|symbol|EnumEncodeDecodeData)&EnumDataObject;
export type EnumDataKeyTypes = string|number;
export type EnumEncodeDecodeDataImpl = Record<string|number|symbol, EnumDataField>;
export interface EnumEncodeDecodeData extends EnumEncodeDecodeDataImpl{
};

/*
let rootData:EnumEncodeDecodeData = {field:1};
if( typeof rootData.field === 'object' ){
  let childData:EnumEncodeDecodeData = rootData.field;
}
*/

export interface EnumEncoderDecoder{
  encodeInstructionEnums(ixName: string, ix: EnumEncodeDecodeData, nameSpace?:string, methodName?:string):EnumEncodeDecodeData
  decodeInstructionEnums(ixName: string, ix: EnumEncodeDecodeData):EnumEncodeDecodeData
  decodeAccountEnums(accountName:string, ix: EnumEncodeDecodeData):EnumEncodeDecodeData
}

/**
 * Coder provides a facade for encoding and decoding all IDL related objects.
 */
export interface Coder {
  /**
   * Instruction coder.
   */
  readonly instruction: InstructionCoder;

  /**
   * Account coder.
   */
  readonly accounts: AccountsCoder;

  /**
   * Coder for state structs.
   */
  readonly state: StateCoder;

  /**
   * Coder for events.
   */
  readonly events: EventCoder;

  /**
   * Set EnumEncoderDecoder
   */
  setEnumEncoderDecoder(client:EnumEncoderDecoder):void
}

export interface StateCoder {
  encode<T = any>(name: string, account: T): Promise<Buffer>;
  decode<T = any>(ix: Buffer): T;
}

export interface AccountsCoder<A extends string = string> {
  encode<T = any>(accountName: A, account: T): Promise<Buffer>;
  decode<T = any>(accountName: A, ix: Buffer): T;
  decodeUnchecked<T = any>(accountName: A, ix: Buffer): T;
  memcmp(accountName: A, appendData?: Buffer): any;
  size(idlAccount: IdlTypeDef): number;
  /**
   * Set EnumEncoderDecoder
   */
   setEnumEncoderDecoder(client:EnumEncoderDecoder):void
}

export interface InstructionCoder {
  encode(ixName: string, ix: any): Buffer;
  encodeState(ixName: string, ix: any): Buffer;
  /**
   * Set EnumEncoderDecoder
   */
   setEnumEncoderDecoder(client:EnumEncoderDecoder):void
}

export interface EventCoder {
  decode<E extends IdlEvent = IdlEvent, T = Record<string, string>>(
    log: string
  ): Event<E, T> | null;
}
