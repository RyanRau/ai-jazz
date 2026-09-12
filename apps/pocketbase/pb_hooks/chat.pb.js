/// <reference path="../pb_data/types.d.ts" />

// Chat history for tony's Chat page.
//
// Chats are private to their owner -- no admin override, unlike
// llm_api_keys/llm_usage_logs. `content` is encrypted at rest
// ($security.encrypt/decrypt, AES) so a raw DB file or backup never holds
// plaintext messages -- this protects against that kind of leak, not
// against the server operator, since something server-side (gateway.py,
// via the routes below) has to be able to read/write content unattended to
// keep generating a response after you've navigated away. The key comes
// from the CHAT_ENCRYPTION_KEY env var; the fallback below is only for
// local dev against a throwaway database, not real use.
//
// Two of these routes are service-account-only, called by gateway.py, not
// the browser -- it's the only thing that ever creates or appends to a
// message, since it's the thing actually talking to the model. The browser
// only ever reads (GET routes) and POSTs a new turn through the gateway's
// own /v1/chat/send, never directly to PocketBase.
//
// Self-contained auth per handler, no shared top-level function -- same
// reason as llm.pb.js: PocketBase's JSVM doesn't reliably expose a .pb.js
// file's top-level function declarations inside its own routerAdd
// callbacks.

// List your own chats, newest first.
routerAdd(
  "GET",
  "/api/custom/llm/chats",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }

    const encKey = $os.getenv("CHAT_ENCRYPTION_KEY") || "dev-only-insecure-chat-key-32ch!";
    const records = e.app.findRecordsByFilter("llm_chats", "user = {:userId}", "-updated", 0, 0, {
      userId: auth.id,
    });
    const chats = records.map((r) => {
      const summaryCipher = r.getString("summary");
      let summary = "";
      if (summaryCipher) {
        try {
          summary = $security.decrypt(summaryCipher, encKey);
        } catch (err) {
          summary = "";
        }
      }
      return {
        id: r.id,
        title: r.getString("title"),
        model: r.getString("model"),
        system_prompt: r.getString("system_prompt"),
        summary: summary,
        summarized_through: r.getString("summarized_through"),
        created: r.getString("created"),
        updated: r.getString("updated"),
      };
    });
    return e.json(200, { chats: chats });
  },
  $apis.requireAuth()
);

// A chat's messages, oldest first, decrypted. ?chat=<id>, required.
routerAdd(
  "GET",
  "/api/custom/llm/chats/messages",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }

    const chatId = (e.requestInfo().query["chat"] || "").trim();
    if (!chatId) {
      throw new BadRequestError("chat is required.");
    }
    const chat = e.app.findRecordById("llm_chats", chatId);
    if (chat.getString("user") !== auth.id) {
      throw new ForbiddenError("You don't own this chat.");
    }

    const encKey = $os.getenv("CHAT_ENCRYPTION_KEY") || "dev-only-insecure-chat-key-32ch!";
    const records = e.app.findRecordsByFilter(
      "llm_chat_messages",
      "chat = {:chatId}",
      "created",
      0,
      0,
      { chatId: chatId }
    );
    const messages = records.map((r) => {
      const cipher = r.getString("content");
      let content = "";
      if (cipher) {
        try {
          content = $security.decrypt(cipher, encKey);
        } catch (err) {
          content = "";
        }
      }
      const toolCallsCipher = r.getString("tool_calls");
      let toolCalls = [];
      if (toolCallsCipher) {
        try {
          toolCalls = JSON.parse($security.decrypt(toolCallsCipher, encKey));
        } catch (err) {
          toolCalls = [];
        }
      }
      const attachmentsCipher = r.getString("attachments");
      let attachments = [];
      if (attachmentsCipher) {
        try {
          attachments = JSON.parse($security.decrypt(attachmentsCipher, encKey));
        } catch (err) {
          attachments = [];
        }
      }
      return {
        id: r.id,
        role: r.getString("role"),
        content: content,
        status: r.getString("status"),
        tokens_in: r.getInt("tokens_in"),
        tokens_out: r.getInt("tokens_out"),
        response_ms: r.getInt("response_ms"),
        tool_calls: toolCalls,
        attachments: attachments,
        created: r.getString("created"),
      };
    });
    return e.json(200, { messages: messages });
  },
  $apis.requireAuth()
);

