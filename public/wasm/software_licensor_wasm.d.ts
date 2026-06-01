/* tslint:disable */
/* eslint-disable */

/**
 * Calls `ExportPkey` and returns the raw response body string.
 */
export function export_pkey(url: string, jwt: string, password: string): Promise<any>;

/**
 * Calls `FetchTempEcdhKey` then `ImportKey` sequentially, reusing the same
 * Cognito JWT for both requests.
 *
 * Cognito JWTs are stateless bearer tokens valid for their full TTL (~1 h);
 * there is no need to mint a separate token per request.
 *
 * Returns a JsValue `response text`.
 */
export function send_private_key(url: string, jwt: string, encrypted_private_key: string, password: string, store_id: string): Promise<any>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly export_pkey: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly send_private_key: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => number;
    readonly __wasm_bindgen_func_elem_537: (a: number, b: number) => void;
    readonly __wasm_bindgen_func_elem_1400: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_552: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
