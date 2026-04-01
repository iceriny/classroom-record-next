import { defineConfig, loadEnv } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";

function resolveBase(env: Record<string, string>) {
  const explicitBase = env.VITE_BASE_URL;
  if (explicitBase) {
    return explicitBase.endsWith("/") ? explicitBase : `${explicitBase}/`;
  }

  const repoName = env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repoName || repoName.endsWith(".github.io")) {
    return "/";
  }

  return `/${repoName}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: resolveBase(env),
    plugins: [basicSsl(), react()],
    server: {
      host: true,
      https: true,
    },
    preview: {
      host: true,
      https: true,
    },
  };
});
