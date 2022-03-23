import { inflate } from "pako";
import { PublicKey } from "@solana/web3.js";
import Provider, { getProvider } from "../provider.js";
import {
  Idl, idlAddress, decodeIdlAccount, IdlField, IdlType, IdlTypeDefined,
  IdlTypeDef
} from "../idl.js";
import { Coder, BorshCoder, EnumEncoderDecoder, EnumEncodeDecodeData } from "../coder/index.js";
import NamespaceFactory, {
  RpcNamespace,
  InstructionNamespace,
  TransactionNamespace,
  AccountNamespace,
  StateClient,
  SimulateNamespace,
  MethodsNamespace,
} from "./namespace/index.js";
import { utf8 } from "../utils/bytes/index.js";
import { EventManager } from "./event.js";
import { 
  Address, translateAddress, EnumCtor, EnumFieldMaps, EnumField
} from "./common.js";

export * from "./common";
export * from "./context.js";
export * from "./event.js";
export * from "./namespace/index.js";

/**
 * ## Program
 *
 * Program provides the IDL deserialized client representation of an Anchor
 * program.
 *
 * This API is the one stop shop for all things related to communicating with
 * on-chain programs. Among other things, one can send transactions, fetch
 * deserialized accounts, decode instruction data, subscribe to account
 * changes, and listen to events.
 *
 * In addition to field accessors and methods, the object provides a set of
 * dynamically generated properties, also known as namespaces, that
 * map one-to-one to program methods and accounts. These namespaces generally
 *  can be used as follows:
 *
 * ## Usage
 *
 * ```javascript
 * program.<namespace>.<program-specific-method>
 * ```
 *
 * API specifics are namespace dependent. The examples used in the documentation
 * below will refer to the two counter examples found
 * [here](https://github.com/project-serum/anchor#examples).
 */
export class Program<IDL extends Idl = Idl> implements EnumEncoderDecoder{
  /**
   * Async methods to send signed transactions to *non*-state methods on the
   * program, returning a [[TransactionSignature]].
   *
   * ## Usage
   *
   * ```javascript
   * rpc.<method>(...args, ctx);
   * ```
   *
   * ## Parameters
   *
   * 1. `args` - The positional arguments for the program. The type and number
   *    of these arguments depend on the program being used.
   * 2. `ctx`  - [[Context]] non-argument parameters to pass to the method.
   *    Always the last parameter in the method call.
   *
   * ## Example
   *
   * To send a transaction invoking the `increment` method above,
   *
   * ```javascript
   * const txSignature = await program.rpc.increment({
   *   accounts: {
   *     counter,
   *     authority,
   *   },
   * });
   * ```
   * @deprecated
   */
  readonly rpc: RpcNamespace<IDL>;

  /**
   * The namespace provides handles to an [[AccountClient]] object for each
   * account in the program.
   *
   * ## Usage
   *
   * ```javascript
   * program.account.<account-client>
   * ```
   *
   * ## Example
   *
   * To fetch a `Counter` account from the above example,
   *
   * ```javascript
   * const counter = await program.account.counter.fetch(address);
   * ```
   *
   * For the full API, see the [[AccountClient]] reference.
   */
  readonly account: AccountNamespace<IDL>;

  /**
   * The namespace provides functions to build [[TransactionInstruction]]
   * objects for each method of a program.
   *
   * ## Usage
   *
   * ```javascript
   * program.instruction.<method>(...args, ctx);
   * ```
   *
   * ## Parameters
   *
   * 1. `args` - The positional arguments for the program. The type and number
   *    of these arguments depend on the program being used.
   * 2. `ctx`  - [[Context]] non-argument parameters to pass to the method.
   *    Always the last parameter in the method call.
   *
   * ## Example
   *
   * To create an instruction for the `increment` method above,
   *
   * ```javascript
   * const tx = await program.instruction.increment({
   *   accounts: {
   *     counter,
   *   },
   * });
   * ```
   * @deprecated
   */
  readonly instruction: InstructionNamespace<IDL>;

