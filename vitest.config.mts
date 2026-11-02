import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { BIDWRIGHT_MOCK: "1", BIDWRIGHT_MOCK_DELAY: "0" },
    coverage: { include: ["src/lib/**"], exclude: ["src/lib/**/*.test.ts"] },
  },
});
