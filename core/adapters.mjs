// adapters.mjs —— CompanionPort 的「宿主侧」薄适配：把任意 MCP callTool 包成 hooks。
//
// 核心（companion.mjs）零依赖、不 import 本文件；宿主（DSH 插件 / CLI 桥）按需 import。
// 本文件只做**形状映射**：不重试、不缓存、不合并结果——失败与超时由 callTool 决定，原样带出。
//
// 用法：
//   import { hindsightHooks } from './adapters.mjs';
//   const ports = resolvePorts({ hooks: { hindsight: hindsightHooks(callTool) } });

/**
 * 通用 MCP hooks 工厂。
 * @param {object} o
 * @param {(name:string,args:object)=>any} o.callTool
 * @param {string} o.searchTool
 * @param {(query:string, opts:object)=>object} [o.searchArgs]
 * @param {(raw:any, query:string)=>object} [o.mapSearch]
 * @param {string} [o.readTool]
 * @param {(id:string, opts:object)=>object} [o.readArgs]
 * @param {(raw:any, id:string)=>object} [o.mapRead]
 */
export function mcpHooks({
  callTool, searchTool,
  searchArgs = (query) => ({ query }),
  mapSearch = (raw, query) => ({ hits: normalizeHits(raw), via: searchTool, query }),
  readTool, readArgs = (id) => ({ id }),
  mapRead = (raw, id) => ({ record: raw, depth: 'summary', id }),
} = {}) {
  if (typeof callTool !== 'function' || !searchTool) throw new Error('mcpHooks 需要 callTool + searchTool');
  return {
    search: (query, opts = {}) => {
      const raw = callTool(searchTool, searchArgs(String(query ?? ''), opts));
      return raw && typeof raw.then === 'function' ? raw.then((r) => mapSearch(r, String(query ?? ''))) : mapSearch(raw, String(query ?? ''));
    },
    read: readTool ? (id, opts = {}) => {
      const raw = callTool(readTool, readArgs(String(id ?? ''), opts));
      return raw && typeof raw.then === 'function' ? raw.then((r) => mapRead(r, String(id ?? ''))) : mapRead(raw, String(id ?? ''));
    } : undefined,
    health: () => ({ ok: true, detail: 'hooks 已注入（不主动探测服务）' }),
  };
}

function normalizeHits(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.hits)) return raw.hits;
  if (Array.isArray(raw.pages)) return raw.pages;
  if (Array.isArray(raw.results)) return raw.results;
  return [];
}

/** Hindsight：仓记忆知识页（只读）。 */
export function hindsightHooks(callTool) {
  return mcpHooks({
    callTool,
    searchTool: 'hindsight_search_knowledge_pages',
    searchArgs: (query, opts) => ({ query, ...(opts.limit ? { limit: opts.limit } : {}) }),
    mapSearch: (raw, query) => ({ hits: normalizeHits(raw), via: 'hindsight', query, degraded: false }),
    readTool: 'hindsight_read_knowledge_page',
    readArgs: (id) => ({ page_id: id }),
    mapRead: (raw, id) => ({ record: raw, depth: 'summary', id, via: 'hindsight' }),
  });
}

/** OpenViking：用户/身份/偏好（只读）。 */
export function openvikingHooks(callTool) {
  return mcpHooks({
    callTool,
    searchTool: 'openviking_search',
    searchArgs: (query, opts) => ({ query, mode: 'list', ...(opts.limit ? { limit: opts.limit } : {}) }),
    mapSearch: (raw, query) => ({ hits: normalizeHits(raw), via: 'openviking', query, degraded: false }),
    readTool: 'openviking_read',
    readArgs: (id) => ({ uris: [id] }),
    mapRead: (raw, id) => ({ record: raw, depth: 'summary', id, via: 'openviking' }),
  });
}