  /**
   * The namespace provides functions to build [[Transaction]] objects for each
   * method of a program.
   *
   * ## Usage
   *
   * ```javascript
   * program.transaction.<method>(...args, ctx);
   * ```
   *
   * ## Parameters
   *
   * 1. `args` - The positional arguments for the program. The type and number
   *    of these arguments depend on the program being used.
   * 2. `ctx`  - [[Context]] non-argument parameters to pass to the method.
   *    Always the last parameter in the method call.
   *
   * ## Example
   *
   * To create an instruction for the `increment` method above,
   *
   * ```javascript
   * const tx = await program.transaction.increment({
   *   accounts: {
   *     counter,
   *   },
   * });
   * ```
   * @deprecated
   */
  readonly transaction: TransactionNamespace<IDL>;

  /**
   * The namespace provides functions to simulate transactions for each method
   * of a program, returning a list of deserialized events *and* raw program
   * logs.
   *
   * One can use this to read data calculated from a program on chain, by
   * emitting an event in the program and reading the emitted event client side
   * via the `simulate` namespace.
   *
   * ## simulate
   *
   * ```javascript
   * program.simulate.<method>(...args, ctx);
   * ```
   *
   * ## Parameters
   *
   * 1. `args` - The positional arguments for the program. The type and number
   *    of these arguments depend on the program being used.
   * 2. `ctx`  - [[Context]] non-argument parameters to pass to the method.
   *    Always the last parameter in the method call.
   *
   * ## Example
   *
   * To simulate the `increment` method above,
   *
   * ```javascript
   * const events = await program.simulate.increment({
   *   accounts: {
   *     counter,
   *   },
   * });
   * ```
   * @deprecated
   */
  readonly simulate: SimulateNamespace<IDL>;

  /**
   * A client for the program state. Similar to the base [[Program]] client,
   * one can use this to send transactions and read accounts for the state
   * abstraction.
   */
  readonly state?: StateClient<IDL>;

  /**
   * The namespace provides a builder API for all APIs on the program.
   * This is an alternative to using namespace the other namespaces..
   */
  readonly methods: MethodsNamespace<IDL>;

  /**
   * Address of the program.
   */
  public get programId(): PublicKey {
    return this._programId;
  }
  private _programId: PublicKey;

  /**
   * IDL defining the program's interface.
   */
  public get idl(): IDL {
    return this._idl;
  }
  private _idl: IDL;

  /**
   * Coder for serializing requests.
   */
  public get coder(): Coder {
    return this._coder;
  }
  private _coder: Coder;

  /**
   * Wallet and network provider.
   */
  public get provider(): Provider {
    return this._provider;
  }
  private _provider: Provider;

  /**
   * Handles event subscriptions.
   */
  private _events: EventManager;

  enumFields:EnumFieldMaps;

  /**
   * get Enum storage
   */
   public get emums(): Map<string, EnumCtor> {
    return this._emums;
  }
  /**
   * Enums storage
   */
  private _emums:Map<string, EnumCtor>

  /**
   * @param idl       The interface definition.
   * @param programId The on-chain address of the program.
   * @param provider  The network and wallet context to use. If not provided
   *                  then uses [[getProvider]].
   */
  public constructor(
    idl: IDL,
    programId: Address,
    provider?: Provider,
    coder?: Coder
  ) {
    programId = translateAddress(programId);

    if (!provider) {
      provider = getProvider();
    }

    // Fields.
    this._idl = idl;
    this._provider = provider;
    this._programId = programId;
    this._coder = coder ?? new BorshCoder(idl);
    this._events = new EventManager(this._programId, provider, this._coder);
    this._coder.setEnumEncoderDecoder(this);
  
    this.enumFields = this.getEnumFields();
    this._emums = new Map();

    // Dynamic namespaces.
    const [rpc, instruction, transaction, account, simulate, methods, state] =
      NamespaceFactory.build(idl, this._coder, programId, provider);
    this.rpc = rpc;
    this.instruction = instruction;
    this.transaction = transaction;
    this.account = account;
    this.simulate = simulate;
    this.methods = methods;
    this.state = state;
  }

