/// <reference path="../pb_data/types.d.ts" />

// Compaction state for a chat: `summary` is a model-generated summary of
// everything before `summarized_through` (a plain `created` timestamp
// cursor, not itself sensitive so left unencrypted), set by
// POST /api/custom/llm/chats/compact. `summary` is encrypted at rest like
// `content` -- it's derived conversation content, same sensitivity.
// gateway.py folds it into the effective system prompt on every later turn
// (see /v1/chat/send), and tony's useChat.ts stops replaying messages at
// or before summarized_through once it's set.
migrate(
  (app) => {
    const chats = app.findCollectionByNameOrId("llm_chats");
    chats.fields.add(
      new TextField({
        name: "summary",
        required: false,
        max: 20000,
      })
    );
    chats.fields.add(
      new TextField({
        name: "summarized_through",
        required: false,
        max: 40,
      })
    );
    app.save(chats);
  },
  (app) => {
    const chats = app.findCollectionByNameOrId("llm_chats");
    chats.fields.removeByName("summary");
    chats.fields.removeByName("summarized_through");
    app.save(chats);
  }
);
