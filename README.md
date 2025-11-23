<p align="center">
  <img src="assets/logo/lvs-logo-full.png" width="150" alt="LVS Logo"/>
</p>

<h1 align="center"><b>LVS — Living Value System</b></h1>
<p align="center">
  Official website, documentation hub, and MVP demo of the LVS Autonomous Value Layer.
</p>

---

## Overview

This repository hosts the **public website** of  
**LVS — Living Value System**, a new distributed digital-value architecture defined in the official LVS documentation set:

- LVS Whitepaper  
- Technical Architecture :contentReference[oaicite:12]{index=12}  
- Drift Consensus Specification  
- Protocol Specification  
- Developer Guide  
- Security Deep Dive  
- Testnet Launch Plan :contentReference[oaicite:13]{index=13}  
- Research Paper Draft  
- Master Document  
- Pitch Deck  
- Investor One-Pager  

All these documents were imported into the LVS project library and unified into a consistent, up-to-date specification.  
They define the architecture and mechanisms of the **Autonomous Value Layer (AVL)**.

The **lvs.network** website provides:

- public landing page,  
- documentation entry points,  
- legal & governance materials,  
- browser-node MVP demo,  
- assets and branding.  

The **LVS Core implementation** (Rust + TypeScript engines) lives in a separate repo and is licensed independently.

---

## Live Demo

### 🔹 Browser Node (MVP)  
Runs your browser as a real LVS micro-node:

- SDM send/receive  
- drift update  
- peer list  
- VU/TC sync  
- live canvas visualization  
- connection to Rust gateway  

This demo is documented in:

- MVP Architecture  
- Technical Architecture  
- Testnet Launch Plan  

The browser node is a fully working participant of the LVS network.

---

## What LVS Is

According to official documents (Whitepaper, Technical Architecture, Drift Consensus Spec):

LVS is **not blockchain**, **not DAG**, **not BFT**, and has:

- no blocks  
- no mining  
- no history  
- no identity  
- no validators  
- no governance  
- no staking  
- no majority voting  

LVS introduces:

### ✔ Drift-Based Consensus (DBC)  
Nodes exchange SDM packets and converge by correction vectors.  
Documented in Drift Consensus Spec & Technical Architecture.

### ✔ Value State Engine (VU / TC)  
Documented in Protocol Specification.

### ✔ VaultGuard  
Protects value from catastrophic loss (Consensus Spec, Developer Guide).

### ✔ Micro-node architecture  
Browser nodes, Rust nodes, IoT nodes — unified drift engine.

### ✔ Zero-Identity Framework  
System-level anonymity and Sybil-resistance without identity or accounts.

This is the first real implementation of an **Autonomous Value Layer (AVL)**.

---

## Repository Structure

lvs.network/
├── index.html
├── privacy.html # Privacy Policy (GDPR-compliant)
├── terms.html # Terms of Use
├── browser-node.js # MVP browser-node client
├── assets/logo/
├── website/ # Public website content
├── src/ # Text content (EN sections)
├── docs/ # Site-level documents
├── style.css
├── CNAME # Custom domain: lvs.network

├── LICENSE # Combined licensing (from project files)
├── LICENSE_OVERVIEW.md
├── LICENSE_TECHNOLOGY.md
├── SECURITY.md # Security policy (private disclosure) SECURITY
├── CODE_OF_CONDUCT.md # Contributor behavior rules Code of Conduct
├── GOVERNANCE.md # Governance model & LIP flow Governance
├── CONTRIBUTING.md # Contribution workflow & rules Contributing
├── TRADEMARK_POLICY.md # Logo & branding restrictions LVS Trademark Policy

yaml
Копировать код

---

## Legal & Policy Documents

All project policies were imported directly from the LVS core licensing suite  
and reproduced here for the website:

### ✔ LICENSE  
Composite license with:

- Apache 2.0 for documentation  
- Restricted LVS Technology License for protocol/runtime  
:contentReference[oaicite:19]{index=19}

### ✔ LICENSE_OVERVIEW  
Explains dual-license model.

### ✔ LICENSE_TECHNOLOGY  
Defines strict restrictions on LVS Core implementation:
- no deployment  
- no forking  
- no derivative networks  
- no commercial use  
:contentReference[oaicite:20]{index=20}

### ✔ SECURITY  
Private vulnerability disclosure rules (72h acknowledgment).  
:contentReference[oaicite:21]{index=21}

### ✔ CODE OF CONDUCT  
Professional and research-safe environment.  
:contentReference[oaicite:22]{index=22}

### ✔ GOVERNANCE  
Defines the LIP system, change control, and maintainer authority.  
:contentReference[oaicite:23]{index=23}

### ✔ TRADEMARK POLICY  
Restrictions on using LVS name, logos, or visual identity.  
:contentReference[oaicite:24]{index=24}

### ✔ CONTRIBUTING  
How to contribute documentation or simulation improvements.  
:contentReference[oaicite:25]{index=25}

### ✔ PRIVACY POLICY  
Located in `privacy.html`, GDPR-compliant.

### ✔ TERMS OF USE  
Located in `terms.html`.

Все эти документы — часть официального юридического пакета LVS.

---

## Status of the Network

According to your operational documents:

### ✔ First working LVS drift network  
- Rust gateway  
- Rust nodes  
- Browser nodes  
- SDM synchronization  
- drift convergence  
:contentReference[oaicite:26]{index=26}

### ✔ Public MVP demo on lvs.network  
Browser-node now connects to Rust-gateway and acts as a real node.  
:contentReference[oaicite:27]{index=27}

### ✔ Full document suite unified  
Whitepaper, Technical Architecture, Consensus, Dev Guide, Testnet Plan, etc.  
:contentReference[oaicite:28]{index=28}

### ✔ LVS is ready for Testnet Phase 1  
:contentReference[oaicite:29]{index=29}

---

## Contributing

Only documentation, visualization, UI, and website updates are accepted here.

For protocol-level contributions  
→ use the LVS Core repo.

Full contributor rules: **CONTRIBUTING.md**  
:contentReference[oaicite:30]{index=30}

---

## Security

Follow the private disclosure process.  
Do not publish vulnerabilities publicly.

Policy: **SECURITY.md**  
:contentReference[oaicite:31]{index=31}

---

## License

This website follows the composite licensing model:

- Documentation → Apache 2.0  
- Core Technology → LVS Core Technology License  
- Trademarks → fully protected  

Full text: **LICENSE**, **LICENSE_OVERVIEW**, **LICENSE_TECHNOLOGY**  
:contentReference[oaicite:32]{index=32}

---

## Trademarks

“LVS”, “Living Value System”, “LVS Core”, “LVS Network”  
are protected trademarks.  
Usage restrictions: **TRADEMARK_POLICY.md**  
:contentReference[oaicite:33]{index=33}

---

## Contact

Website: https://lvs.network  
Security: security@lvs.network  
Legal: legal@lvs.foundation (placeholder)  

---

<p align="center">
LVS — Autonomous Value Layer, built to survive.
</p>