import { NearBindgen, near, call, view, LookupMap, UnorderedMap, Vector } from 'near-sdk-js';

@NearBindgen({})
class JobChainSBT {
  constructor() {
    this.owner_id = near.currentAccountId();
    this.sbts_per_owner = new LookupMap('spo');
    this.sbt_metadata_by_id = new UnorderedMap('sbt');
  }

  @call({})
  init({ owner_id }) {
    if (this.owner_id) {
      throw new Error("Already initialized");
    }
    this.owner_id = owner_id;
  }

  @call({})
  sbt_mint({ token_id, token_owner_id, token_metadata }) {
    if (near.predecessorAccountId() !== this.owner_id) {
      throw new Error("Only owner can mint");
    }
    if (this.sbt_metadata_by_id.get(token_id)) {
      throw new Error("Token already exists");
    }

    this.sbt_metadata_by_id.set(token_id, token_metadata);

    let tokens_set = this.sbts_per_owner.get(token_owner_id);
    if (!tokens_set) {
      tokens_set = new Vector(`${token_owner_id}-tokens`);
    }
    tokens_set.push(token_id);
    this.sbts_per_owner.set(token_owner_id, tokens_set);

    return token_id;
  }

  @view({})
  sbt_token({ token_id }) {
    let token_metadata = this.sbt_metadata_by_id.get(token_id);
    if (!token_metadata) {
      return null;
    }

    let owner_id = null;
    for (let [account_id, tokens] of this.sbts_per_owner) {
      if (tokens.includes(token_id)) {
        owner_id = account_id;
        break;
      }
    }

    return {
      token_id,
      owner_id,
      metadata: token_metadata
    };
  }

  @view({})
  sbt_tokens_for_owner({ account_id, from_index = 0, limit = 50 }) {
    let tokens_set = this.sbts_per_owner.get(account_id);
    if (!tokens_set) {
      return [];
    }

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
  sbt_supply_for_owner({ account_id }) {
    let tokens_set = this.sbts_per_owner.get(account_id);
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

export default JobChainSBT;