  /**
   * Generates a Program client by fetching the IDL from the network.
   *
   * In order to use this method, an IDL must have been previously initialized
   * via the anchor CLI's `anchor idl init` command.
   *
   * @param programId The on-chain address of the program.
   * @param provider  The network and wallet context.
   */
  public static async at<IDL extends Idl = Idl>(
    address: Address,
    provider?: Provider
  ): Promise<Program<IDL>> {
    const programId = translateAddress(address);

    const idl = await Program.fetchIdl<IDL>(programId, provider);
    if (!idl) {
      throw new Error(`IDL not found for program: ${address.toString()}`);
    }

    return new Program(idl, programId, provider);
  }

  /**
   * Fetches an idl from the blockchain.
   *
   * In order to use this method, an IDL must have been previously initialized
   * via the anchor CLI's `anchor idl init` command.
   *
   * @param programId The on-chain address of the program.
   * @param provider  The network and wallet context.
   */
  public static async fetchIdl<IDL extends Idl = Idl>(
    address: Address,
    provider?: Provider
  ): Promise<IDL | null> {
    provider = provider ?? getProvider();
    const programId = translateAddress(address);

    const idlAddr = await idlAddress(programId);
    const accountInfo = await provider.connection.getAccountInfo(idlAddr);
    if (!accountInfo) {
      return null;
    }
    // Chop off account discriminator.
    let idlAccount = decodeIdlAccount(accountInfo.data.slice(8));
    const inflatedIdl = inflate(idlAccount.data);
    return JSON.parse(utf8.decode(inflatedIdl));
  }

  /**
   * Invokes the given callback every time the given event is emitted.
   *
   * @param eventName The PascalCase name of the event, provided by the IDL.
   * @param callback  The function to invoke whenever the event is emitted from
   *                  program logs.
   */
  public addEventListener(
    eventName: string,
    callback: (event: any, slot: number) => void
  ): number {
    return this._events.addEventListener(eventName, callback);
  }

  /**
   * Unsubscribes from the given eventName.
   */
  public async removeEventListener(listener: number): Promise<void> {
    return await this._events.removeEventListener(listener);
  }


  /**
   * set Enum for given name
   *
   * @param name name of Enum constructor
   * @param enumC Enum constructor
   */
  public setEnum(name:string, enumC:EnumCtor){
      let enumCtor = Object.assign(enumC, {
        __value2Keys:new Map(),
        __keys:new Map()
      })
      Object.keys(enumCtor).forEach(key=>{
        if(key == "__value2Keys" || key == "__keys")
            return
        enumCtor.__keys.set(key.toLowerCase(), key)
        enumCtor.__value2Keys.set(enumC[key].toString() , key.toLowerCase());
      })
      this._emums.set(name.toLowerCase(), enumC);
  }
  

  public findEnumCtor(name:string):EnumCtor|undefined{
    return this._emums.get(name)
  }

  public findEnumPoperty(inputData: EnumEncodeDecodeData, field:EnumField){
    //console.log("field:", f)
    let data:EnumEncodeDecodeData|null = null;
    let index = 0, len=field.path.length, name:string="";
    if(!len)
      return
    for (let Name of field.path){
      index++;
      name = Name.toLowerCase();
      if(index == len){
        data = inputData;
      }
      const value = inputData[name];
      if( value === undefined)
        break;
      if(typeof value != "object")
        break;
      inputData = value;
    }

    if(!data)
      return

    let enumCtor = this.findEnumCtor(field.enumName)
    //console.log("enumCtor:", !enumCtor?.__value2Keys, enumCtor)
    if(!enumCtor?.__value2Keys)
      return
    return {enumCtor, data, name};
  }

