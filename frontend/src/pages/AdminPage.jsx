import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const EMPTY_EXPENSE = {
  title: "",
  category: "Ingredients",
  amount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

const EMPTY_INVENTORY = {
  name: "",
  unit: "units",
  quantity: "",
  reorderLevel: "",
  unitCost: "",
  supplier: "",
};

const ORDER_LABELS = {
  pending: "Order received",
  confirmed: "Confirmed",
  baking: "Baking",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString()}`;
}

function dateTime(value) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem("nc_admin_token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [inventoryForm, setInventoryForm] = useState(EMPTY_INVENTORY);
  const [editingInventoryId, setEditingInventoryId] = useState(null);

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logout();
      }

      throw new Error(data.error || "Something went wrong.");
    }

    return data;
  }

  async function loadDashboard() {
    const [dashboardData, ordersData, expensesData, inventoryData] =
      await Promise.all([
        request("/api/admin/dashboard"),
        request("/api/admin/orders"),
        request("/api/admin/expenses"),
        request("/api/admin/inventory"),
      ]);

    setDashboard(dashboardData);
    setOrders(ordersData);
    setExpenses(expensesData);
    setInventory(inventoryData);
  }

  useEffect(() => {
    if (!token) return;

    setLoading(true);

    loadDashboard()
      .catch((requestError) => {
        setError(requestError.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function handleLogin(event) {
    event.preventDefault();

    setLoginError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not sign in.");
      }

      localStorage.setItem("nc_admin_token", data.token);
      setToken(data.token);
      setPassword("");
    } catch (loginRequestError) {
      setLoginError(loginRequestError.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("nc_admin_token");
    setToken(null);
    setDashboard(null);
    setOrders([]);
    setExpenses([]);
    setInventory([]);
    setSelectedOrder(null);
  }

  async function refreshData(successMessage = "") {
    setLoading(true);
    setError("");

    try {
      await loadDashboard();

      if (successMessage) {
        setMessage(successMessage);
        window.setTimeout(() => setMessage(""), 3500);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function openOrder(orderCode) {
    setLoading(true);

    try {
      const data = await request(`/api/admin/orders/${orderCode}`);
      setSelectedOrder(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrder(orderCode, updates) {
    setLoading(true);

    try {
      const updated = await request(`/api/admin/orders/${orderCode}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      await refreshData(updated.message);

      const latestOrder = await request(`/api/admin/orders/${orderCode}`);
      setSelectedOrder(latestOrder);
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }

  async function saveExpense(event) {
    event.preventDefault();

    try {
      await request("/api/admin/expenses", {
        method: "POST",
        body: JSON.stringify(expenseForm),
      });

      setExpenseForm(EMPTY_EXPENSE);
      await refreshData("Expense saved successfully.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteExpense(id) {
    if (!window.confirm("Delete this expense?")) return;

    try {
      await request(`/api/admin/expenses/${id}`, {
        method: "DELETE",
      });

      await refreshData("Expense deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveInventory(event) {
    event.preventDefault();

    try {
      const path = editingInventoryId
        ? `/api/admin/inventory/${editingInventoryId}`
        : "/api/admin/inventory";

      await request(path, {
        method: editingInventoryId ? "PATCH" : "POST",
        body: JSON.stringify(inventoryForm),
      });

      setInventoryForm(EMPTY_INVENTORY);
      setEditingInventoryId(null);

      await refreshData(
        editingInventoryId
          ? "Inventory item updated."
          : "Inventory item added."
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startEditingInventory(item) {
    setEditingInventoryId(item.id);
    setInventoryForm({
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      reorderLevel: item.reorder_level,
      unitCost: item.unit_cost ?? "",
      supplier: item.supplier ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteInventory(id) {
    if (!window.confirm("Delete this stock item?")) return;

    try {
      await request(`/api/admin/inventory/${id}`, {
        method: "DELETE",
      });

      await refreshData("Inventory item deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!token) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <p className="admin-eyebrow">Nairobi Crumbery</p>
          <h1>Bakery<br /><em>control room.</em></h1>
          <p className="admin-login-copy">
            Sign in to manage orders, payments, stock, expenses, and bakery sales.
          </p>

          <form onSubmit={handleLogin} className="admin-login-form">
            <label>
              Owner email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your private admin password"
                required
              />
            </label>

            {loginError && <div className="admin-alert admin-alert-error">{loginError}</div>}

            <button type="submit" className="admin-primary-button" disabled={loading}>
              {loading ? "Signing in..." : "Open dashboard"}
              <span>-&gt;</span>
            </button>
          </form>
        </section>
      </main>
    );
  }

  const lowStockItems = inventory.filter(
    (item) => Number(item.quantity) <= Number(item.reorder_level)
  );

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div>
          <p className="admin-eyebrow">Nairobi Crumbery</p>
          <h1>Bakery dashboard</h1>
        </div>

        <div className="admin-topbar-actions">
          <span className="admin-owner-badge">Owner access</span>
          <button className="admin-logout-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        {[
          ["dashboard", "Overview"],
          ["orders", "Orders"],
          ["expenses", "Expenses"],
          ["inventory", "Inventory"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            className={activeTab === tab ? "admin-tab active" : "admin-tab"}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {message && <div className="admin-alert admin-alert-success">{message}</div>}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      {loading && !dashboard ? (
        <div className="admin-loading">Loading your bakery data...</div>
      ) : (
        <>
          {activeTab === "dashboard" && dashboard && (
            <section className="admin-dashboard">
              <div className="admin-welcome-card">
                <div>
                  <p className="admin-eyebrow">Today at a glance</p>
                  <h2>Keep the bakery<br /><em>moving beautifully.</em></h2>
                </div>

                <button
                  className="admin-secondary-button"
                  onClick={() => refreshData("Dashboard refreshed.")}
                >
                  Refresh data
                </button>
              </div>

              <div className="admin-stat-grid">
                <article className="admin-stat-card admin-stat-card-featured">
                  <span>Received today</span>
                  <strong>{money(dashboard.sales.today)}</strong>
                  <small>
                    Yesterday: {money(dashboard.sales.yesterday)}
                  </small>
                </article>

                <article className="admin-stat-card">
                  <span>This month</span>
                  <strong>{money(dashboard.sales.month)}</strong>
                  <small>Paid orders only</small>
                </article>

                <article className="admin-stat-card">
                  <span>Monthly profit</span>
                  <strong>{money(dashboard.profit.month)}</strong>
                  <small>
                    Sales minus {money(dashboard.expenses.month)} expenses
                  </small>
                </article>

                <article className="admin-stat-card">
                  <span>Waiting for payment review</span>
                  <strong>{money(dashboard.sales.awaitingApproval)}</strong>
                  <small>{dashboard.orders.new} new order(s) waiting</small>
                </article>
              </div>

              <div className="admin-dashboard-grid">
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <p className="admin-eyebrow">Orders</p>
                      <h3>Recent activity</h3>
                    </div>

                    <button
                      className="admin-text-button"
                      onClick={() => setActiveTab("orders")}
                    >
                      View all
                    </button>
                  </div>

                  <div className="admin-order-list">
                    {dashboard.recentOrders.map((order) => (
                      <button
                        key={order.order_code}
                        className="admin-order-row"
                        onClick={() => {
                          setActiveTab("orders");
                          openOrder(order.order_code);
                        }}
                      >
                        <span className="admin-order-avatar">
                          {order.customer_name?.slice(0, 1).toUpperCase()}
                        </span>

                        <span className="admin-order-main">
                          <strong>{order.customer_name}</strong>
                          <small>{order.order_code}</small>
                        </span>

                        <span className="admin-order-value">
                          <strong>{money(order.total)}</strong>
                          <small>{ORDER_LABELS[order.order_status]}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="admin-panel admin-stock-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <p className="admin-eyebrow">Stock watch</p>
                      <h3>Restock list</h3>
                    </div>

                    <button
                      className="admin-text-button"
                      onClick={() => setActiveTab("inventory")}
                    >
                      Manage stock
                    </button>
                  </div>

                  {lowStockItems.length ? (
                    <div className="admin-low-stock-list">
                      {lowStockItems.slice(0, 5).map((item) => (
                        <div className="admin-low-stock-row" key={item.id}>
                          <div>
                            <strong>{item.name}</strong>
                            <small>
                              {item.quantity} {item.unit} left
                            </small>
                          </div>
                          <span>Restock</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-empty-state">
                      <span>✓</span>
                      All stock levels look healthy.
                    </div>
                  )}
                </section>
              </div>
            </section>
          )}

          {activeTab === "orders" && (
            <section className="admin-orders-layout">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <p className="admin-eyebrow">Order management</p>
                    <h2>Every customer order</h2>
                  </div>

                  <button
                    className="admin-secondary-button"
                    onClick={() => refreshData("Orders refreshed.")}
                  >
                    Refresh
                  </button>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.order_code}>
                          <td>
                            <strong>{order.order_code}</strong>
                            <small>{dateTime(order.created_at)}</small>
                          </td>
                          <td>
                            <strong>{order.customer_name}</strong>
                            <small>{order.customer_phone}</small>
                          </td>
                          <td>{money(order.total)}</td>
                          <td>
                            <span className={`admin-status payment-${order.payment_status}`}>
                              {order.payment_status}
                            </span>
                          </td>
                          <td>
                            <span className={`admin-status order-${order.order_status}`}>
                              {ORDER_LABELS[order.order_status]}
                            </span>
                          </td>
                          <td>
                            <button
                              className="admin-text-button"
                              onClick={() => openOrder(order.order_code)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {selectedOrder && (
                <aside className="admin-order-detail">
                  <button
                    className="admin-close-button"
                    onClick={() => setSelectedOrder(null)}
                    aria-label="Close order details"
                  >
                    ×
                  </button>

                  <p className="admin-eyebrow">Order details</p>
                  <h2>{selectedOrder.order_code}</h2>

                  <div className="admin-detail-customer">
                    <strong>{selectedOrder.customer_name}</strong>
                    <span>{selectedOrder.customer_phone}</span>
                    {selectedOrder.customer_email && (
                      <span>{selectedOrder.customer_email}</span>
                    )}
                  </div>

                  <div className="admin-detail-section">
                    <h3>Order items</h3>
                    {selectedOrder.items.map((item, index) => (
                      <div className="admin-detail-item" key={index}>
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.quantity} x {money(item.unit_price)}
                          </small>
                        </span>
                        <b>{money(item.line_total)}</b>
                      </div>
                    ))}
                  </div>

                  <div className="admin-detail-total">
                    <span>Total to receive</span>
                    <strong>{money(selectedOrder.total)}</strong>
                  </div>

                  <div className="admin-detail-section">
                    <h3>Payment review</h3>
                    <p>
                      M-Pesa code: <strong>{selectedOrder.mpesa_code || "Not submitted"}</strong>
                    </p>

                    {selectedOrder.payment_proof_url && (
                      <a
                        className="admin-proof-link"
                        href={`${API_BASE}${selectedOrder.payment_proof_url}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View payment screenshot
                      </a>
                    )}

                    <button
                      className="admin-primary-button"
                      disabled={selectedOrder.payment_status === "paid"}
                      onClick={() =>
                        updateOrder(selectedOrder.order_code, {
                          paymentStatus: "paid",
                        })
                      }
                    >
                      {selectedOrder.payment_status === "paid"
                        ? "Payment approved"
                        : "Approve payment"}
                      <span>✓</span>
                    </button>
                  </div>

                  <div className="admin-detail-section">
                    <h3>Order progress</h3>

                    <select
                      className="admin-select"
                      value={selectedOrder.order_status}
                      onChange={(event) =>
                        updateOrder(selectedOrder.order_code, {
                          orderStatus: event.target.value,
                        })
                      }
                    >
                      <option value="pending">Order received</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="baking">Baking</option>
                      <option value="out_for_delivery">Out for delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </aside>
              )}
            </section>
          )}

          {activeTab === "expenses" && (
            <section className="admin-management-grid">
              <section className="admin-panel">
                <p className="admin-eyebrow">Money out</p>
                <h2>Add an expense</h2>

                <form className="admin-form" onSubmit={saveExpense}>
                  <label>
                    Expense name
                    <input
                      value={expenseForm.title}
                      onChange={(event) =>
                        setExpenseForm({ ...expenseForm, title: event.target.value })
                      }
                      placeholder="e.g. Flour and butter"
                      required
                    />
                  </label>

                  <div className="admin-form-two-columns">
                    <label>
                      Category
                      <select
                        value={expenseForm.category}
                        onChange={(event) =>
                          setExpenseForm({ ...expenseForm, category: event.target.value })
                        }
                      >
                        <option>Ingredients</option>
                        <option>Packaging</option>
                        <option>Delivery</option>
                        <option>Rent</option>
                        <option>Utilities</option>
                        <option>Staff</option>
                        <option>Marketing</option>
                        <option>Other</option>
                      </select>
                    </label>

                    <label>
                      Amount (KSh)
                      <input
                        type="number"
                        min="1"
                        value={expenseForm.amount}
                        onChange={(event) =>
                          setExpenseForm({ ...expenseForm, amount: event.target.value })
                        }
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Expense date
                    <input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={(event) =>
                        setExpenseForm({
                          ...expenseForm,
                          expenseDate: event.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Notes
                    <textarea
                      value={expenseForm.notes}
                      onChange={(event) =>
                        setExpenseForm({ ...expenseForm, notes: event.target.value })
                      }
                      placeholder="Optional details"
                    />
                  </label>

                  <button className="admin-primary-button" type="submit">
                    Save expense
                    <span>+</span>
                  </button>
                </form>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <p className="admin-eyebrow">Expense history</p>
                    <h2>Bakery spending</h2>
                  </div>

                  <strong className="admin-panel-total">
                    {money(dashboard?.expenses.month)} this month
                  </strong>
                </div>

                <div className="admin-ledger">
                  {expenses.map((expense) => (
                    <div className="admin-ledger-row" key={expense.id}>
                      <div>
                        <strong>{expense.title}</strong>
                        <small>
                          {expense.category} · {expense.expense_date?.slice(0, 10)}
                        </small>
                      </div>

                      <div className="admin-ledger-actions">
                        <b>{money(expense.amount)}</b>
                        <button onClick={() => deleteExpense(expense.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          )}

          {activeTab === "inventory" && (
            <section className="admin-management-grid">
              <section className="admin-panel">
                <p className="admin-eyebrow">Bakery stock</p>
                <h2>{editingInventoryId ? "Update stock item" : "Add stock item"}</h2>

                <form className="admin-form" onSubmit={saveInventory}>
                  <label>
                    Item name
                    <input
                      value={inventoryForm.name}
                      onChange={(event) =>
                        setInventoryForm({
                          ...inventoryForm,
                          name: event.target.value,
                        })
                      }
                      placeholder="e.g. All-purpose flour"
                      required
                    />
                  </label>

                  <div className="admin-form-two-columns">
                    <label>
                      Quantity
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inventoryForm.quantity}
                        onChange={(event) =>
                          setInventoryForm({
                            ...inventoryForm,
                            quantity: event.target.value,
                          })
                        }
                        required
                      />
                    </label>

                    <label>
                      Unit
                      <input
                        value={inventoryForm.unit}
                        onChange={(event) =>
                          setInventoryForm({
                            ...inventoryForm,
                            unit: event.target.value,
                          })
                        }
                        placeholder="kg, packets, pieces"
                        required
                      />
                    </label>
                  </div>

                  <div className="admin-form-two-columns">
                    <label>
                      Restock at
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inventoryForm.reorderLevel}
                        onChange={(event) =>
                          setInventoryForm({
                            ...inventoryForm,
                            reorderLevel: event.target.value,
                          })
                        }
                        required
                      />
                    </label>

                    <label>
                      Unit cost (KSh)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inventoryForm.unitCost}
                        onChange={(event) =>
                          setInventoryForm({
                            ...inventoryForm,
                            unitCost: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <label>
                    Supplier
                    <input
                      value={inventoryForm.supplier}
                      onChange={(event) =>
                        setInventoryForm({
                          ...inventoryForm,
                          supplier: event.target.value,
                        })
                      }
                      placeholder="Optional supplier name"
                    />
                  </label>

                  <button className="admin-primary-button" type="submit">
                    {editingInventoryId ? "Save changes" : "Add to inventory"}
                    <span>+</span>
                  </button>

                  {editingInventoryId && (
                    <button
                      className="admin-cancel-button"
                      type="button"
                      onClick={() => {
                        setEditingInventoryId(null);
                        setInventoryForm(EMPTY_INVENTORY);
                      }}
                    >
                      Cancel editing
                    </button>
                  )}
                </form>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <p className="admin-eyebrow">Live stock levels</p>
                    <h2>Ingredients & supplies</h2>
                  </div>

                  <strong className="admin-panel-total">
                    {lowStockItems.length} need restocking
                  </strong>
                </div>

                <div className="admin-inventory-list">
                  {inventory.map((item) => {
                    const isLow =
                      Number(item.quantity) <= Number(item.reorder_level);

                    return (
                      <div
                        className={
                          isLow
                            ? "admin-inventory-row low-stock"
                            : "admin-inventory-row"
                        }
                        key={item.id}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <small>
                            {item.supplier || "No supplier recorded"} · Restock at{" "}
                            {item.reorder_level} {item.unit}
                          </small>
                        </div>

                        <div className="admin-stock-value">
                          <strong>
                            {item.quantity} {item.unit}
                          </strong>

                          <span>{isLow ? "Restock soon" : "In stock"}</span>
                        </div>

                        <div className="admin-inventory-actions">
                          <button onClick={() => startEditingInventory(item)}>
                            Edit
                          </button>
                          <button onClick={() => deleteInventory(item.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default AdminPage;