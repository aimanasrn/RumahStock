"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import type { Snapshot } from "@/lib/domain";
import type { Json } from "@/lib/database.types";
import type { Mutation } from "@/lib/validation";
import { mutate, type ActionResult } from "@/features/actions";
import { browserClient } from "@/lib/supabase/browser";
import { demoSnapshot } from "@/lib/demo";
type HouseholdContext = {
  data: Snapshot;
  demo: boolean;
  connected: boolean;
  run: (input: Mutation) => Promise<ActionResult>;
  resetDemo: () => void;
  href: (path: string) => string;
};
const Context = createContext<HouseholdContext | null>(null);
const demoKey = "rumahstock:explicit-demo:v1";
export function HouseholdProvider({
  initial,
  demo = false,
  children,
}: {
  initial: Snapshot;
  demo?: boolean;
  children: React.ReactNode;
}) {
  const [sample, setData] = useState(initial),
    [connected, setConnected] = useState(demo);
  const router = useRouter();
  const data = demo ? sample : initial;
  useEffect(() => {
    if (!demo) return;
    // Hydrate this explicit browser-only preview after the server render.
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(demoKey);
        if (saved) {
          const value = JSON.parse(saved) as Snapshot;
          if (value.household.id === initial.household.id) setData(value);
        }
      } catch {
        localStorage.removeItem(demoKey);
      }
    });
  }, [demo, initial.household.id]);
  useEffect(() => {
    if (demo) return;
    const client = browserClient();
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 120);
    };
    const channel = client.channel(`household:${initial.household.id}:${crypto.randomUUID()}`);
    for (const table of [
      "household_items",
      "shopping_list_entries",
      "products",
      "purchases",
      "purchase_line_items",
      "household_members",
      "households",
    ]) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `${table === "households" ? "id" : "household_id"}=eq.${initial.household.id}`,
        },
        refresh,
      );
    }
    // Invitations use column-level grants to keep token hashes private. They cannot be
    // filtered by Postgres Changes; refresh them after owner actions and reconciliation.
    channel.on("system", {}, (payload) => {
      if (disposed) return;
      if (payload.extension === "postgres_changes") {
        setConnected(payload.status === "ok");
        if (payload.status === "ok") refresh();
      }
    });
    // A join sent before cookie-session initialization is anonymous. Postgres Changes
    // then rejects its filters even though SSR already verified the user.
    async function subscribe() {
      const {
        data: { session },
      } = await client.auth.getSession();
      if (disposed || !session) return;
      await client.realtime.setAuth(session.access_token);
      if (disposed) return;
      channel.subscribe((status) => {
        if (disposed) return;
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") refresh();
      });
    }
    void subscribe().catch(() => {
      if (!disposed) setConnected(false);
    });
    const reconcile = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const auth = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", reconcile);
    // Reconcile missed deletes / revoked membership as well as reconnections.
    const poll = setInterval(refresh, 60000);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(poll);
      auth.data.subscription.unsubscribe();
      void client.removeChannel(channel);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", reconcile);
    };
  }, [demo, initial.household.id, router]);
  const run = useCallback(
    async (input: Mutation): Promise<ActionResult> => {
      if (!demo) {
        try {
          const result = await mutate(input);
          if (!result.ok) {
            toast.error(result.error);
            if (result.code === "PT409") router.refresh();
          } else {
            toast.success("Saved for your household");
            router.refresh();
          }
          return result;
        } catch {
          const error =
            "Connection interrupted. Your data may have saved. Retry a purchase with the same form to avoid duplicates.";
          toast.error(error);
          return { ok: false, error };
        }
      }
      const next = structuredClone(data),
        p = input.payload,
        now = new Date().toISOString();
      let result: Json = {};
      switch (input.action) {
        case "save_product": {
          const v = input.payload;
          const id = v.id ?? crypto.randomUUID();
          if (v.barcode && next.products.some((x) => x.barcode === v.barcode && x.id !== id)) {
            toast.error("This barcode already belongs to an item.");
            return { ok: false, error: "Duplicate barcode" };
          }
          const product = {
            id,
            household_id: next.household.id,
            name: v.name,
            barcode: v.barcode || null,
            brand: v.brand ?? "",
            package_size: v.package_size ?? "",
            category: v.category,
            notes: v.notes ?? "",
            source: v.source ?? "manual",
            image_path: v.image_path ?? null,
            archived_at: null,
            created_at: now,
            updated_at: now,
          };
          next.products = next.products.filter((x) => x.id !== id).concat(product);
          next.availability = next.availability
            .filter((x) => x.product_id !== id)
            .concat({
              product_id: id,
              household_id: next.household.id,
              status: v.status ?? "enough",
              updated_by: next.profile.id,
              updated_at: now,
            });
          result = { id };
          break;
        }
        case "set_status": {
          const v = input.payload;
          const a = next.availability.find((x) => x.product_id === v.product_id);
          if (a) a.status = v.status;
          break;
        }
        case "archive_product": {
          const a = next.products.find((x) => x.id === input.payload.product_id);
          if (next.entries.some((e) => e.product_id === a?.id && e.status === "pending")) {
            toast.error("Remove the pending shopping entry first.");
            return { ok: false, error: "Pending shopping entry" };
          }
          if (a) a.archived_at = now;
          break;
        }
        case "add_entry": {
          const v = input.payload;
          const entry = next.entries.find(
            (x) => x.product_id === v.product_id && x.status === "pending",
          );
          if (entry && !v.replace) {
            toast.error("Already on your list. Update its quantity instead.");
            return { ok: false, error: "Already pending", code: "23505" };
          }
          if (entry) {
            entry.quantity = v.quantity;
            entry.priority = v.priority ?? "normal";
            entry.notes = v.notes ?? "";
            entry.version++;
          } else
            next.entries.push({
              id: crypto.randomUUID(),
              household_id: next.household.id,
              list_id: next.entries[0]?.list_id ?? crypto.randomUUID(),
              product_id: v.product_id,
              quantity: v.quantity,
              purchase_unit: v.purchase_unit,
              priority: v.priority ?? "normal",
              notes: v.notes ?? "",
              status: "pending",
              added_by: next.profile.id,
              purchased_by: null,
              version: 1,
              created_at: now,
              updated_at: now,
            });
          break;
        }
        case "edit_entry": {
          const v = input.payload;
          const e = next.entries.find((x) => x.id === v.id);
          if (e)
            Object.assign(e, {
              quantity: v.quantity,
              priority: v.priority,
              notes: v.notes,
              version: e.version + 1,
            });
          break;
        }
        case "remove_entry":
          next.entries = next.entries.filter((x) => x.id !== input.payload.id);
          break;
        case "record_purchase": {
          const v = input.payload;
          const existing = next.purchases.find((x) => x.request_id === v.request_id);
          if (existing) return { ok: true, data: { id: existing.id } };
          const prod = next.products.find((x) => x.id === v.product_id)!;
          const e = next.entries.find((x) => x.id === v.entry_id);
          if (e && (e.version !== v.expected_version || v.quantity > e.quantity)) {
            toast.error("The quantity has changed. Reopen this form.");
            return { ok: false, error: "Quantity changed" };
          }
          const id = crypto.randomUUID();
          next.purchases.unshift({
            id,
            household_id: next.household.id,
            recorded_by: next.profile.id,
            request_id: v.request_id,
            request_payload: p as Json,
            purchase_date: v.purchase_date,
            store: v.store ?? "",
            created_at: now,
          });
          next.lines.unshift({
            id: crypto.randomUUID(),
            household_id: next.household.id,
            purchase_id: id,
            product_id: prod.id,
            entry_id: v.entry_id ?? null,
            product_name: prod.name,
            package_size: prod.package_size,
            quantity: v.quantity,
            purchase_unit: v.purchase_unit,
            unit_price: v.unit_price,
            line_total: new Decimal(v.quantity).times(v.unit_price).toDecimalPlaces(2).toNumber(),
            created_at: now,
          });
          if (e) {
            if (v.quantity < e.quantity)
              e.quantity = new Decimal(e.quantity).minus(v.quantity).toNumber();
            else e.status = "purchased";
            e.purchased_by = next.profile.id;
            e.version++;
          }
          const a = next.availability.find((x) => x.product_id === v.product_id);
          if (a) a.status = v.status;
          result = { id };
          break;
        }
        case "rename_household":
          next.household.name = input.payload.name;
          break;
        case "update_profile":
          next.profile.name = input.payload.name;
          next.members = next.members.map((m) =>
            m.user_id === next.profile.id ? { ...m, name: input.payload.name } : m,
          );
          break;
        case "remove_member":
          next.members = next.members.filter((x) => x.user_id !== input.payload.user_id);
          break;
        case "revoke_invitation": {
          const a = next.invitations.find((x) => x.id === input.payload.id);
          if (a) a.revoked_at = now;
          break;
        }
        default:
          toast.info("Connect Supabase to create secure household invitations.");
          return { ok: false, error: "This feature requires Supabase." };
      }
      localStorage.setItem(demoKey, JSON.stringify(next));
      setData(next);
      toast.success("Saved in this sample household");
      return { ok: true, data: result };
    },
    [demo, data, router],
  );
  const resetDemo = () => {
    const fresh = demoSnapshot();
    localStorage.removeItem(demoKey);
    setData(fresh);
    toast.success("Sample household reset");
  };
  return (
    <Context.Provider
      value={{
        data,
        demo,
        connected,
        run,
        resetDemo,
        href: (path) => (demo ? `/demo${path === "/dashboard" ? "" : path}` : path),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useHousehold() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing household provider");
  return context;
}
