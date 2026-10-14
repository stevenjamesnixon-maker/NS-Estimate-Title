# NS Estimate Title

SuiteScript 2.1 User Event that fills the native **Title** field on an Estimate from
`custbody_quote_description` when the Title is blank — in every execution context, so that
Estimates created by the external quoting system through the API get a Title too.

## Canonical reference

**[`docs/context.md`](docs/context.md) is the single source of truth for this project.** Read it
before changing anything. It records the decisions, the fields and parameter, the audit log keys,
the deployment sequence, the test pass and the open items.

If this README and `docs/context.md` disagree, the context document wins. If either disagrees with
the code, the code wins — and the document gets fixed in the same PR.

## Layout

```
src/FileCabinet/SuiteScripts/EstimateTitle/
    qt_ue_estimate_title.js   beforeSubmit on Estimate
docs/context.md               canonical project context
```

The `src/FileCabinet/...` path mirrors the NetSuite File Cabinet exactly. There is no SDF project.

## Conventions

Script file names carry the entry-point type: `qt_ue_<purpose>.js`.

Script records use `customscript_qt_<type>_<purpose>` and deployments
`customdeploy_qt_<type>_<purpose>`.

Every `log.audit` and `log.error` title begins `QT_` — one string to grep the execution log for.

Each script carries a `VERSION` constant and a matching JSDoc `@version` header. Semver.

## Deployment

**Manual File Cabinet upload. Steve deploys — nobody else, and no automated deploy exists.**
Full sequence in [`docs/context.md` §6](docs/context.md).

## Two rules for contributors

1. **Never commit internal IDs.** Numeric list values (such as the OneZone quote type) differ
   between Sandbox and Production and live on the deployment's Excluded Quote Types parameter,
   never in code. Field and script IDs (`title`, `custbody_*`, `customscript_*`) are stable across
   environments and are fine to commit.

2. **Never merge without Steve's explicit instruction.** Work goes on a branch with a PR and
   waits. Steve merges; Steve deploys.
