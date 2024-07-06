import { NearBindgen, near, call, view, LookupMap, UnorderedMap, Vector, assert } from 'near-sdk-js';

@NearBindgen({})
class JobChainSBT {

    owner_id: string;

    sbts_per_owner: LookupMap<Vector<string>>;

    sbt_metadata_by_id: UnorderedMap<any>;

    owner_by_sbt: LookupMap<string>;

    constructor() {
        this.owner_id = near.currentAccountId();
        this.sbts_per_owner = new LookupMap<Vector<string>>('spo');
        this.sbt_metadata_by_id = new UnorderedMap('sbt');
        this.owner_by_sbt = new LookupMap<string>('obs');
    }

    @call({})
    init({ owner_id }: { owner_id: string }) {
        assert(!this.owner_id, "Already initialized");
        this.owner_id = owner_id;
    }

    @call({})
    sbt_mint({ token_id, token_owner_id, token_metadata }: { token_id: string, token_owner_id: string, token_metadata: any }) {
        assert(near.predecessorAccountId() === this.owner_id, "Only owner can mint");
        assert(!this.sbt_metadata_by_id.get(token_id), "Token already exists");

        this.sbt_metadata_by_id.set(token_id, token_metadata);

        let tokens_set = this.sbts_per_owner.get(token_owner_id) as Vector<string>;

        if (!tokens_set) {
            tokens_set = new Vector<string>(`${token_owner_id}-tokens`);
        }

        tokens_set.push(token_id);
        this.sbts_per_owner.set(token_owner_id, tokens_set);

        this.owner_by_sbt.set(token_id, token_owner_id); // Set the owner in the reverse lookup map

        return token_id;
    }

    @view({})
    sbt_token({ token_id }: { token_id: string }) {
        let token_metadata = this.sbt_metadata_by_id.get(token_id);

        if (!token_metadata) {
            return null;
        }

        let owner_id = this.owner_by_sbt.get(token_id); // Get the owner from the reverse lookup map

        return {
            token_id,
            owner_id,
            metadata: token_metadata
        };
    }

    @view({})
    sbt_tokens_for_owner({ account_id, from_index, limit }: { account_id: string, from_index?: number, limit?: number }) {
        let tokens_set = this.sbts_per_owner.get(account_id) as Vector<string>;

        if (!tokens_set) {
            return [];
        }

        from_index = from_index || 0;
        limit = limit || 50;

        let tokens = [];

        for (let i = from_index; i < Math.min(from_index + limit, tokens_set.length); i++) {
            let token_id = tokens_set[i];
            let metadata = this.sbt_metadata_by_id.get(token_id);
            tokens.push({
                token_id,
                owner_id: account_id,
                metadata
            });
        }

        return tokens;
    }

    @view({})
    sbt_supply_for_owner({ account_id }: { account_id: string }) {
        let tokens_set = this.sbts_per_owner.get(account_id) as Vector<string>;
        return tokens_set ? tokens_set.length : 0;
    }

    @view({})
    sbt_total_supply() {
        return this.sbt_metadata_by_id.length;
    }

    // Explicitly disable transfer methods to make tokens soulbound
    @call({})
    nft_transfer() {
        throw new Error("Soulbound tokens cannot be transferred");
    }

    @call({})
    nft_transfer_call() {
        throw new Error("Soulbound tokens cannot be transferred");
    }
}

export { JobChainSBT };