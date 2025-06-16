module phantom_type::PHANTOM_TYPE;

use sui::coin::{Self, Coin, TreasuryCap};
use sui::url;

public struct PHANTOM_TYPE has drop {}

const DECIMALS: u8 = 0;

fun init(witness: PHANTOM_TYPE, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        DECIMALS,
        b"SYMBOL",
        b"NAME",
        b"DESCRIPTION",
        option::some(url::new_unsafe_from_bytes(b"ICON_URL")),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, ctx.sender())
}

public entry fun mint(
    treasury_cap: &mut TreasuryCap<PHANTOM_TYPE>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient)
}

public entry fun burn(
    treasury_cap: &mut TreasuryCap<PHANTOM_TYPE>,
    c: Coin<PHANTOM_TYPE>,
) {
    coin::burn(treasury_cap, c);
}

public entry fun freeze_treasury_cap(treasury_cap: TreasuryCap<PHANTOM_TYPE>) {
    transfer::public_freeze_object(treasury_cap)
}