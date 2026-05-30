/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SALES_API_BASE_URL?: string;
	readonly VITE_SALES_PARTNER_ENDPOINT?: string;
	readonly VITE_SALES_APP_ENV?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
