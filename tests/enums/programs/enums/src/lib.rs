use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");


#[program]
mod enums {
    use super::*;

    pub fn initialize(
        ctx: Context<Create>,
        name:String,
        loc:Location,
        car:Car
    ) -> ProgramResult {
        let player = &mut ctx.accounts.player;
        player.authority = *ctx.accounts.authority.key;
        player.name = name;
        player.loc = loc;
        player.car = car;
        Ok(())
    }
    pub fn update_location(ctx: Context<Change>, loc:Location) -> ProgramResult {
        let player = &mut ctx.accounts.player;
        player.loc = loc;
        Ok(())
    }
    pub fn update_car(ctx: Context<Change>, car:Car) -> ProgramResult {
        let player = &mut ctx.accounts.player;
        player.car = car;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer = authority, space = 8 + 2000)]
    pub player: Account<'info, Player>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Change<'info> {
    #[account(mut, has_one = authority)]
    pub player: Account<'info, Player>,
    pub authority: Signer<'info>
}


#[account]
pub struct Player {
    pub authority: Pubkey,
    pub name: String,
    pub loc: Location,
    pub car: Car
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Car{
    Suv{ modal:String, price:u32, color:Color },
    Hatchback{ modal:String, price:u32, color:Color },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Location{
    Up,
    Down,
    Left,
    Right,
    Point{x:u32, y:u32}
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Color{
    Red,
    Green
}