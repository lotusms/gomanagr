# GoManagr test suite

Tests must **truly test** behavior so they fail when functionality breaks or doesn't work as expected.

## Standards

- **Assert user-visible behavior**: What the user sees (text, errors, success messages) or what happens when they act (submit, click, redirect). Avoid tests that only check "something rendered."
- **Tests must fail when the feature breaks**: If breaking the feature doesn’t turn the test red, the test is too weak — add more specific assertions or test the real flow.
- **Mock only external boundaries**: Router, auth, API/Supabase. Don’t mock the component or logic under test; render the real UI and assert on its output.
- **Name tests by behavior**: e.g. "shows error when password is too short", "displays Full Name when nameView is full".

## Running tests

- `pnpm test` — run all tests  
- `pnpm test -- path/to/test.js` — run a single file  
- `pnpm test:watch` — watch mode  
- `pnpm test:coverage` — coverage report  

## Structure

- `__tests__/pages/` — page-level behavior (login, signup, forgot-password, etc.)
- `__tests__/components/` — component behavior (e.g. UserMenu avatar, display name)
- `__tests__/lib/` — shared logic (getDisplayName, AuthContext logout, ThemeContext, role loading)
- `__tests__/utils/` — pure utils (formatPhone, formatCurrency, emailCheck)

When adding tests, prefer the same structure and ensure they would fail if the described behavior were broken.
