/**
 * api.js — Real backend API client
 * All calls go to the Spring Boot app running on the SAME host, port 8080.
 * Zero mock data. If a service is unreachable the call rejects and the UI
 * shows a "service unavailable" message.
 *
 * Spring Boot endpoints (from the Java controllers):
 *   Catalog  → GET  /catalog/products?tag=&page=&size=
 *              GET  /catalog/products/{id}
 *              GET  /catalog/tags
 *   Cart     → GET  /cart/{customerId}
 *              POST /cart/{customerId}/items          body: {productId, quantity}
 *              PUT  /cart/{customerId}/items/{itemId} body: {quantity}
 *              DELETE /cart/{customerId}/items/{itemId}
 *   Checkout → GET  /checkout/{customerId}
 *              POST /checkout/{customerId}            body: ShippingAddress
 *              POST /checkout/{customerId}/update     body: {shippingOptionId}
 *              POST /checkout/{customerId}/submit     body: {paymentToken}
 *   Orders   → GET  /orders/{customerId}
 *              GET  /orders/{customerId}/{orderId}
 */

const API_BASE = '';   // same origin — nginx proxies /catalog /cart /checkout /orders to Spring Boot

const SESSION_KEY = 'sss_customer_id';

// ---------- Customer session (UUID stored in sessionStorage) ----------
const Api = (() => {

  function getCustomerId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID()
         : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
             const r = Math.random() * 16 | 0;
             return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
           });
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    // 204 No Content
    if (res.status === 204) return null;
    return res.json();
  }

  const get  = (path)        => request('GET',    path);
  const post = (path, body)  => request('POST',   path, body);
  const put  = (path, body)  => request('PUT',    path, body);
  const del  = (path)        => request('DELETE', path);

  // ---- Catalog ----
  const catalog = {
    getProducts: (params = {}) => {
      const q = new URLSearchParams();
      if (params.tag)  q.set('tag',  params.tag);
      if (params.page !== undefined) q.set('page', params.page);
      if (params.size !== undefined) q.set('size', params.size);
      const qs = q.toString();
      return get(`/catalog/products${qs ? '?' + qs : ''}`);
    },
    getProduct: (id) => get(`/catalog/products/${id}`),
    getTags:    ()   => get('/catalog/tags'),
  };

  // ---- Cart ----
  const cart = {
    get:        ()              => get(`/cart/${getCustomerId()}`),
    addItem:    (productId, qty) => post(`/cart/${getCustomerId()}/items`, { productId, quantity: qty || 1 }),
    updateItem: (itemId, qty)   => put(`/cart/${getCustomerId()}/items/${itemId}`, { quantity: qty }),
    removeItem: (itemId)        => del(`/cart/${getCustomerId()}/items/${itemId}`),
  };

  // ---- Checkout ----
  const checkout = {
    get:    ()            => get(`/checkout/${getCustomerId()}`),
    create: (address)     => post(`/checkout/${getCustomerId()}`, address),
    update: (shippingId)  => post(`/checkout/${getCustomerId()}/update`, { shippingOptionId: shippingId }),
    submit: (payment)     => post(`/checkout/${getCustomerId()}/submit`, payment),
  };

  // ---- Orders ----
  const orders = {
    list:   ()        => get(`/orders/${getCustomerId()}`),
    get:    (orderId) => get(`/orders/${getCustomerId()}/${orderId}`),
  };

  return { getCustomerId, catalog, cart, checkout, orders };
})();