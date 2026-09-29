import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "sorou",
		compatibilityDate: "2025-01-01",
		compatibilityFlags: [
			"nodejs_compat",
		],
		entrypoint: "src/index.ts",
		observability: {
			enabled: true,
			headSamplingRate: 1,
		},
		env: {
			DB: bindings.d1({
				name: "sorou-db",
				id: "a9eabce5-dc4a-40b3-8c05-eb2cb1f553a6",
			}),
		},
	},
});
