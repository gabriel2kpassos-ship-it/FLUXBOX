/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportsView } from "./components/ReportsView";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Map as MapIcon,
  History,
  AlertTriangle,
  Users,
  LogOut,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Menu,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDateTime } from "./lib/utils";
import { supabase } from "./lib/supabase";
import { Auth } from "./components/Auth";
import { Item, Movement, Alert, UserProfile, Location } from "./types";

type Tab =
  | "dashboard"
  | "inventory"
  | "inuse"
  | "map"
  | "history"
  | "reports"
  | "alerts"
  | "users";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // App State
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const restrictedTabs = ["inventory", "history", "reports", "users"];

    if (profile.role !== "admin" && restrictedTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [profile, activeTab]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("Erro ao buscar perfil:", error);
      alert(
        "Perfil não encontrado ou sem permissão. Verifique a tabela profiles no Supabase.",
      );
      await supabase.auth.signOut();
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchData();

      // Realtime subscriptions
      const itemsSub = supabase
        .channel("items_changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "items" },
          fetchData,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "items" },
          fetchData,
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "items" },
          fetchData,
        )
        .subscribe();

      const alertsSub = supabase
        .channel("alerts_changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "alerts" },
          fetchData,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "alerts" },
          fetchData,
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "alerts" },
          fetchData,
        )
        .subscribe();

      return () => {
        itemsSub.unsubscribe();
        alertsSub.unsubscribe();
      };
    }
  }, [session]);

  const fetchData = async () => {
    const [itemsRes, movementsRes, alertsRes, locationsRes] = await Promise.all(
      [
        supabase.from("items").select("*, location:locations(*)").order("name"),
        supabase
          .from("movements")
          .select("*, item:items(*), profile:profiles(*)")
          .order("timestamp", { ascending: false })
          .limit(20),
        supabase
          .from("alerts")
          .select("*, item:items(*)")
          .eq("is_read", false)
          .order("created_at", { ascending: false }),
        supabase.from("locations").select("*").order("name"),
      ],
    );

    if (itemsRes.data) setItems(itemsRes.data);
    if (movementsRes.data) setMovements(movementsRes.data);
    if (alertsRes.data) setAlerts(alertsRes.data);
    if (locationsRes.data) setLocations(locationsRes.data);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-blue">
        <Loader2 className="text-brand-yellow animate-spin" size={48} />
      </div>
    );
  }

  if (!session) return <Auth />;
  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Painel", icon: LayoutDashboard },
    { id: "inuse", label: "Em Uso", icon: ArrowUpRight },
    { id: "map", label: "Mapa", icon: MapIcon },
    {
      id: "alerts",
      label: "Alertas",
      icon: AlertTriangle,
      badge: alerts.length,
    },

    ...(profile?.role === "admin"
      ? [
          { id: "inventory", label: "Estoque", icon: Package },
          { id: "history", label: "Movimentações", icon: History },
          { id: "reports", label: "Relatórios", icon: AlertCircle },
          { id: "users", label: "Usuários", icon: Users },
        ]
      : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-brand-blue text-white flex flex-col transition-all duration-300 ease-in-out z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-bold text-xl tracking-tight"
            >
              <div className="w-8 h-8 bg-brand-yellow rounded flex items-center justify-center text-brand-dark">
                <Package size={20} />
              </div>
              FLUXBOX
            </motion.div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-blue-800 rounded transition-colors"
          >
            {isSidebarOpen ? (
              <X size={20} />
            ) : (
              <Menu size={20} className="mx-auto" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all group relative",
                activeTab === item.id
                  ? "bg-brand-yellow text-brand-dark shadow-lg"
                  : "hover:bg-blue-800 text-blue-100",
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && (
                <span className="font-medium">{item.label}</span>
              )}
              {item.badge ? (
                <span
                  className={cn(
                    "ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full",
                    !isSidebarOpen && "absolute top-2 right-2",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-blue-100 hover:bg-blue-800 transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar ferramentas ou insumos..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-brand-blue focus:ring-0 rounded-lg transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">
                {profile?.name || "Usuário"}
              </p>
              <p className="text-xs text-gray-500 uppercase">
                {profile?.role === "admin" ? "Administrador" : "Técnico"}
              </p>
            </div>
            <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center text-white font-bold">
              {profile?.name?.substring(0, 2).toUpperCase() || "??"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && (
                <DashboardView
                  items={items}
                  movements={movements}
                  alerts={alerts}
                  onAction={fetchData}
                  profile={profile}
                />
              )}

              {activeTab === "inuse" && <InUseView movements={movements} />}

              {activeTab === "map" && (
                <MapView
                  items={items}
                  locations={locations}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === "alerts" && (
                <AlertsView alerts={alerts} onAction={fetchData} />
              )}

              {activeTab === "inventory" && profile?.role === "admin" && (
                <InventoryView
                  items={items}
                  locations={locations}
                  profile={profile}
                  onAction={fetchData}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === "history" && profile?.role === "admin" && (
                <HistoryView movements={movements} />
              )}

              {activeTab === "reports" && profile?.role === "admin" && (
                <ReportsView movements={movements} />
              )}

              {activeTab === "users" && profile?.role === "admin" && (
                <UsersView currentProfile={profile} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function DashboardView({ items, movements, alerts, onAction, profile }: any) {
  const [showModal, setShowModal] = useState<"check-in" | "check-out" | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleMovement = async () => {
    if (!selectedItem || quantity <= 0) return;

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Usuário não autenticado");
        return;
      }

      const item = items.find((i: any) => i.id === selectedItem);
      if (!item) throw new Error("Item não encontrado");

      if (showModal === "check-out" && item.available_qty < quantity) {
        throw new Error("Quantidade insuficiente em estoque");
      }

      if (
        showModal === "check-in" &&
        item.available_qty + quantity > item.total_qty
      ) {
        throw new Error(
          "Não é possível devolver mais do que a quantidade total do item",
        );
      }

      const newQty =
        showModal === "check-in"
          ? item.available_qty + quantity
          : item.available_qty - quantity;

      const { error: moveError } = await supabase.from("movements").insert({
        item_id: selectedItem,
        user_id: user.id,
        type: showModal,
        quantity,
      });

      if (moveError) throw moveError;

      const newStatus =
        newQty === 0
          ? "indisponível"
          : newQty <= item.min_qty
            ? "estoque baixo"
            : newQty < item.total_qty
              ? "em uso"
              : "disponível";

      const { error: itemError } = await supabase
        .from("items")
        .update({
          available_qty: newQty,
          status: newStatus,
        })
        .eq("id", selectedItem);

      if (itemError) throw itemError;

      setShowModal(null);
      setSelectedItem("");
      setQuantity(1);

      await onAction();
    } catch (err: any) {
      console.error("Erro movimento:", err);
      alert(err.message || "Erro ao processar operação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Painel de Controle
          </h1>
          <p className="text-gray-500">Resumo operacional do almoxarifado.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowModal("check-in")}
            className="btn-secondary"
          >
            <ArrowDownLeft size={18} />
            Check-in
          </button>
          <button
            onClick={() => setShowModal("check-out")}
            className="btn-primary"
          >
            <ArrowUpRight size={18} />
            Check-out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total de Itens",
            value: items.length,
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Em Uso",
            value: items.filter((i: any) => i.available_qty < i.total_qty)
              .length,
            icon: ArrowUpRight,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Estoque Baixo",
            value: items.filter((i: any) => i.available_qty <= i.min_qty)
              .length,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Alertas Ativos",
            value: alerts.length,
            icon: AlertCircle,
            color: "text-red-700",
            bg: "bg-red-100",
          },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 flex items-center gap-4">
            <div className={cn("p-3 rounded-lg", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-bold mb-4">Movimentações Recentes</h3>
          <div className="space-y-4">
            {movements.length === 0 ? (
              <p className="text-center py-8 text-gray-400">
                Nenhuma movimentação registrada.
              </p>
            ) : (
              movements.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-full",
                        m.type === "check-in"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600",
                      )}
                    >
                      {m.type === "check-in" ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {m.item?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.profile?.name} • {formatDateTime(m.timestamp)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold">
                    {m.quantity} {m.item?.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4">Alertas Recentes</h3>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Tudo em ordem!</p>
            ) : (
              alerts.slice(0, 5).map((a: any) => (
                <div
                  key={a.id}
                  className="p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3"
                >
                  <AlertTriangle className="text-red-600 shrink-0" size={20} />
                  <div>
                    <p className="text-xs font-bold text-red-900">
                      {a.item?.name}
                    </p>
                    <p className="text-[10px] text-red-700 leading-tight">
                      {a.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Check-in/out */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div
                className={cn(
                  "p-6 text-white flex items-center justify-between",
                  showModal === "check-in" ? "bg-green-600" : "bg-brand-blue",
                )}
              >
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {showModal === "check-in" ? (
                    <ArrowDownLeft />
                  ) : (
                    <ArrowUpRight />
                  )}
                  {showModal === "check-in"
                    ? "Entrada / Devolução"
                    : "Saída / Retirada"}
                </h3>
                <button onClick={() => setShowModal(null)}>
                  <X />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-blue"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                  >
                    <option value="">Selecione um item...</option>
                    {items.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.code} - {i.name} ({i.available_qty} {i.unit} disp.)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-blue"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  />
                </div>
                <button
                  onClick={handleMovement}
                  disabled={loading || !selectedItem}
                  className={cn(
                    "w-full py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2",
                    showModal === "check-in"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-brand-blue hover:bg-blue-900",
                    (loading || !selectedItem) &&
                      "opacity-50 cursor-not-allowed",
                  )}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Confirmar Operação"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InventoryView({
  items,
  locations,
  profile,
  onAction,
  searchQuery,
}: any) {
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "",
    description: "",
    total_qty: 0,
    min_qty: 0,
    unit: "un",
    location_id: "",
    status: "disponível",
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      category: "",
      description: "",
      total_qty: 0,
      min_qty: 0,
      unit: "un",
      location_id: "",
      status: "disponível",
    });
  };

  const filteredItems = items.filter(
    (i: any) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("items").insert({
        ...formData,
        available_qty: formData.total_qty,
      });

      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      onAction();
    } catch (err: any) {
      alert("Erro ao cadastrar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setFormData({
      code: item.code || "",
      name: item.name || "",
      category: item.category || "",
      description: item.description || "",
      total_qty: item.total_qty || 0,
      min_qty: item.min_qty || 0,
      unit: item.unit || "un",
      location_id: item.location_id || "",
      status: item.status || "disponível",
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setLoading(true);

    try {
      const newAvailableQty = formData.total_qty;

      const { error } = await supabase
        .from("items")
        .update({
          ...formData,
          available_qty: newAvailableQty,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingItem(null);
      resetForm();
      onAction();
    } catch (err: any) {
      alert("Erro ao atualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    const confirmed = window.confirm(
      `Deseja realmente excluir o item "${itemName}"?`,
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("items").delete().eq("id", itemId);

      if (error) throw error;

      onAction();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catálogo de Itens</h1>
        {profile?.role === "admin" && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            Novo Item
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Local
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                Qtd Disp.
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  Nenhum item encontrado.
                </td>
              </tr>
            ) : (
              filteredItems.map((item: any) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-sm">{item.code}</td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.location?.name || "Não definido"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        item.status === "disponível"
                          ? "bg-green-100 text-green-700"
                          : item.status === "estoque baixo"
                            ? "bg-red-100 text-red-700"
                            : item.status === "em uso"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700",
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    <span
                      className={
                        item.available_qty <= item.min_qty
                          ? "text-red-600"
                          : "text-gray-900"
                      }
                    >
                      {item.available_qty} / {item.total_qty}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-1">
                      {item.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {profile?.role === "admin" && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="px-3 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="px-3 py-1 text-xs font-bold rounded bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Adicionar Item */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Cadastrar Novo Item</h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X />
                </button>
              </div>

              <form
                onSubmit={handleAddItem}
                className="p-6 grid grid-cols-2 gap-4"
              >
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Código Único
                  </label>
                  <input
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nome do Item
                  </label>
                  <input
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">Selecione...</option>
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Insumos">Insumos</option>
                    <option value="Equipamentos">Equipamentos</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Unidade
                  </label>
                  <input
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Qtd Total
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.total_qty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_qty: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Qtd Mínima (Alerta)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.min_qty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_qty: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Localização Física
                  </label>
                  <select
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.location_id}
                    onChange={(e) =>
                      setFormData({ ...formData, location_id: e.target.value })
                    }
                  >
                    <option value="">Selecione o local...</option>
                    {locations.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-blue text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Salvar Item"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Editar Item */}
      <AnimatePresence>
        {showEditModal && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Editar Item</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                >
                  <X />
                </button>
              </div>

              <form
                onSubmit={handleUpdateItem}
                className="p-6 grid grid-cols-2 gap-4"
              >
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Código Único
                  </label>
                  <input
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nome do Item
                  </label>
                  <input
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">Selecione...</option>
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Insumos">Insumos</option>
                    <option value="Equipamentos">Equipamentos</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Unidade
                  </label>
                  <input
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Qtd Total
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.total_qty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_qty: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Qtd Mínima (Alerta)
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.min_qty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_qty: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Localização Física
                  </label>
                  <select
                    required
                    className="w-full p-2 border rounded outline-none focus:ring-1 focus:ring-brand-blue"
                    value={formData.location_id}
                    onChange={(e) =>
                      setFormData({ ...formData, location_id: e.target.value })
                    }
                  >
                    <option value="">Selecione o local...</option>
                    {locations.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-blue text-white py-3 rounded-lg font-bold hover:bg-blue-900 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Salvar Alterações"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MapView({
  items,
  locations,
  searchQuery,
}: {
  items: any[];
  locations: any[];
  searchQuery: string;
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems =
    normalizedQuery.length === 0
      ? items
      : items.filter(
          (item) =>
            item.name?.toLowerCase().includes(normalizedQuery) ||
            item.code?.toLowerCase().includes(normalizedQuery) ||
            item.category?.toLowerCase().includes(normalizedQuery),
        );

  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);

  const getLocationItems = (locationId: string) => {
    return filteredItems.filter((item) => item.location_id === locationId);
  };

  const getLocationStatus = (locationId: string) => {
    const locationItems = getLocationItems(locationId);

    if (locationItems.length === 0) return "empty";

    const hasLowStock = locationItems.some(
      (item) => item.status === "estoque baixo",
    );
    const hasUnavailable = locationItems.some(
      (item) => item.status === "indisponível",
    );
    const hasInUse = locationItems.some((item) => item.status === "em uso");

    if (hasUnavailable) return "unavailable";
    if (hasLowStock) return "low";
    if (hasInUse) return "inuse";
    return "ok";
  };

  const getLocationByName = (name: string) => {
    return locations.find(
      (location) =>
        location.name?.trim().toUpperCase() === name.trim().toUpperCase(),
    );
  };

  const getRackFill = (rackName: string) => {
    const location = getLocationByName(rackName);
    if (!location) return "#e5e7eb";

    const status = getLocationStatus(location.id);

    if (status === "ok") return "#bbf7d0";
    if (status === "low") return "#fecaca";
    if (status === "inuse") return "#fde68a";
    if (status === "unavailable") return "#d1d5db";
    return "#e5e7eb";
  };

  const handleRackClick = (rackName: string) => {
    const location = getLocationByName(rackName);
    if (location) {
      setSelectedLocation(location);
    }
  };

  const rackLabel = (
    rackName: string,
    x: number,
    y: number,
    rotate = false,
    fontSize = 18,
  ) => (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fontWeight="bold"
      fill="#111827"
      transform={rotate ? `rotate(-90 ${x} ${y})` : undefined}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      {rackName}
    </text>
  );

  const rackRect = (
    rackName: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotateLabel = true,
  ) => {
    const exists = !!getLocationByName(rackName);

    return (
      <g
        key={rackName}
        onClick={() => exists && handleRackClick(rackName)}
        style={{ cursor: exists ? "pointer" : "not-allowed" }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx="10"
          fill={getRackFill(rackName)}
          stroke={selectedLocation?.name === rackName ? "#1E3A8A" : "#334155"}
          strokeWidth={selectedLocation?.name === rackName ? 4 : 2}
        />
        {rackLabel(
          rackName,
          x + width / 2,
          y + height / 2,
          rotateLabel,
          rackName.length > 4 ? 14 : 18,
        )}
      </g>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mapa do Almoxarifado</h1>
        <p className="text-gray-500">
          Clique em um rack para visualizar os itens armazenados.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="glass-card p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-lg font-bold">Planta Interativa</h2>

            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-green-300 inline-block"></span>
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-yellow-300 inline-block"></span>
                <span>Em uso</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-300 inline-block"></span>
                <span>Estoque baixo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-gray-300 inline-block"></span>
                <span>Sem itens</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50 overflow-auto">
            <svg viewBox="0 0 1400 900" className="w-full min-w-[1000px]">
              <rect x="0" y="0" width="1400" height="900" fill="#f8fafc" />

              {/* ZONAS */}
              <rect
                x="30"
                y="30"
                width="470"
                height="760"
                fill="#bfe3ff"
                stroke="#334155"
                strokeWidth="3"
              />
              <rect
                x="500"
                y="30"
                width="430"
                height="760"
                fill="#ffe08a"
                stroke="#334155"
                strokeWidth="3"
              />
              <rect
                x="930"
                y="30"
                width="390"
                height="760"
                fill="#f3b2df"
                stroke="#334155"
                strokeWidth="3"
              />

              {/* Corredor horizontal */}
              <rect x="30" y="390" width="1290" height="70" fill="#f3efe2" />
              <text
                x="675"
                y="432"
                textAnchor="middle"
                fontSize="28"
                fontWeight="bold"
                fill="#111827"
              >
                ESTANTES DE PALETES
              </text>

              {/* Corredor principal */}
              <rect x="1320" y="30" width="50" height="760" fill="#f3efe2" />
              <text
                x="1347"
                y="410"
                textAnchor="middle"
                fontSize="24"
                fontWeight="bold"
                fill="#111827"
                transform="rotate(-90 1347 410)"
              >
                CORREDOR PRINCIPAL
              </text>

              {/* Títulos */}
              <text
                x="265"
                y="110"
                textAnchor="middle"
                fontSize="34"
                fontWeight="bold"
                fill="#111827"
              >
                ZONA A
              </text>
              <text
                x="715"
                y="110"
                textAnchor="middle"
                fontSize="34"
                fontWeight="bold"
                fill="#111827"
              >
                ZONA B
              </text>
              <text
                x="1125"
                y="110"
                textAnchor="middle"
                fontSize="34"
                fontWeight="bold"
                fill="#111827"
              >
                ZONA C
              </text>

              {/* Zona A - parte superior */}
              {rackRect("A1", 70, 170, 90, 190)}
              {rackRect("A2", 210, 170, 90, 190)}
              {rackRect("A3", 350, 170, 90, 190)}

              {/* Zona A - parte inferior */}
              {rackRect("A11", 70, 500, 90, 190)}
              {rackRect("A12", 210, 500, 90, 190)}
              {rackRect("A13", 350, 500, 90, 190)}

              {/* Zona B */}
              {rackRect("C6", 530, 170, 70, 190)}
              {rackRect("B1", 650, 170, 90, 190)}
              {rackRect("B8", 790, 170, 90, 190)}

              {rackRect("C4", 530, 500, 70, 190)}
              {rackRect("B7", 650, 500, 90, 190)}
              {rackRect("B9", 790, 500, 90, 190)}

              {/* Zona C */}
              {rackRect("C8", 960, 170, 70, 190)}
              {rackRect("RACK C", 1080, 170, 90, 190)}
              {rackRect("RACK D", 1210, 170, 90, 190)}

              {rackRect("C10", 960, 500, 70, 190)}
              {rackRect("C11", 1080, 500, 90, 190)}
              {rackRect("C12", 1210, 500, 90, 190)}
            </svg>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Detalhes da Localização</h2>

          {!selectedLocation ? (
            <div className="text-center py-12 text-gray-400">
              <MapIcon size={42} className="mx-auto mb-3" />
              <p>Selecione um rack no mapa.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-500">Local</p>
                <p className="text-xl font-bold">{selectedLocation.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedLocation.description || "Sem descrição"}
                </p>
              </div>

              <div>
                <h3 className="font-bold mb-3">Itens armazenados</h3>

                {getLocationItems(selectedLocation.id).length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Nenhum item nesse local.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getLocationItems(selectedLocation.id).map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-xl p-3 bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.code}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.category}
                            </p>
                          </div>

                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              item.status === "disponível"
                                ? "bg-green-100 text-green-700"
                                : item.status === "estoque baixo"
                                  ? "bg-red-100 text-red-700"
                                  : item.status === "em uso"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700",
                            )}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="mt-3 text-sm">
                          <span className="font-bold">
                            {item.available_qty}
                          </span>
                          <span className="text-gray-500">
                            {" "}
                            / {item.total_qty} {item.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function HistoryView({ movements }: { movements: Movement[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico de Movimentações</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                Quantidade
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {movements.map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">
                  {formatDateTime(m.timestamp)}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {m.profile?.name}
                </td>
                <td className="px-6 py-4 text-sm">{m.item?.name}</td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      m.type === "check-in"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {m.type === "check-in" ? "Entrada" : "Saída"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold">
                  {m.quantity} {m.item?.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsView({
  alerts,
  onAction,
}: {
  alerts: Alert[];
  onAction: () => void;
}) {
  const markAsRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    onAction();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alertas do Sistema</h1>
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-400 mb-4" />
            <p className="text-gray-500">Nenhum alerta pendente.</p>
          </div>
        ) : (
          alerts.map((a: any) => (
            <div
              key={a.id}
              className="glass-card p-4 border-l-4 border-red-500"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <div>
                    <p className="font-bold">{a.item?.name}</p>
                    <p className="text-sm text-gray-600">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDateTime(a.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markAsRead(a.id)}
                  className="text-xs font-bold text-brand-blue hover:underline"
                >
                  Marcar como lido
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
function UsersView({ currentProfile }: { currentProfile: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err: any) {
      alert("Erro ao carregar usuários: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "user",
  ) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      fetchUsers();
    } catch (err: any) {
      alert("Erro ao atualizar perfil: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentProfile?.id) {
      alert("Você não pode excluir seu próprio perfil.");
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir o perfil de "${userName}"?`,
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      fetchUsers();
    } catch (err: any) {
      alert("Erro ao excluir usuário: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-gray-500">
            Gerencie os perfis de acesso do sistema.
          </p>
        </div>

        <button onClick={fetchUsers} className="btn-secondary">
          Atualizar
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  E-mail
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">
                      {user.name || "Usuário sem nome"}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(user.created_at)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {user.role === "user" ? (
                          <button
                            onClick={() => handleRoleChange(user.id, "admin")}
                            className="px-3 py-1 text-xs font-bold rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                          >
                            Tornar admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(user.id, "user")}
                            className="px-3 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                            disabled={user.id === currentProfile?.id}
                          >
                            Tornar user
                          </button>
                        )}

                        <button
                          onClick={() =>
                            handleDeleteUser(user.id, user.name || user.email)
                          }
                          className="px-3 py-1 text-xs font-bold rounded bg-red-100 text-red-700 hover:bg-red-200"
                          disabled={user.id === currentProfile?.id}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InUseView({ movements }: { movements: any[] }) {
  const groupedMap = new Map<string, any>();

  movements.forEach((movement) => {
    const itemId = movement.item?.id;
    const userId = movement.profile?.id;

    if (!itemId || !userId) return;

    const key = `${itemId}-${userId}`;

    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        key,
        itemName: movement.item?.name || "Item sem nome",
        itemCode: movement.item?.code || "-",
        unit: movement.item?.unit || "un",
        location: movement.item?.location?.name || "Não definido",
        userName: movement.profile?.name || "Usuário",
        userEmail: movement.profile?.email || "-",
        quantity: 0,
      });
    }

    const entry = groupedMap.get(key);

    if (movement.type === "check-out") {
      entry.quantity += movement.quantity;
    }

    if (movement.type === "check-in") {
      entry.quantity -= movement.quantity;
    }
  });

  const inUseItems = Array.from(groupedMap.values())
    .filter((entry) => entry.quantity > 0)
    .sort((a, b) => a.itemName.localeCompare(b.itemName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ferramentas em Uso</h1>
        <p className="text-gray-500">
          Visualize quais ferramentas estão com cada usuário neste momento.
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Ferramenta
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Local
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                Qtd em Uso
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {inUseItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  Nenhuma ferramenta em uso no momento.
                </td>
              </tr>
            ) : (
              inUseItems.map((entry) => (
                <tr
                  key={entry.key}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium">{entry.itemName}</td>
                  <td className="px-6 py-4 font-mono text-sm">
                    {entry.itemCode}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{entry.userName}</p>
                      <p className="text-xs text-gray-500">{entry.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {entry.location}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-orange-600">
                    {entry.quantity} {entry.unit}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
