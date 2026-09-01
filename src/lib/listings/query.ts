import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listingPhotoUrl } from "@/lib/listings";
import { PAGE_SIZE, type ExploreParams } from "@/lib/listings/explore";
import type { ListingFormat, ListingKind, ListingStatus } from "@/types/database";

export type ListingListItem = {
  id: string;
  kind: ListingKind;
  format: ListingFormat;
  for_sale: boolean;
  for_trade: boolean;
  card_name: string;
  set_name: string | null;
  image: string | null;
  language: string;
  condition: string | null;
  price_cop: number | null;
  price_negotiable: boolean;
  trade_for: string | null;
  city: string;
  status: ListingStatus;
  bumped_at: string;
  owner: { username: string | null; display_name: string | null } | null;
};

const LISTING_COLS =
  "id, user_id, kind, format, for_sale, for_trade, card_name, set_name, image_url, language, condition, price_cop, price_negotiable, trade_for, city, status, bumped_at, listing_photos(storage_path, sort_order)";

type ListingRowWithPhotos = {
  id: string;
  user_id: string;
  kind: ListingKind;
  format: ListingFormat;
  for_sale: boolean;
  for_trade: boolean;
  card_name: string;
  set_name: string | null;
  image_url: string | null;
  language: string;
  condition: string | null;
  price_cop: number | null;
  price_negotiable: boolean;
  trade_for: string | null;
  city: string;
  status: ListingStatus;
  bumped_at: string;
  listing_photos: { storage_path: string; sort_order: number }[] | null;
};

function firstPhotoUrl(row: ListingRowWithPhotos): string | null {
  // Un deck se muestra con su carta de portada; las fotos reales viven en el
  // detalle del anuncio.
  if (row.format === "deck" && row.image_url) return row.image_url;
  const photos = [...(row.listing_photos ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  if (photos[0]) return listingPhotoUrl(photos[0].storage_path);
  return row.image_url ?? null;
}

function shape(
  rows: ListingRowWithPhotos[],
  owners: Map<string, { username: string | null; display_name: string | null }>,
): ListingListItem[] {
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    format: row.format,
    for_sale: row.for_sale,
    for_trade: row.for_trade,
    card_name: row.card_name,
    set_name: row.set_name,
    image: firstPhotoUrl(row),
    language: row.language,
    condition: row.condition,
    price_cop: row.price_cop,
    price_negotiable: row.price_negotiable,
    trade_for: row.trade_for,
    city: row.city,
    status: row.status,
    bumped_at: row.bumped_at,
    owner: owners.get(row.user_id) ?? null,
  }));
}

async function attachOwners(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: ListingRowWithPhotos[],
): Promise<
  Map<string, { username: string | null; display_name: string | null }>
> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const owners = new Map<
    string,
    { username: string | null; display_name: string | null }
  >();
  if (ids.length === 0) return owners;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);

  for (const p of data ?? []) {
    owners.set(p.id, { username: p.username, display_name: p.display_name });
  }
  return owners;
}

export type SearchListingsResult = {
  items: ListingListItem[];
  total: number;
  page: number;
  pageCount: number;
};

/** Feed público de `/explorar` con filtros por URL. */
export async function searchListings(
  params: ExploreParams,
): Promise<SearchListingsResult> {
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(LISTING_COLS, { count: "exact" })
    .eq("status", "active");

  if (params.q) query = query.ilike("card_name", `%${params.q}%`);

  if (params.mode === "venta") query = query.eq("for_sale", true);
  else if (params.mode === "cambio") query = query.eq("for_trade", true);
  else if (params.mode === "busco") query = query.eq("kind", "want");

  if (params.format) query = query.eq("format", params.format);

  if (params.language) query = query.eq("language", params.language);
  if (params.condition) query = query.eq("condition", params.condition);
  if (params.priceMin != null) query = query.gte("price_cop", params.priceMin);
  if (params.priceMax != null) query = query.lte("price_cop", params.priceMax);

  if (params.sort === "precio_asc") {
    query = query.order("price_cop", { ascending: true, nullsFirst: false });
  } else if (params.sort === "precio_desc") {
    query = query.order("price_cop", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("bumped_at", { ascending: false });
  }
  query = query.order("id", { ascending: false }); // desempate estable

  const from = (params.page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []) as unknown as ListingRowWithPhotos[];
  const owners = await attachOwners(supabase, rows);
  const total = count ?? 0;

  return {
    items: shape(rows, owners),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Anuncios activos de un usuario, para su perfil público. */
export async function listUserListings(
  userId: string,
): Promise<ListingListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_COLS)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("bumped_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as unknown as ListingRowWithPhotos[];
  const owners = await attachOwners(supabase, rows);
  return shape(rows, owners);
}

/** Todos los anuncios gestionables del dueño (activos, reservados, cerrados). */
export async function listManageListings(
  userId: string,
): Promise<ListingListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_COLS)
    .eq("user_id", userId)
    .in("status", ["active", "reserved", "closed"])
    .order("bumped_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as ListingRowWithPhotos[];
  const owners = await attachOwners(supabase, rows);
  return shape(rows, owners);
}
