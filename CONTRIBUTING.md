# Contributing

Thank you for considering contributing to Lecture Transcript Exporter!

## Development Setup
1. Clone this repository.
2. Run `npm install`
3. Run `npm run build` to generate the `dist/` directory.
4. Load `dist/` as an unpacked extension in Chrome or Firefox.

## Testing
Run `npm test` to execute the vitest suite.

## Adapters
If you are adding a new player adapter:
1. Create a folder in `src/adapters/`
2. Implement an `isMatch` and `extract` method returning standard `ExtractionResult`.
3. Do not include exact sensitive endpoints in code.
4. Ensure it relies only on DOM structure or publicly exposed JSON/VTT endpoints from the player.
