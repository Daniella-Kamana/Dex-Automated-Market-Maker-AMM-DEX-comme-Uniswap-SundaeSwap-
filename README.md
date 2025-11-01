# Dex-Automated-Market-Maker-AMM-DEX-comme-Uniswap-SundaeSwap-


*Un Automated Market Maker (AMM) style Uniswap/SundaeSwap sur Cardano — smart contracts Plutus + DApp front-end.*
Ce README est conçu pour un dépôt GitHub complet — contrats on-chain (Plutus), services off-chain, front-end, tests, déploiement et considérations sécurité.

---

# Table des matières

1. Présentation
2. Fonctionnalités
3. Architecture générale
4. Technologies (On-chain / Off-chain)
5. Contrats intelligents (Plutus) — structure & responsabilités
6. Flux utilisateur & intégrations wallet (CIP-30)
7. Déploiement & tests
8. Sécurité & risques
9. Tokenomics & frais
10. Structure du repo
11. Contribution / Licence

---

## 1. Présentation

Un DEX AMM sur Cardano : échange décentralisé où les utilisateurs échangent directement depuis leur wallet (ex. Nami, Eternl). Les prix sont déterminés par un AMM *constant product* (`x * y = k`). La liquidité est fournie par des LP (Liquidity Providers) qui reçoivent des LP-tokens et perçoivent une part des frais.

---

## 2. Fonctionnalités

* Swap atomique ADA ↔ Token natif (ou token ↔ token via route)
* Dépôt / retrait de liquidité (mint/burn LP tokens)
* Calcul de prix via `x * y = k` (avec marge pour frais)
* Distribution automatique des frais aux LP
* Front-end React/Next.js intégrant CIP-30 wallet API
* Indexation off-chain (Graph-like / Blockfrost) pour UI (TVL, APY, historiques)
* Slippage protection, limites, et estimation de prix
* Tests unitaires / intégration via Plutus emulator
* Scripts de build + CI (GitHub Actions)

---

## 3. Architecture générale

```
User Wallet (Nami / Eternl / Flint)
        ↕ CIP-30
Frontend DApp (React + cardano-serialization-lib)
        ↕
Off-chain services (indexer, relayer, Blockfrost)
        ↕
On-chain: Plutus Validator (Liquidity Pool UTXO)
```

* **On-chain** : un ou plusieurs scripts Plutus (Validator) qui contrôlent les UTXO représentant le pool.
* **Off-chain** : service indexant l’état des pools (TVL, reserves), construisant transactions, fournissant analytics.
* **Frontend** : UI pour swaps, dépôt/retrait, dashboard.

---

## 4. Technologies

### On-chain

* **Plutus (V2)** — contrats validators (Haskell)
* **Cardano CLI** — gestion de transactions / addresses
* **CIP-42 / CIP-30** — wallet dApp connector (usable via Nami/Eternl)
* **Native tokens** — politiques de mint/burn (minting policy pour LP tokens)

### Off-chain / Front-end

* **Haskell** (Plutus contracts, off-chain helpers si souhaité)
* **TypeScript / React / Next.js** — DApp
* **cardano-serialization-lib** — construire/signer tx côté client
* **Blockfrost** (ou Ogmios, Koios) — indexation / RPC
* **Taquito-like libs**: (Cardano-specific libs) — `@emurgo/cardano-serialization-lib`, `lucid` (option), `mesh` (option)
* **Database** : PostgreSQL / Supabase pour analytics
* **GraphQL / REST API** pour endpoint off-chain
* **Docker** pour services

---

## 5. Contrats intelligents (Plutus) — design & responsabilités

### Concepts clés on-chain

* **Pool UTXO** : stocke `reserveA` et `reserveB` ainsi que données (fees accumulés, fee rate, owner/governance)
* **LP Token** : policy mint/burn lorsqu’un LP dépose/retire (représente part)
* **Validator** : vérifie swaps / dépôts / retraits respectent invariants (x*y=k adjusted) et fees
* **Fee account** : une UTXO séparée ou état dans pool pour accumuler fees

### API minimal du validator (concept)

* `Datum` : { reserveA, reserveB, feeRate, poolId, totalLP }
* `Redeemer` : `Swap {amountIn, minAmountOut}`, `ProvideLiquidity {amtA, amtB}`, `WithdrawLiquidity {lpAmount}`
* Vérifications :

  * Swap : nouvelle réserve respecte ` (x - dx) * (y + dy) >= k'` modulo frais
  * Provide : tokens ajoutés proportionnellement à la réserve pour éviter dilution
  * Withdraw : burning LP tokens correspondant à part de réserve

> Remarque : implémenter la logique exacte en Plutus nécessite tests exhaustifs. Les invariants numériques doivent tenir compte d’arrondis et overflow.

---

