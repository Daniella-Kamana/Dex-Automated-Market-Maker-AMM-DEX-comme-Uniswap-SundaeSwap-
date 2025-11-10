module Main where
import qualified Data.ByteString.Lazy as BSL
import           Codec.Serialise (serialise)
import qualified Plutus.V2.Ledger.Api as V2
import           AMMValidator -- ton module

main :: IO ()
main = do
  let params = AMMParams { ammOwner = V2.PubKeyHash "<hex-addr>". } -- place un pkh réel
      script = validatorScript params -- selon ton implémentation finale
      sbs = serialise script
  BSL.writeFile "validator.plutus" sbs
  putStrLn "Wrote validator.plutus"

