# Subagent A3 — Auth & Home

## Required reading
1. `plans/master-plan.md` — focus on §2.1 (flow steps 1–3, 14), §4.1 (`/login/`), §6.2 (`useAuthStore`), §6.4 (routes), §6.5 (design tokens + shared UI).
2. `../databus/backend/api/views.py` `LoginView` — confirm the login request/response (`{token, operator_id, first_name, last_name}`; 400 `{error}` on bad creds).
3. Root `SITEMAP.md` for the intended Splash/Login/Profile UX ("Splash: logo, versión"; "Login: credenciales, recuperar contraseña" — recovery is deferred).

## Your mission
Build the **authentication bookends** of the app: the splash gate, the login screen, a minimal home, and the profile/logout screen. Everything routes through `useAuthStore` — you write **no** API/fetch code directly.

## Scope — files you OWN (replace A1's placeholders)
- `app/src/views/SplashPage.vue` — on mount, `await useAuthStore().loadFromStorage()`, then `router.replace` to `/tabs/home` if authenticated else `/login`. Show the Databús logo + a spinner (`<AppLoading>`).
- `app/src/views/LoginPage.vue` — `ion-input` username + password, submit button. Call `authStore.login(username, password)`; on success `router.replace('/tabs/home')`; on `ApiError` show a friendly message via `<AppError>` / an `ion-note`. Disable submit while pending; basic required-field validation. (No password recovery in v0 — leave a disabled/"coming soon" affordance at most.)
- `app/src/views/HomePage.vue` — greet the operator by name (`authStore.session.firstName`). If `useRunStore().activeRun` exists, show a compact status card linking to the Trips tab; otherwise an `<EmptyState>` prompting "Start a run". Keep it minimal — this is not the run UI (that's A4).
- `app/src/views/ProfilePage.vue` — show operator name + `operatorId`; a **Logout** button that calls `authStore.logout()` and `router.replace('/login')`.

## Rules
- Consume A1's shared UI (`<AppLoading>`, `<AppError>`, `<EmptyState>`) and theme tokens — do not hand-roll styles that duplicate them.
- Consume A2's `useAuthStore` and `useRunStore` **by their §6.2 signatures**. If A2's implementation isn't merged yet, code against the interface and use a tiny local mock store, then remove it once A2 lands.
- Do not edit `router/index.ts`, `main.ts`, `package.json`, services, or stores. Need a route/tweak? Note it for A1/A2 in your report.
- `<script setup lang="ts">`, files < 400 lines, explicit error handling (never leave a rejected login unhandled), no secrets.
- **Skills (see master §3.2):** use `/ionic` for form/input/navigation patterns and `/find-docs` (`/ionic-team/ionic-docs`) for exact `IonInput` and router (`useIonRouter`/`router.replace`) APIs — don't rely on memory. The two generator skills (`/capacitor-plugin-generator`, `/build-actions-generator`) are out of scope here.

## Definition of done
- Cold start with no token → Splash → Login; successful login → Home greeting; Logout → back to Login; token survives a reload.
- Login errors render a clear message; no unhandled promise rejections.
- `npm run lint` + `npm run build` pass. Report: components built, store methods consumed, and any interface friction with A2.