## 6. Flux utilisateur & intégrations wallet

### Exemples de flux

* **Swap** : UI calcule `amountOut` estimé → construit tx avec sortie vers pool UTXO → wallet signe → envoie via Blockfrost/cardano-node.
* **Provide Liquidity** : utilisateur approuve deux tokens → mint LP tokens on-chain → LP tokens envoyés à user.
* **Withdraw** : burn LP tokens → retirer part des réserves.

### Wallets & API

* **CIP-30** compatible wallets : Nami, Eternl, Flint — intégration via `window.cardano.*.enable()`
* **cardano-serialization-lib** ou **lucid** pour construire tx côté client
* **Blockfrost** (API) ou **Ogimos** pour broadcast & index

---

## 7. Déploiement & tests

### Prérequis

* Nix + Plutus environment (selon `plutus-apps`) **ou** stack/cabal + Plutus tooling
* `cardano-node` (testnet / local cluster)
* `cardano-cli`
* Compte Blockfrost API key (optionnel pour indexation)

### Build contrats (exemple *conceptuel* Plutus)

```bash
# Exemple générique — adapter selon plutus-apps toolchain
cd contracts
cabal build
# Générer .plutus / serialized script
cabal run generate-validator
```

### Tests

* **Plutus emulator tests** (HUnit / Plutus Tx tests)
* **Integration tests** avec `cardano-node` local cluster
* **Property tests** pour invariants (x*y constant adjusted)
* CI: GitHub Actions → run `nix-build` / plutus tests

### Déploiement (testnet → mainnet)

1. Déployer validator script (obtenir script address / hash)
2. Initialiser pool (bootstrap liquidity)
3. Config front-end with pool addresses & Blockfrost key
4. Monitor contracts + analytics

---

## 8. Sécurité & risques

* **Impermanent Loss** — expliquer et afficher outils de simulation pour LP
* **Bugs Smart Contract** — audit externe + formal verification (si possible)
* **Front-end phishing** — signer only with trusted wallets, domain TLS
* **Oracle manipulation** — si oracles utilisés, préférer TWAP & multiple sources
* **Reentrancy / Replay / UTXO draining** — Plutus UTXO model réduit certains risques mais attention à logique de validation
* **Recovery plan** : multisig for governance actions, emergency pausable flags

---

## 9. Tokenomics & frais

* **Fee model** : par swap (ex: 0.3%) — configurable
* **Distribution** : totalité/partie des frais vers LPs, part vers treasury (governance)
* **LP tokens** : mint/burn selon apport/retrait, utilisés pour farming/gov

---

## 10. Structure du repo (exemple)

```
/contracts
  /plutus        # code Haskell / Plutus validators
  /scripts       # build & serialization scripts
/frontend
  /nextjs-dapp   # React + TypeScript + wallet integration
/offchain
  /indexer       # service d'indexation (Blockfrost/Graph)
  /api           # REST/GraphQL for frontend
/tests
  /plutus-tests  # emulator & unit tests
/docs
  ARCHITECTURE.md
  SECURITY.md
.github
  workflows
README.md
```

---

## 11. Exemple de README section "Getting started" (commande)

```bash
# cloner le repo
git clone https://github.com/<votre-org>/cardano-amm.git
cd cardano-amm

# Setup dev environment (option: Nix/plutus-apps recommended)
# Exemple: installer dependencies, cardano-node, blockfrost key env var
export BLOCKFROST_API_KEY=your_key_here

# Build contracts
cd contracts
cabal build

# Lancer emulator / node local
# run tests
cd ../tests
cabal test

# Lancer frontend
cd ../frontend
npm install
npm run dev
# ouvrir http://localhost:3000
```

---

## 12. Contribution & Licence

* Contribuer via issues & PR. Respecter les tests et standards de sécurité.
* Suggéré : Licence **MIT** (ou SPDX selon prefs).

---

## Annexes utiles (à ajouter au repo)

* `ARCHITECTURE.md` détaillant flux UTXO et invariants mathématiques
* `SECURITY.md` checklist d’audit
* Exemple de **spec** du Datum & Redeemer en Haskell
* Scripts d’automatisation (build .plutus files, upload metadata)
* Playground / demo avec faucet sur testnet

---

## Exemple court de Datum & Redeemer (pseudocode Haskell/Plutus)

> *Inclure version réelle en Haskell Plutus dans `/contracts`.*

```haskell
data PoolDatum = PoolDatum
  { reserveA :: Integer
  , reserveB :: Integer
  , feeRate  :: Integer -- basis points, ex: 30 => 0.3%
  , totalLP  :: Integer
  }

data PoolRedeemer = Swap Integer Integer -- amountIn, minOut
                  | Provide Integer Integer -- amtA, amtB
                  | Withdraw Integer -- lpAmount
```

---
