# Private conversation inspector

`/conversations` requires the same ChatGPT authentication as the vessel
register. The bundled policy reference mirrors
`MagnusMarine/fazle-core-alrifai/resources/ops/hermes_conversation_profiles.json`
on `feat/hermes-conversation-readonly`; it contains policy, not live records.

The authenticated `/api/conversations` permits GET reads only. Configure
`FAZLE_CORE_CONVERSATION_URL` as a trusted HTTPS Core origin,
`FAZLE_CONVERSATION_READ_BEARER` as Core's dedicated conversation read bearer,
and `FAZLE_CONVERSATION_READ_VERIFIED=true` only after the companion Core
read endpoint has been restored and independently verified. No existing
Core/runner/operational key may be substituted. Secrets stay server-side.

Without that configuration, the Site shows “Live conversation reader not
connected”, while allowing users to inspect relationship policy. No live
conversation or model reply is fabricated. A configured read returns exact
phone/bridge/thread context and bounded evidence; uncertainty remains visible.
No conversation, message input, release decision or action grant is stored by
this feature. There is no send, approve, queue, post or record-update control.

The separate Hermes runner/WhatsApp bridge is outside these repositories. The
inspector does not activate production customer conversation or admin actions.
