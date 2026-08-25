import type { ErmisChat } from "@ermis-network/ermis-chat-sdk";

const configuredClients = new WeakSet<ErmisChat>();

/**
 * Ermis Chat SDK 2.1.0's legacy adapter puts the pagination fields in both the
 * batch-users URL and Axios params. The API rejects the resulting duplicate
 * query fields, so keep the Axios params and remove only their URL duplicates.
 */
export function applyLegacyBatchUsersQueryFix(client: ErmisChat) {
  if (client.endUserApiMode !== "legacy" || configuredClients.has(client)) {
    return client;
  }

  client.axiosInstance.interceptors.request.use((request) => {
    const requestUrl = request.url;
    const requestParams = request.params as Record<string, unknown> | undefined;

    if (!requestUrl || !requestParams) return request;

    const queryStart = requestUrl.indexOf("?");
    if (queryStart === -1) return request;

    const path = requestUrl.slice(0, queryStart);
    if (!path.endsWith("/users/batch")) return request;

    const query = new URLSearchParams(requestUrl.slice(queryStart + 1));

    if (Object.prototype.hasOwnProperty.call(requestParams, "page")) {
      query.delete("page");
    }

    if (Object.prototype.hasOwnProperty.call(requestParams, "page_size")) {
      query.delete("page_size");
    }

    const normalizedQuery = query.toString();
    request.url = normalizedQuery ? `${path}?${normalizedQuery}` : path;

    return request;
  });

  configuredClients.add(client);
  return client;
}
