import * as anchor from "@project-serum/anchor";
import * as assert from "assert";
import {Enums} from '../target/types/enums';
const { SystemProgram } = anchor.web3;

describe("Enums", () => {
  anchor.setProvider(anchor.Provider.local());
  const program:anchor.Program<Enums> = anchor.workspace.Enums;

  const accKeypair = anchor.web3.Keypair.generate();
  const {publicKey:player} = accKeypair;
  const {publicKey:authority} = program.provider.wallet;

  //simple enum
  enum Location {
    Up, Down, Left, Right
  }

  enum Color{
    Red, Green
  }

  program.setEnum("location", Location);
  program.setEnum("color", Color);

  interface CarFields{
    modal:string,
    price:number,
    color:Color
  }
  interface CarTypes{
    hatchback:CarFields,
    suv:CarFields
  }

  //complex Enum 
  const ComplexInfo = {
    Point(x:number, y:number){
      return {point:{x, y}}
    },
    Car(type:string, modal:string, price:number, color:Color){
      return {[type]:{modal, price, color}}
    }
  }

  const PlayerInfo = {
    name:"player:"+Date.now(),
    loc: Location.Left,
    car: ComplexInfo.Car("suv", "Honda City", 6000, Color.Green),
  }

  it("Create player account!", async () => {
    
    const tx = await program.rpc.initialize(
      PlayerInfo.name,
      PlayerInfo.loc,
      PlayerInfo.car,
      {
      accounts: {
        player,
        authority,
        systemProgram: SystemProgram.programId,
      },
      signers: [accKeypair],
    });

    console.log("Create player account: transaction signature", tx);
  });

  it("Fetch player", async () => {
    const account = await program.account.player.fetch(player)
    .catch(err=>{
      assert.throws(err, "Could not fetch player account");
    })
    assert.ok(account, "Player account not found")

    console.log("account", account)
    console.log("account.loc", account.loc)
    console.log("account.car", account.car)

    assert.strictEqual(account.name, PlayerInfo.name, "Player name doesn't match")
    assert.strictEqual(account.loc, PlayerInfo.loc, "Player location doesn't match");
  })

  it("Change player facing to upward", async () => {
    const tx = await program.rpc.updateLocation(Location.Up, {
      accounts: {
        player,
        authority
      }
    })
    console.log("Update player account: transaction signature", tx);
  })

  it("Checking player facing upward", async () => {
    const account = await program.account.player.fetch(player)
    .catch(err=>{
      assert.throws(err, "Could not fetch player account");
    })
    assert.ok(account, "Player account not found")
    assert.strictEqual(account.name, PlayerInfo.name, "Player name doesn't match")
    assert.strictEqual(account.loc, Location.Up, "Player is not facing upward")
  })
  
  it(`Change player location to Point(30, 50)`, async () => {
    const tx = await program.rpc.updateLocation(ComplexInfo.Point(30, 50), {
      accounts: {
        player,
        authority
      }
    })
    console.log("Update player account: transaction signature", tx);
  })

  it(`Check player is located at Point(30, 50)`, async () => {

    const account = await program.account.player.fetch(player)
    .catch(err=>{
      assert.throws(err, "Could not fetch player account");
    })
    assert.ok(account, "Player account not found")

    assert.strictEqual(account.name, PlayerInfo.name, "Player name doesn't match")
    
    let {point: p1} = account.loc as {point:{x:number, y:number}};
    let {point: p2} = ComplexInfo.Point(30, 50);

    assert.ok(p1.x==p2.x&&p1.y==p2.y, `Player is not located at Point(30, 50): ${JSON.stringify(account.loc)}`)
  })
  
  it(`Change player car to ComplexInfo.Car("hatchback", "A1", 3455, Color.Red)`, async () => {
    const tx = await program.rpc.updateCar(ComplexInfo.Car("hatchback", "A1", 3455, Color.Red), {
      accounts: {
        player,
        authority
      }
    })
    console.log("Update player account: transaction signature", tx);
  })

  it(`Check player car`, async () => {

    const account = await program.account.player.fetch(player)
    .catch(err=>{
      assert.throws(err, "Could not fetch player account");
    })
    assert.ok(account, "Player account not found")

    assert.strictEqual(account.name, PlayerInfo.name, "Player name doesn't match")

    type HatchbackCar = Pick<CarTypes, "hatchback">;
    let {hatchback: c1} = account.car as unknown as HatchbackCar;
    let {hatchback: c2} = ComplexInfo.Car("hatchback", "A1", 3455, Color.Red);

    console.log("updated car is:", account.car)
    assert.ok(
      c1.modal==c2.modal &&
      c1.price==c2.price &&
      c1.color==c2.color,
      `Player car is different: ${JSON.stringify(account.car)}`)
  })

});