  public encodeInstructionEnums(ixName: string, ix: EnumEncodeDecodeData){
    let ixname = ixName.toLowerCase();
    let fields = this.enumFields.instruction.get(ixname);
    //console.log("ixName:", ix, "ixName:"+ixName, fields);
    //console.log("this._emums", this._emums);
    (fields??[]).forEach(field=>{
      let info = this.findEnumPoperty(ix, field);
      if(!info)
        return
      const {data, name, enumCtor} = info;
      if(!enumCtor.__value2Keys)
        return
      //console.log("value:", name, data[name])
      let key = enumCtor.__value2Keys.get(data[name].toString());
      //console.log("key:", key)
      if(key){
        data[name] = {[key]:{}}
      }
    })
    //console.log("encodeInstructionEnums:ix", ix)
    return ix;
  }

  public decodeInstructionEnums(ixName: string, ix: EnumEncodeDecodeData){
    return ix;
  }

  public decodeAccountEnums(accountName: string, ix: EnumEncodeDecodeData): EnumEncodeDecodeData {
    let accountname = accountName.toLowerCase();
    let fields = this.enumFields.accounts.get(accountname);
    //console.log("decodeAccountEnums:", accountName, items);
    (fields??[]).forEach(field=>{
      let info = this.findEnumPoperty(ix, field);
      if(!info)
        return
      const {data, name, enumCtor} = info;
      if(!enumCtor.__keys)
        return
      //console.log("decodeAccountEnums:enumCtor:", data, name)
      
      let key = Object.keys(data[name]).shift();
      //console.log("key", key)
      if(!key)
        return
      
      let value = data[name][key];
      if(Array.isArray(value) || Object.keys(value).length){
        //data[name] = value;
        return
      }
      key = enumCtor.__keys.get(key);
      if(key){
        data[name] = enumCtor[key] as keyof typeof enumCtor
      }
    })
    return ix;
  }

  public getEnumFields():EnumFieldMaps{
      let {types} = this.idl
      let result = {accounts: new Map(), instruction:new Map()};
      let hasType = (v):v is IdlField=>{
        return !!v?.type
      }

      let buildIdlField = (list:EnumField[], idlField:IdlField, parents:string[]=[])=>{
        let type:{defined?:string}&IdlType = idlField.type;
        if(!type.defined || !types)
          return
        let subType:IdlTypeDef&{nameLC?:string}|undefined = types.find(t=>t.name == type.defined);
        //console.log("#### 1 : buildIdlField:subType", subType)
        if(subType?.type.kind != "enum")
          return
        let name = idlField.name;
        let enumName = subType.name.toLowerCase();
        let path = [...parents, name];
        list.push({path, enumName});
        subType.type.variants.forEach(variant=>{
          if(!variant.fields)
            return
          let variantPath = [...path, variant.name];
          variant.fields.forEach((field:IdlField|IdlType)=>{
            if(!hasType(field))
              return
            buildIdlField(list, field, variantPath);
          })
        })
      }

      let build = (list:EnumField[], idlTypeDef:IdlTypeDef)=>{
        //if(cc.type.kind == "enum"){
          //console.log("#### 2 :variants", cc.type.kind, cc.type.variants)
          //cc.nameLC = cc.name.toLowerCase();
          //list.push(cc);
        //}else
        if(idlTypeDef.type.kind == "struct"){
          //console.log("#### 3 fields", cc.type.kind, cc.type.fields)
          idlTypeDef.type.fields.forEach(a=>{
              buildIdlField(list, a);
          })
        }
      };

      (this.idl.accounts ?? []).forEach(idlTypeDef=>{
        let name = idlTypeDef.name.toLowerCase();
        let list = result.accounts.get(name);
        if(!list){
            list = [];
            result.accounts.set(name, list);
        }
        build(list, idlTypeDef);
      });

      (this.idl.instructions ?? []).forEach(idlIns=>{
        let name = idlIns.name.toLowerCase();
        let list = result.instruction.get(name);
        if(!list){
            list = [];
            result.instruction.set(name, list);
        }
        idlIns.args.forEach(e=>{
            buildIdlField(list, e)
        });

        //console.log("cc.name, list", cc.name, list)
      });
      return result;
  }
}
