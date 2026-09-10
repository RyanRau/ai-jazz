/// <reference path="../pb_data/types.d.ts" />

// Chat history for tony's Chat page. Both collections are superuser-only via
// unset rules -- every read/write goes through pb_hooks/chat.pb.js instead,
// same reasoning as llm_api_keys/llm_usage_logs: it's the only place that
// can encrypt/decrypt `content` around the read/write, so there's no
// declarative rule that would make sense on its own anyway.
//
// Chats are private to their owner -- no admin override. Unlike keys/usage,
// this is personal content, not something an admin needs oversight of.
//
// `content` stores ciphertext (AES via $security.encrypt/decrypt in
// chat.pb.js), so a raw DB dump or backup never has plaintext messages at
// rest. `status` tracks a message through generation -- gateway.py appends
// to an assistant row repeatedly while streaming, so the page (or a return
// visit) can tell "still going" from "done" from "never came back".
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id;

    const chats = new Collection({
      type: "base",
      name: "llm_chats",
      fields: [
        { type: "relation", name: "user", collectionId: usersId, required: true, maxSelect: 1 },
        { type: "text", name: "title", required: true, max: 200 },
        { type: "text", name: "model", required: true, max: 100 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    app.save(chats);

    app.save(
      new Collection({
        type: "base",
        name: "llm_chat_messages",
        fields: [
          {
            type: "relation",
            name: "chat",
            collectionId: chats.id,
            required: true,
            maxSelect: 1,
          },
          {
            type: "select",
            name: "role",
            required: true,
            maxSelect: 1,
            values: ["user", "assistant"],
          },
          { type: "text", name: "content", max: 100000 },
          {
            type: "select",
            name: "status",
            required: true,
            maxSelect: 1,
            values: ["pending", "streaming", "complete", "error"],
          },
          { type: "number", name: "tokens_in", min: 0 },
          { type: "number", name: "tokens_out", min: 0 },
          { type: "number", name: "response_ms", min: 0 },
          { type: "autodate", name: "created", onCreate: true },
        ],
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
      })
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("llm_chat_messages"));
    app.delete(app.findCollectionByNameOrId("llm_chats"));
  }
);
