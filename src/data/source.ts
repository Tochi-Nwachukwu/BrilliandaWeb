// Where the screens' data comes from (docs/data-contract.md). DATA_SOURCE=api puts the screens that
// have backend endpoints on the Brillianda API; anything else keeps every screen on sample data,
// as the browser tests do. The after-v1 screens (teachers, registers, parents, results, the school
// year) have no endpoints yet: with the API on, they say so instead of showing sample data.
export const LIVE = process.env.DATA_SOURCE === "api";
