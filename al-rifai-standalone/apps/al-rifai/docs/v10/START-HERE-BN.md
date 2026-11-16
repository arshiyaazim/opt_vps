# Al-Rifa’i — সম্পূর্ণ ওয়েবসাইটের সোর্স-কোড

এই প্যাকেজটি live ওয়েবসাইটের Sites version **10**-এর সম্পূর্ণ committed source।
Website: https://al-rifai.iamazim.com
Commit: 3425b13f640016fdd7171ea1fda1c2d20c13f038

ZIP প্রস্তুত করতে live website, vessel data বা accounts data পরিবর্তন করা হয়নি। `SOURCE-MANIFEST.json`-এ মূল 183টি source file-এর SHA-256 ও size আছে। ওই ফাইলগুলো deployed commit-এর সঙ্গে byte-for-byte মেলে। এই নির্দেশনা ও manifest শুধু export-এর জন্য যোগ করা হয়েছে।

## কী কী আছে

- `app/`: পুরো interface, search/filter, modal, pagination, Accounts, assistant এবং server API routes।
- `components/`, `hooks/`, `public/`: UI components, hooks, styles ও assets।
- `lib/`: register/accounts query logic, number-role parsing adapters, duplicate/source review, assistant এবং read-only Core integration।
- `data/`: bundled vessel/source archive এবং সর্বশেষ Accounts projection। সর্বশেষ Accounts import-এ 7,038টি ledger instruction; 77টি possible-repeat group-এর 155টি candidate totals-এর বাইরে review-তে আছে।
- `db/`, `drizzle/`: D1 schema ও সব 0000–0004 migration, সঙ্গে migration metadata।
- `scripts/`: build/install helpers, WhatsApp-export importers এবং Accounts-only importer।
- `tests/`: parser, Worker API, authentication, source coverage, export এবং duplicate checks।
- `package.json`, `pnpm-lock.yaml`, Vite/TypeScript/Cloudflare configuration এবং মূল documentation।

## চালানোর জন্য

এটি static HTML website নয়; Vinext/React frontend ও Cloudflare Worker API, সঙ্গে D1 database ব্যবহার করে।

প্রয়োজন: Node.js **22.13.0 বা নতুন**, pnpm **11.25.0**। ZIP extract করে project folder-এ terminal খুলুন। pnpm না থাকলে install করুন:

```sh
npm install --global pnpm@11.25.0
```

তারপর:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Fresh local database-এ migrations প্রয়োগ করুন। Linux/VPS-এ project folder থেকে:

```sh
for migration in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$migration" || break
done
```

এটি fresh local database-এর জন্য। Existing database-এ ইতিমধ্যে applied migration আবার চালাবেন না; শুধু pending migrations প্রয়োগ করুন। বিস্তারিত মূল `README.md`-এ আছে।

Local development:

```sh
pnpm dev
```

Portable profile default-এ loopback-only development sign-in আছে। Terminal-এ দেখানো localhost URL-এ `/signin-with-chatgpt?return_to=/` খুলুন। এটি local test identity; production authentication নয়। Versioned source snapshots authenticated reads-এর মাধ্যমে isolated `site_source_snapshots` table-এ idempotently সংরক্ষিত হয়। Legacy/canonical operational records বদলায় না।

## VPS/নিজস্ব production hosting-এর সীমা

- Hosted Sites-এর ChatGPT sign-in ও access policy platform পরিচালনা করে। ZIP-এ authentication provider/session secrets নেই।
- `app/chatgpt-auth.ts` trusted Sites edge-এর `oai-authenticated-user-*` headers পড়ে। সাধারণ VPS-এ client-provided এই headers গ্রহণ করা নিরাপদ authentication নয়। Public VPS deployment-এর আগে বাস্তব session/login authentication বা signature-verified trusted identity proxy লাগবে। Local mock sign-in production-এ ব্যবহার করবেন না।
- Database binding `DB`-কে D1 অথবা একটি পরীক্ষা করা compatible adapter/runtime-এর সঙ্গে যুক্ত করতে হবে। PostgreSQL drop-in replacement নয়।
- `pnpm start` built Worker-কে localhost Wrangler preview-তে চালায়; এটি complete authenticated VPS production deployment নয়।
- এই ZIP current source ও bundled datasets দেয়, আলাদা live D1 backup নয়। Source-এ থাকা archive ও snapshot data retained আছে; কোনো hosting-only database state থাকলে তা আলাদা export করতে হবে।
- আলাদা Fazle Core backend, WhatsApp session/MCP bridge, 9Router এবং credentials এই website-এর external systems; তাদের live connection এই ZIP তৈরি করে না। Core ও model secrets এখানে অন্তর্ভুক্ত নেই।
- Git history, node_modules, generated dist এবং local runtime state বাদ। Dependencies lockfile অনুযায়ী পুনরায় install হবে। মূল WhatsApp export files বা omitted media image bytes পুনরায় import করতে চাইলে original files লাগবে।

## পরীক্ষা ও handoff

এই exact deployed source-এর build, TypeScript ও real Worker API checks আগে পাস করেছে। Accounts-only import-এর 18টি test পাস করেছে; vessel snapshot অপরিবর্তিত যাচাই করা হয়েছে। Export-এর ZIP integrity ও প্রতিটি tracked file-এর hash আবার যাচাই করা হয়েছে।

```sh
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types tests/api.mjs
```

Python importer tests চালাতে original exports/source attestation প্রয়োজন হতে পারে। Source-file identity নিশ্চিত না হলে Accounts parsing fail-closed থাকতে হবে। Payout mobile দিয়ে employee তৈরি/match করা যাবে না। Duplicate candidates বা raw evidence নীরবে delete করবেন না।

App-specific operational rules ও পরবর্তী এজেন্টের নির্দেশনা: `README-OPERATIONS.md`। মূল framework/local setup: `README.md`। প্যাকেজে ব্যক্তিগত business/source data আছে; প্রয়োজনমতো সীমিত access-এ রাখুন।
