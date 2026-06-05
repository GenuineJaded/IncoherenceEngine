```markdown
# IncoherenceEngine Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the IncoherenceEngine repository, a TypeScript project built with the Vite framework. You'll learn about file naming, import/export styles, commit message practices, and how to write and organize tests. While no automated workflows were detected, this guide provides suggested commands and step-by-step instructions for common development tasks.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `myComponent.ts`, `userService.ts`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```typescript
    import myHelper from './myHelper';
    ```

### Export Style
- Use **default exports** for modules.
  - Example:
    ```typescript
    // myHelper.ts
    export default function myHelper() { /* ... */ }
    ```

### Commit Messages
- Commit messages are **freeform** (no strict type or prefix required).
- Average commit message length: ~58 characters.
  - Example:
    ```
    Fix bug in user authentication flow
    ```

## Workflows

### Start Development Server
**Trigger:** When you want to run the project locally for development.
**Command:** `/dev`

1. Open your terminal in the project root.
2. Run the Vite development server:
    ```bash
    npm run dev
    ```
3. Visit the provided localhost URL in your browser.

### Build for Production
**Trigger:** When you need to generate a production build.
**Command:** `/build`

1. Open your terminal in the project root.
2. Run the build command:
    ```bash
    npm run build
    ```
3. The output will be in the `dist` directory.

### Run Tests
**Trigger:** When you want to execute the test suite.
**Command:** `/test`

1. Open your terminal in the project root.
2. Run the test command (replace with actual test runner if known):
    ```bash
    npm test
    ```
3. Review the output for passing/failing tests.

## Testing Patterns

- Test files follow the `*.test.*` pattern.
  - Example: `myComponent.test.ts`
- The specific testing framework is **unknown**; check project dependencies for more details.
- Place tests alongside the modules they test or in a dedicated `tests` directory.
- Example test file structure:
    ```typescript
    // myComponent.test.ts
    import myComponent from './myComponent';

    test('should do something', () => {
      expect(myComponent()).toBe(true);
    });
    ```

## Commands
| Command  | Purpose                                 |
|----------|-----------------------------------------|
| /dev     | Start the Vite development server       |
| /build   | Build the project for production        |
| /test    | Run the test suite                     |
```
