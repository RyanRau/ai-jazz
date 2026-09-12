/// <reference path="../pb_data/types.d.ts" />

// Per-chat saved sampling params -- opt-in, not auto-saved: a chat with no
// `params` just uses the plain defaults (same as Playground today), so
// adjusting params for one message doesn't silently change what the chat
// falls back to next time. Written by the browser directly (POST
// /api/custom/llm/chats/params in chat.pb.js), not by gateway.py -- this is
// pure chat metadata, not part of a model call.
migrate(
  (app) => {
    const chats = app.findCollectionByNameOrId("llm_chats");
    chats.fields.add(
      new JSONField({
        name: "params",
        required: false,
        maxSize: 10000,
      })
    );
    app.save(chats);
  },
  (app) => {
    const chats = app.findCollectionByNameOrId("llm_chats");
    chats.fields.removeByName("params");
    app.save(chats);
  }
);