// Gateway-facing: start a new turn. Body: { user_id, chat_id?, model,
// content, system_prompt?, attachments? }. Creates the chat first if
// chat_id is empty (title derived from the user's message, system_prompt
// stored on it if given), then the user's own message (encrypted,
// attachments -- gateway.py's already-JSON-encoded string of any documents
// read for this turn -- encrypted the same way) and an assistant
// placeholder (status: "pending") gateway.py will append to as it streams.
// Returns the chat's current system_prompt (freshly set, or whatever an
// existing chat already had) so the gateway can resolve the turn's
// effective system prompt without a separate round trip.
routerAdd(
  "POST",
  "/api/custom/llm/chats/messages/create",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const body = e.requestInfo().body;
    const userId = (body.user_id || "").trim();
    const model = (body.model || "").trim();
    const content = body.content || "";
    if (!userId || !model || !content) {
      throw new BadRequestError("user_id, model, and content are required.");
    }

    let chatId = (body.chat_id || "").trim();
    let chat;
    if (!chatId) {
      const chatsCollection = e.app.findCollectionByNameOrId("llm_chats");
      const title = content.length > 60 ? content.substring(0, 60) + "…" : content;
      chat = new Record(chatsCollection, {
        user: userId,
        title: title,
        model: model,
        system_prompt: body.system_prompt || "",
      });
      e.app.save(chat);
      chatId = chat.id;
    } else {
      chat = e.app.findRecordById("llm_chats", chatId);
      if (chat.getString("user") !== userId) {
        throw new ForbiddenError("You don't own this chat.");
      }
    }

    const encKey = $os.getenv("CHAT_ENCRYPTION_KEY") || "dev-only-insecure-chat-key-32ch!";
    const messagesCollection = e.app.findCollectionByNameOrId("llm_chat_messages");

    const userMessage = new Record(messagesCollection, {
      chat: chatId,
      role: "user",
      content: $security.encrypt(content, encKey),
      status: "complete",
      attachments: body.attachments ? $security.encrypt(body.attachments, encKey) : "",
    });
    e.app.save(userMessage);

    const assistantMessage = new Record(messagesCollection, {
      chat: chatId,
      role: "assistant",
      content: $security.encrypt("", encKey),
      status: "pending",
    });
    e.app.save(assistantMessage);

    const summaryCipher = chat.getString("summary");
    let summary = "";
    if (summaryCipher) {
      try {
        summary = $security.decrypt(summaryCipher, encKey);
      } catch (err) {
        summary = "";
      }
    }

    return e.json(200, {
      chat_id: chatId,
      user_message_id: userMessage.id,
      assistant_message_id: assistantMessage.id,
      system_prompt: chat.getString("system_prompt"),
      summary: summary,
    });
  },
  $apis.requireAuth()
);

// Update an existing chat's system prompt. Body: { chat_id, system_prompt }.
// Owner only -- chats have no admin override, same as every other route in
// this file. Takes effect on the chat's next turn: gateway.py resolves the
// current value fresh from this record via /chats/messages/create each
// time, rather than re-injecting it into messages already generated.
routerAdd(
  "POST",
  "/api/custom/llm/chats/system_prompt",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth) {
      throw new ForbiddenError("Sign-in required.");
    }

    const body = e.requestInfo().body;
    const chatId = (body.chat_id || "").trim();
    if (!chatId) {
      throw new BadRequestError("chat_id is required.");
    }
    const chat = e.app.findRecordById("llm_chats", chatId);
    if (chat.getString("user") !== auth.id) {
      throw new ForbiddenError("You don't own this chat.");
    }
    chat.set("system_prompt", body.system_prompt || "");
    e.app.save(chat);

    return e.json(200, { id: chat.id, system_prompt: chat.getString("system_prompt") });
  },
  $apis.requireAuth()
);

// Gateway-facing: persist a chat's compaction summary. Body: { chat_id,
// summary, summarized_through }. Called by gateway.py's /v1/chat/compact
// once it has a summary back from the model -- there's no direct
// user-facing route for this (unlike system_prompt), since compaction
// always goes through that endpoint to actually produce the summary text.
// summary is encrypted like content/tool_calls; summarized_through (a
// plain `created` timestamp cursor) isn't sensitive on its own, so it's
// stored as-is.
routerAdd(
  "POST",
  "/api/custom/llm/chats/compact",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const body = e.requestInfo().body;
    const chatId = (body.chat_id || "").trim();
    const summary = body.summary || "";
    const summarizedThrough = (body.summarized_through || "").trim();
    if (!chatId || !summary || !summarizedThrough) {
      throw new BadRequestError("chat_id, summary, and summarized_through are required.");
    }

    const encKey = $os.getenv("CHAT_ENCRYPTION_KEY") || "dev-only-insecure-chat-key-32ch!";
    const chat = e.app.findRecordById("llm_chats", chatId);
    chat.set("summary", $security.encrypt(summary, encKey));
    chat.set("summarized_through", summarizedThrough);
    e.app.save(chat);

    return e.json(200, { id: chat.id, summarized_through: chat.getString("summarized_through") });
  },
  $apis.requireAuth()
);

// Gateway-facing: append to a message while streaming (and mark it done).
// Body: { message_id, content, status, tokens_in?, tokens_out?, response_ms?,
// tool_calls?, attachments? }. Called repeatedly with the running content
// while status is "streaming", once more at the end with status "complete"
// -- content is re-encrypted in full each call, not diffed, since a message
// never gets long enough for that to matter. `tool_calls`/`attachments` are
// gateway.py's own already-JSON-encoded strings (search/link records, and
// any write_file output this turn produced, respectively); re-encrypted
// here the same as content, not touched otherwise.
routerAdd(
  "POST",
  "/api/custom/llm/chats/messages/append",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const body = e.requestInfo().body;
    const messageId = (body.message_id || "").trim();
    const status = (body.status || "").trim();
    if (!messageId || !status) {
      throw new BadRequestError("message_id and status are required.");
    }

    const encKey = $os.getenv("CHAT_ENCRYPTION_KEY") || "dev-only-insecure-chat-key-32ch!";
    const message = e.app.findRecordById("llm_chat_messages", messageId);
    message.set("content", $security.encrypt(body.content || "", encKey));
    message.set("status", status);
    if (body.tokens_in !== undefined) message.set("tokens_in", body.tokens_in);
    if (body.tokens_out !== undefined) message.set("tokens_out", body.tokens_out);
    if (body.response_ms !== undefined) message.set("response_ms", body.response_ms);
    if (body.tool_calls) message.set("tool_calls", $security.encrypt(body.tool_calls, encKey));
    if (body.attachments) message.set("attachments", $security.encrypt(body.attachments, encKey));
    e.app.save(message);

    // Bump the parent chat's `updated` so the chat list sorts by recent
    // activity, not just creation.
    const chat = e.app.findRecordById("llm_chats", message.getString("chat"));
    e.app.save(chat);

    return e.json(200, { id: message.id, status: message.getString("status") });
  },
  $apis.requireAuth()
);
