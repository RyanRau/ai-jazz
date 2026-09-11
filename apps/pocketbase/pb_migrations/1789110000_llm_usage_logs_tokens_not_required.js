/// <reference path="../pb_data/types.d.ts" />

// tokens_in/tokens_out were `required: true`, but PocketBase's "required"
// check on a NumberField treats 0 as an empty value -- so any usage row
// with 0 tokens on either side (an errored/cancelled generation, a genuine
// zero-token call) was rejected outright by POST /api/custom/llm/usage,
// then endlessly retried and never actually recorded by gateway.py's flush
// loop, which had no way to tell a permanently-invalid row apart from a
// transient failure worth retrying. `min: 0` on both fields already makes
// 0 a legitimate value -- `required` was simply the wrong constraint given
// that; dropping it (not tightening `min`) is what actually fixes it.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("llm_usage_logs");
    collection.fields.getByName("tokens_in").required = false;
    collection.fields.getByName("tokens_out").required = false;
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("llm_usage_logs");
    collection.fields.getByName("tokens_in").required = true;
    collection.fields.getByName("tokens_out").required = true;
    app.save(collection);
  }
);
