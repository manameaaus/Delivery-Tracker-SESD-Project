import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/app.css";

type Delivery = {
  id: string;
  deliveryTo: string;
  startLocation: string;
  destination: string;
  purpose: string;
  remarks: string | null;
  status: "Unassigned" | "Assigned" | "In Progress" | "Delivered" | "Completed" | "Rejected";
  runnerId: string | null;
  distance: number | null;
  approvedBy: string | null;
  approvedByUserId: string | null;
  createdAt: string;
};

type DashboardMetrics = {
  total: number;
  byStatus: Record<string, number>;
  byRunner?: Record<string, { count: number; distance: number }>;
};

type RunnerOption = {
  id: string;
  label: string;
};

type ManagedUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  createdAt: string;
  deliveryCount: number;
};

type Tab = "overview" | "deliveries" | "create";

const defaultForm = {
  deliveryTo: "",
  startLocation: "",
  destination: "",
  purpose: "",
  remarks: "",
  distance: ""
};

export function Dashboard() {
  const { token, profile, signOut, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ total: 0, byStatus: {} });
  const [runners, setRunners] = useState<RunnerOption[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filters, setFilters] = useState({
    months: "3",
    runners: "",
    statuses: ""
  });
  const [form, setForm] = useState(defaultForm);
  const [busyAction, setBusyAction] = useState<string>("");
  const [message, setMessage] = useState({ type: "", text: "" });

  // Modals state
  const [deliverModal, setDeliverModal] = useState<{ open: boolean; deliveryId: string; distance: string; signature: string }>({ open: false, deliveryId: "", distance: "", signature: "" });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; deliveryId: string; reason: string }>({ open: false, deliveryId: "", reason: "" });

  async function loadDashboard() {
    const params = new URLSearchParams();
    if (filters.months) params.set("months", filters.months);
    if (filters.runners) params.set("runners", filters.runners);
    if (filters.statuses) params.set("statuses", filters.statuses);

    const [deliveryResponse, dashboardResponse] = await Promise.all([
      apiRequest<Delivery[]>(`/deliveries?${params.toString()}`, { token }),
      apiRequest<DashboardMetrics>(`/deliveries/dashboard?${params.toString()}`, { token })
    ]);

    setDeliveries(deliveryResponse);
    setMetrics(dashboardResponse);
  }

  async function bootstrap() {
    await loadDashboard();

    if (hasRole("delivery_creator") || hasRole("approver") || hasRole("admin")) {
      const runnerResponse = await apiRequest<RunnerOption[]>("/users/runners", { token });
      setRunners(runnerResponse);
    }

    if (hasRole("admin")) {
      const userResponse = await apiRequest<ManagedUser[]>("/users", { token });
      setUsers(userResponse);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  function showMessage(text: string, type: "error" | "success" = "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusyAction("create");
    setMessage({ text: "", type: "" });
    try {
      await apiRequest("/deliveries", {
        method: "POST",
        token,
        body: JSON.stringify({
          deliveryTo: form.deliveryTo,
          startLocation: form.startLocation,
          destination: form.destination,
          purpose: form.purpose,
          remarks: form.remarks || undefined,
          distance: form.distance ? Number(form.distance) : undefined
        })
      });
      setForm(defaultForm);
      showMessage("Delivery created successfully", "success");
      await bootstrap();
      setActiveTab("deliveries"); // Switch to deliveries tab after creation
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to create delivery", "error");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAction(deliveryId: string, action: "claim" | "start" | "approve") {
    setBusyAction(`${action}-${deliveryId}`);
    try {
      await apiRequest(`/deliveries/${deliveryId}/${action}`, {
        method: "PATCH",
        token
      });
      await bootstrap();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to process action", "error");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeliverSubmit(e: FormEvent) {
    e.preventDefault();
    setBusyAction(`deliver-${deliverModal.deliveryId}`);
    try {
      await apiRequest(`/deliveries/${deliverModal.deliveryId}/deliver`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          distance: deliverModal.distance ? Number(deliverModal.distance) : undefined,
          recipientSignature: deliverModal.signature || undefined
        })
      });
      setDeliverModal({ open: false, deliveryId: "", distance: "", signature: "" });
      await bootstrap();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to process action", "error");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRejectSubmit(e: FormEvent) {
    e.preventDefault();
    setBusyAction(`reject-${rejectModal.deliveryId}`);
    try {
      await apiRequest(`/deliveries/${rejectModal.deliveryId}/reject`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          reason: rejectModal.reason || undefined
        })
      });
      setRejectModal({ open: false, deliveryId: "", reason: "" });
      await bootstrap();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to process action", "error");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeleteUser(userId: string) {
    setBusyAction(`delete-${userId}`);
    try {
      await apiRequest(`/users/${userId}`, {
        method: "DELETE",
        token
      });
      await bootstrap();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to delete user", "error");
    } finally {
      setBusyAction("");
    }
  }

  async function handleExport() {
    const params = new URLSearchParams();
    if (filters.months) params.set("months", filters.months);
    if (filters.runners) params.set("runners", filters.runners);
    if (filters.statuses) params.set("statuses", filters.statuses);

    const file = await apiRequest<Blob>(`/deliveries/export?${params.toString()}`, { token });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "deliveries.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Operations Console</p>
          <h1>Future Forward Delivery Tracker</h1>
          <p className="subtitle">Welcome back, {profile?.fullName}. Logged in as {profile?.roles.join(", ")}.</p>
        </div>
        <button className="ghost-button" onClick={signOut}>Sign out</button>
      </header>

      {message.text && (
        <div className={`message-box ${message.type === "success" ? "success" : ""}`}>
          {message.text}
        </div>
      )}

      <nav className="tabs-nav glass-panel">
        <button 
          className={activeTab === "overview" ? "" : "ghost-button"} 
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button 
          className={activeTab === "deliveries" ? "" : "ghost-button"} 
          onClick={() => setActiveTab("deliveries")}
        >
          Deliveries
        </button>
        {(hasRole("delivery_creator") || hasRole("admin")) && (
          <button 
            className={activeTab === "create" ? "" : "ghost-button"} 
            onClick={() => setActiveTab("create")}
          >
            Create Delivery
          </button>
        )}
      </nav>

      <div className="tab-content-area">
        {activeTab === "overview" && (() => {
          const myRunnerDeliveries = deliveries.filter(d => d.runnerId === profile?.id);
          const myActiveDeliveriesCount = myRunnerDeliveries.filter(d => d.status === "Assigned" || d.status === "In Progress").length;
          const myCompletedDeliveriesCount = myRunnerDeliveries.filter(d => d.status === "Delivered" || d.status === "Completed").length;
          const myTotalDistance = myRunnerDeliveries.reduce((sum, d) => sum + (d.distance || 0), 0);
          const availableToClaimCount = deliveries.filter(d => d.status === "Unassigned").length;

          const pendingApprovalCount = deliveries.filter(d => d.status === "Delivered").length;
          const approvedByMeCount = deliveries.filter(d => d.approvedByUserId === profile?.id && d.status === "Completed").length;
          const rejectedByMeCount = deliveries.filter(d => d.approvedByUserId === profile?.id && d.status === "Rejected").length;

          return (
            <div className="tab-pane">
              {hasRole("runner") && (
                <section className="panel glass-panel">
                  <div className="panel-header">
                    <h2>Runner Insights</h2>
                    <p className="subtitle">Your personal delivery performance and available tasks.</p>
                  </div>
                  <div className="metrics-grid">
                    <article className="metric-card glass-panel accent">
                      <span>My Active Tasks</span>
                      <strong>{myActiveDeliveriesCount}</strong>
                    </article>
                    <article className="metric-card glass-panel">
                      <span>Available to Claim</span>
                      <strong>{availableToClaimCount}</strong>
                    </article>
                    <article className="metric-card glass-panel">
                      <span>Completed by Me</span>
                      <strong>{myCompletedDeliveriesCount}</strong>
                    </article>
                    <article className="metric-card glass-panel">
                      <span>Total Distance</span>
                      <strong>{myTotalDistance.toFixed(2)} km</strong>
                    </article>
                  </div>
                </section>
              )}

              {hasRole("approver") && (
                <section className="panel glass-panel">
                  <div className="panel-header">
                    <h2>Approver Insights</h2>
                    <p className="subtitle">Deliveries requiring your review and past decisions.</p>
                  </div>
                  <div className="metrics-grid">
                    <article className="metric-card glass-panel accent">
                      <span>Pending Approval</span>
                      <strong>{pendingApprovalCount}</strong>
                    </article>
                    <article className="metric-card glass-panel">
                      <span>Approved by Me</span>
                      <strong>{approvedByMeCount}</strong>
                    </article>
                    <article className="metric-card glass-panel">
                      <span>Rejected by Me</span>
                      <strong>{rejectedByMeCount}</strong>
                    </article>
                  </div>
                </section>
              )}

              {(hasRole("delivery_creator") || hasRole("admin")) && (
                <section className="panel glass-panel">
                  <div className="panel-header">
                    <h2>Global Platform Overview</h2>
                    <p className="subtitle">System-wide delivery statistics and statuses.</p>
                  </div>
                  <div className="metrics-grid">
                    <article className="metric-card glass-panel accent">
                      <span>Total deliveries</span>
                      <strong>{metrics.total}</strong>
                    </article>
                    {["Unassigned", "Assigned", "In Progress", "Delivered", "Completed", "Rejected"].map((status) => (
                      <article key={status} className="metric-card glass-panel">
                        <span>{status}</span>
                        <strong>{metrics.byStatus[status] ?? 0}</strong>
                      </article>
                    ))}
                  </div>
                </section>
              )}

            {hasRole("admin") && metrics.byRunner && (
              <section className="panel glass-panel">
                <div className="panel-header">
                  <h2>Admin: Runner Delivery Stats</h2>
                  <p className="subtitle">Overview of deliveries completed by each runner.</p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="runner-stats-table">
                    <thead>
                      <tr>
                        <th>Runner Name</th>
                        <th>Deliveries Handled</th>
                        <th>Distance Covered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runners.map(runner => {
                        const stats = metrics.byRunner?.[runner.id];
                        if (!stats || stats.count === 0) return null;
                        return (
                          <tr key={runner.id}>
                            <td>{runner.label}</td>
                            <td>{stats.count}</td>
                            <td>{stats.distance.toFixed(2)} km</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
          );
        })()}

        {activeTab === "deliveries" && (
          <div className="tab-pane">
            <section className="panel glass-panel">
              <div className="panel-header">
                <h2>Filters and reporting</h2>
                <button className="ghost-button" onClick={handleExport}>Export XLSX</button>
              </div>
              <div className="filters-row">
                <input value={filters.months} onChange={(event) => setFilters((current) => ({ ...current, months: event.target.value }))} placeholder="Months" />
                <select value={filters.runners} onChange={(event) => setFilters((current) => ({ ...current, runners: event.target.value }))}>
                  <option value="">All runners</option>
                  {runners.map((runner) => (
                    <option key={runner.id} value={runner.id}>{runner.label}</option>
                  ))}
                </select>
                <select value={filters.statuses} onChange={(event) => setFilters((current) => ({ ...current, statuses: event.target.value }))}>
                  <option value="">All statuses</option>
                  {["Unassigned", "Assigned", "In Progress", "Delivered", "Completed", "Rejected"].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button onClick={bootstrap}>Apply Filters</button>
              </div>
            </section>

            <section className="panel glass-panel">
              <div className="panel-header">
                <h2>Delivery board</h2>
              </div>
              <div className="delivery-grid">
                {deliveries.length === 0 ? (
                  <p className="subtitle">No deliveries found.</p>
                ) : (
                  deliveries.map((delivery) => {
                    const canClaim = delivery.status === "Unassigned" && (hasRole("runner") || hasRole("admin"));
                    const canStart = delivery.status === "Assigned" && delivery.runnerId === profile?.id;
                    const canDeliver = delivery.status === "In Progress" && delivery.runnerId === profile?.id;
                    const canApprove = delivery.status === "Delivered" && (hasRole("approver") || hasRole("admin"));

                    return (
                      <article key={delivery.id} className="delivery-card glass-panel">
                        <div className="delivery-topline">
                          <span className={`status-badge status-${delivery.status.replace(" ", "")}`}>{delivery.status}</span>
                          <small>{new Date(delivery.createdAt).toLocaleDateString()}</small>
                        </div>
                        <h3>{delivery.deliveryTo}</h3>
                        <p>{delivery.purpose}</p>
                        <dl>
                          <div><dt>From</dt><dd>{delivery.startLocation}</dd></div>
                          <div><dt>To</dt><dd>{delivery.destination}</dd></div>
                          {delivery.distance != null && <div><dt>Distance</dt><dd>{delivery.distance} km</dd></div>}
                          <div><dt>Remarks</dt><dd>{delivery.remarks || "None"}</dd></div>
                          <div><dt>Approved by</dt><dd>{delivery.approvedBy || "Pending"}</dd></div>
                        </dl>
                        <div className="actions-row">
                          {canClaim && <button disabled={busyAction === `claim-${delivery.id}`} onClick={() => handleAction(delivery.id, "claim")}>Claim</button>}
                          {canStart && <button disabled={busyAction === `start-${delivery.id}`} onClick={() => handleAction(delivery.id, "start")}>Start</button>}
                          {canDeliver && <button disabled={busyAction === `deliver-${delivery.id}`} onClick={() => setDeliverModal({ open: true, deliveryId: delivery.id, distance: "", signature: "" })}>Mark Delivered</button>}
                          {canApprove && (
                            <>
                              <button disabled={busyAction === `approve-${delivery.id}`} onClick={() => handleAction(delivery.id, "approve")}>Approve</button>
                              <button className="danger" disabled={busyAction === `reject-${delivery.id}`} onClick={() => setRejectModal({ open: true, deliveryId: delivery.id, reason: "" })}>Reject</button>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "create" && (hasRole("delivery_creator") || hasRole("admin")) && (
          <div className="tab-pane">
            <section className="panel glass-panel">
              <div className="panel-header">
                <h2>Create delivery</h2>
              </div>
              <form className="form-grid" onSubmit={handleCreate}>
                <input value={form.deliveryTo} onChange={(event) => setForm((current) => ({ ...current, deliveryTo: event.target.value }))} placeholder="Delivery to" required />
                <input value={form.startLocation} onChange={(event) => setForm((current) => ({ ...current, startLocation: event.target.value }))} placeholder="Start location" required />
                <input value={form.destination} onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))} placeholder="Destination" required />
                <input value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))} placeholder="Purpose" required />
                <input value={form.distance} onChange={(event) => setForm((current) => ({ ...current, distance: event.target.value }))} placeholder="Initial distance estimate (optional)" type="number" step="0.01" />
                <input value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} placeholder="Remarks" />
                <button type="submit" disabled={busyAction === "create"}>{busyAction === "create" ? "Saving..." : "Create delivery"}</button>
              </form>
            </section>
          </div>
        )}

      </div>

      {/* Deliver Modal */}
      {deliverModal.open && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3>Complete Delivery</h3>
            <form onSubmit={handleDeliverSubmit} className="login-form">
              <label>
                Final Distance Travelled
                <input type="number" step="0.01" value={deliverModal.distance} onChange={(e) => setDeliverModal(m => ({ ...m, distance: e.target.value }))} placeholder="e.g. 15.5" required />
              </label>
              <label>
                Recipient Signature / Name
                <input value={deliverModal.signature} onChange={(e) => setDeliverModal(m => ({ ...m, signature: e.target.value }))} placeholder="Optional signature" />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setDeliverModal({ open: false, deliveryId: "", distance: "", signature: "" })}>Cancel</button>
                <button type="submit" disabled={busyAction === `deliver-${deliverModal.deliveryId}`}>Confirm Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3>Reject Delivery</h3>
            <form onSubmit={handleRejectSubmit} className="login-form">
              <label>
                Reason for Rejection
                <textarea rows={3} value={rejectModal.reason} onChange={(e) => setRejectModal(m => ({ ...m, reason: e.target.value }))} placeholder="Why is this being rejected?" required />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setRejectModal({ open: false, deliveryId: "", reason: "" })}>Cancel</button>
                <button type="submit" className="danger" disabled={busyAction === `reject-${rejectModal.deliveryId}`}>Confirm Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
