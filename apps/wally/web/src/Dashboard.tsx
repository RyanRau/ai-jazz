import { useState, useEffect, useCallback } from "react";
import { css } from "goober";
import { Flexbox, Header, Text, TextInput, Button, Spinner, Card, useTheme } from "bluestar";
import { fetchProducts, searchProducts, deleteProduct } from "./api";
import type { PreferredProduct } from "./api";
import { useAuth } from "./AuthContext";
import ProductModal from "./ProductModal";

const SEARCH_DEBOUNCE_MS = 250;

export default function Dashboard() {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [products, setProducts] = useState<PreferredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [hasAny, setHasAny] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PreferredProduct | null>(null);

  const loadProducts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = query.trim() ? await searchProducts(query.trim()) : await fetchProducts();
      setProducts(data);
      if (!query.trim()) {
        setHasAny(data.length > 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadProducts(filter), filter ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timeout);
  }, [filter, loadProducts]);

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    await loadProducts(filter);
  };

  const handleEdit = (product: PreferredProduct) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleModalSave = async () => {
    handleModalClose();
    await loadProducts(filter);
  };

  return (
    <div
      className={css`
        max-width: 960px;
        margin: 0 auto;
        padding: 24px 16px;
      `}
    >
      <Flexbox justifyContent="space-between" alignItems="center">
        <Header variant="h1">Wally</Header>
        <Flexbox gap={12} alignItems="center">
          <Text variant="caption">{user?.email}</Text>
          <Button label="Sign Out" type="secondary" density="dense" onClick={() => logout()} />
        </Flexbox>
      </Flexbox>

      <div
        className={css`
          height: 24px;
        `}
      />

      <Flexbox gap={12} alignItems="flex-end">
        <Flexbox grow={1}>
          <TextInput value={filter} onChange={setFilter} placeholder="Search products..." />
        </Flexbox>
        <Button label="Add Product" type="creation" onClick={handleAdd} />
      </Flexbox>

      <div
        className={css`
          height: 16px;
        `}
      />

      {loading ? (
        <Flexbox justifyContent="center" style={{ padding: "48px 0" }}>
          <Spinner size={28} />
        </Flexbox>
      ) : products.length === 0 ? (
        <Flexbox justifyContent="center" style={{ padding: "48px 0" }}>
          <Text variant="body" color={theme.colors.textMuted}>
            {!hasAny && !filter.trim()
              ? "No products yet. Add your first one!"
              : "No products match your search."}
          </Text>
        </Flexbox>
      ) : (
        <Flexbox direction="column" gap={8}>
          {products.map((product) => (
            <Card key={product.id} padding={16}>
              <Flexbox justifyContent="space-between" alignItems="center">
                <Flexbox direction="column" gap={8} grow={1} style={{ minWidth: 0 }}>
                  <Text variant="display">{product.label}</Text>
                  <Flexbox gap={8} flexWrap="wrap">
                    {product.search_terms.map((term) => (
                      <span
                        key={term}
                        className={css`
                          display: inline-block;
                          padding: 2px 8px;
                          border-radius: 12px;
                          background: ${theme.colors.primary}18;
                          color: ${theme.colors.primary};
                          font-size: ${theme.textTypes.caption.size};
                          font-family: ${theme.fonts.body};
                        `}
                      >
                        {term}
                      </span>
                    ))}
                  </Flexbox>
                  <Flexbox gap={4} alignItems="center">
                    <Text variant="caption" color={theme.colors.textMuted}>
                      {product.walmart_product_id.length > 20
                        ? product.walmart_product_id.slice(0, 20) + "..."
                        : product.walmart_product_id}
                    </Text>
                    <a
                      href={`https://www.walmart.com/ip/${product.walmart_product_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css`
                        color: ${theme.colors.primary};
                        font-size: 14px;
                        text-decoration: none;
                        &:hover {
                          text-decoration: underline;
                        }
                      `}
                    >
                      &#8599;
                    </a>
                  </Flexbox>
                </Flexbox>
                <Flexbox gap={8}>
                  <Button
                    label="Edit"
                    type="secondary"
                    density="dense"
                    onClick={() => handleEdit(product)}
                  />
                  <Button
                    label="Delete"
                    type="destructive"
                    density="dense"
                    onClick={() => handleDelete(product.id)}
                  />
                </Flexbox>
              </Flexbox>
            </Card>
          ))}
        </Flexbox>
      )}

      {modalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
