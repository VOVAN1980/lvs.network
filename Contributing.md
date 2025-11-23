Contributing to LVS Core
Thank you for your interest in contributing to LVS Core, the reference research implementation of the Living Value System (LVS) protocol.
This document explains how to work with the repository, propose improvements, and maintain security and technical quality.
________________________________________
1. Requirements
Before contributing, ensure you have:
•	Node.js 18+
•	npm or yarn
•	Git
•	Basic understanding of TypeScript
•	Familiarity with LVS documentation and research concepts
If you intend to propose protocol-level changes, you should also understand the LIP (LVS Improvement Proposal) structure.
________________________________________
2. Repository Structure
lvs-core/
├── src/          # Core simulation engine (TypeScript)
├── docs/         # Research papers, design docs, diagrams
├── lips/         # LVS Improvement Proposals (LIPs)
├── assets/       # Logos, diagrams, metadata
├── LICENSE
├── SECURITY.md
├── GOVERNANCE.md
├── CODE_OF_CONDUCT.md
└── README.md
________________________________________
3. Setting Up Your Environment
Install dependencies:
npm install
Run the simulation engine:
npm run start
This launches the TypeScript demo with multiple nodes, ticks, and protocol events.
________________________________________
4. Contribution Workflow
Step 1 — Fork the repository
Click Fork on GitHub to create your own copy.
________________________________________
Step 2 — Create a feature branch
git checkout -b feature/my-improvement
Use descriptive names such as:
•	fix/simulation-bug
•	feature/new-validator-event
•	docs/improve-model-description
•	lip/new-proposal-template
________________________________________
Step 3 — Make your changes
Follow our coding and documentation guidelines:
•	keep commits small and focused
•	use TypeScript strict mode
•	write clear and descriptive variable names
•	document complex logic with inline comments
•	avoid unnecessary dependencies
________________________________________
Step 4 — Commit
Use clear commit messages:
git commit -m "Fix state transition bug in consensus simulation"
________________________________________
Step 5 — Push and open a Pull Request
Push your branch:
git push origin feature/my-improvement
Then open a Pull Request (PR) in the main repository.
A Core Maintainer will review your PR and may:
•	request additional changes
•	ask for clarification
•	approve and merge
________________________________________
5. Code Guidelines
TypeScript
•	Always use strict mode
•	Avoid implicit any
•	Prefer type-safe structures
•	Use enums and interfaces where appropriate
Readability
•	Break complex logic into smaller units
•	Add comments to non-trivial algorithmic steps
•	Use consistent naming conventions
Dependencies
•	Do not add new dependencies unless absolutely necessary
•	Avoid heavy or experimental third-party packages
Testing
Currently LVS Core uses simulation-driven testing.
If your change affects consensus flow or state transitions, include:
•	expected behavior
•	clear reproduction steps
•	updated diagrams (if needed)
________________________________________
6. Documentation Contributions
All large documentation updates must go in:
docs/<section>/
Rules:
•	Documentation must be in English
•	Keep diagrams and explanations clean and consistent
•	For major updates, include a summary in the PR description
________________________________________
7. LVS Improvement Proposals (LIPs)
Major protocol changes require a LIP.
A LIP must include:
•	purpose
•	problem statement
•	proposed design
•	security considerations
•	examples / diagrams
•	migration or impact notes
All LIPs live in:
lips/LIP-XXXX-title.md
A Core Maintainer will guide the review process.
________________________________________
8. Security Rules
Security is critical.
By contributing, you must:
Do not
•	disclose vulnerabilities publicly
•	upload PoCs in public PRs
•	modify consensus-critical logic without review
•	introduce unsafe cryptographic patterns
Do
•	report vulnerabilities privately (see SECURITY.md)
•	notify maintainers if you find a security risk
•	follow responsible disclosure practices
________________________________________
9. Licensing Notes
•	Documentation → Apache 2.0
•	Core protocol implementation → Restricted (cannot be deployed or commercially reused)
See the LICENSE and LICENSE_TECHNOLOGY.md files for full details.
Submitting a PR implies you agree that your contribution will be licensed under the project’s applicable licenses.
________________________________________
10. Respectful Conduct
All contributors must follow the LVS Core Code of Conduct.
Abusive, hostile, or unprofessional behavior results in temporary or permanent removal from the project.
________________________________________
11. Thank You
Your contributions help shape the future of the LVS protocol.
We appreciate your effort, your time, and your willingness to improve the ecosystem
