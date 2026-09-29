import { bindings, defineConfig } from "cf/config";

/** Production D1 database. */
const productionDatabase = {
	name: "sorou-db",
	id: "a9eabce5-dc4a-40b3-8c05-eb2cb1f553a6",
};

/**
 * Previews do not inherit production bindings, and two Previews that share a D1
 * database id share rows. The PR preview workflow creates a throwaway database
 * per pull request and passes its name and id here so preview traffic never
 * touches the production database.
 * See .github/workflows/pr-preview.yaml.
 */
function previewDatabase(): { name: string; id: string } | undefined {
	const name = process.env.SOROU_PREVIEW_DB_NAME;
	const id = process.env.SOROU_PREVIEW_DB_ID;
	return name && id ? { name, id } : undefined;
}

export default defineConfig(({ isPreview }) => {
	const preview = isPreview ? previewDatabase() : undefined;
	if (isPreview && preview === undefined) {
		throw new Error(
			"SOROU_PREVIEW_DB_NAME and SOROU_PREVIEW_DB_ID are required when building a Preview. " +
				"Run .github/workflows/pr-preview.yaml, or export both variables.",
		);
	}

	return {
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
				DB: bindings.d1(preview ?? productionDatabase),
			},
		},
	};
});
