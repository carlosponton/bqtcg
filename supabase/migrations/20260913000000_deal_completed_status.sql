-- Fase 2 · ajuste de flujo: se separa "confirmar" de "cerrar" el trato.
--
-- Antes: pending -> confirmed, y `confirmed` hacía todo a la vez (número
-- visible + reseñas habilitadas + anuncio descontado/cerrado). Además, quien
-- confirmaba no veía bien el número de la otra persona.
--
-- Ahora son 3 pasos:
--   1. pending    -> se propuso el trato (falta que el dueño acepte).
--   2. confirmed  -> EN CURSO: ambos aceptaron, ya se ven el WhatsApp y
--                    coordinan la entrega.
--   3. completed  -> CERRADO: ya hicieron el intercambio -> reseñas + se
--                    descuenta/cierra el anuncio.
-- `cancel_deal` ahora vale desde `pending` o `confirmed`.
--
-- Esta migración: columnas + check de status + policy de reseñas. Las funciones
-- van en archivos aparte (20260913000001..004), una por archivo.

alter table public.deals
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid
    references auth.users (id) on delete set null;

alter table public.deals drop constraint if exists deals_status_check;
alter table public.deals
  add constraint deals_status_check
  check (status in ('pending', 'confirmed', 'completed', 'cancelled'));

-- Reseñas: sólo sobre tratos CERRADOS (antes: confirmados).
drop policy if exists "Crear reseña de un trato confirmado" on public.reviews;
drop policy if exists "Crear reseña de un trato cerrado" on public.reviews;
create policy "Crear reseña de un trato cerrado"
  on public.reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.deals d
      where d.id = deal_id
        and d.status = 'completed'
        and (select auth.uid()) in (d.seller_id, d.buyer_id)
        and reviews.reviewee_id = case
          when d.seller_id = (select auth.uid()) then d.buyer_id
          else d.seller_id
        end
    )
  );
