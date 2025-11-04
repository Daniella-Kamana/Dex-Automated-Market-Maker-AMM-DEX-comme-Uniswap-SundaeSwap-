
-- -----------------------
-- Types: Params / Datum / Redeemer
-- -----------------------

-- Validator parameters (example: owner or fee collector)
data AMMParams = AMMParams
    { ammOwner :: PlutusV2.PubKeyHash
    }
    deriving (Show, Generic)

PlutusTx.unstableMakeIsData ''AMMParams
PlutusTx.makeLift ''AMMParams

-- Datum: current pool state (reserves + fee in parts per million)
data AMMDatum = AMMDatum
    { reserveA :: Integer
    , reserveB :: Integer
    , feePpm   :: Integer   -- fee in parts-per-million, e.g. 3000 => 0.3%
    }
    deriving (Show, Generic)

PlutusTx.unstableMakeIsData ''AMMDatum
PlutusTx.makeLift ''AMMDatum
