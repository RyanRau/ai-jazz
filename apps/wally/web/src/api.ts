import { createApiClient } from "api-client";

export const api = createApiClient({ baseUrl: import.meta.env.VITE_API_URL });

export type PreferredProduct = {
  id: string;
  label: string;
  search_terms: string[];
  walmart_product_id: string;
  notes: string | null;
  created_at: string;
};

type ProductVars = {
  label: string;
  search_terms: string[];
  walmart_product_id: string;
  notes: string | null;
};

export async function fetchProducts(): Promise<PreferredProduct[]> {
  const data = await api.requestJson<{ products: PreferredProduct[] }>("/wally/products");
  return data.products;
}

export async function searchProducts(query: string): Promise<PreferredProduct[]> {
  const data = await api.requestJson<{ products: PreferredProduct[] }>(
    `/wally/products/search?q=${encodeURIComponent(query)}`
  );
  return data.products;
}

export async function insertProduct(vars: ProductVars): Promise<string> {
  const data = await api.requestJson<{ product: PreferredProduct }>("/wally/products", {
    method: "POST",
    body: JSON.stringify(vars),
  });
  return data.product.id;
}

export async function updateProduct(vars: { id: string } & ProductVars): Promise<void> {
  const { id, ...body } = vars;
  await api.requestJson(`/wally/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await api.requestJson(`/wally/products/${id}`, { method: "DELETE" });
}
