This builds the existing Next.js application, not either reference repository.
Run the frozen pnpm install, tests, Next webpack production build and PG16/browser
qualification before building release/Dockerfile from this root. Base image and
runtime parser dependencies are pinned. This Dockerfile uses the prebuilt Next
standalone output. Never mount production credentials in the build.
