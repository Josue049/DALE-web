-- =====================================================================
-- DALE CON TODO — Storage (buckets y políticas)
-- media:       público, sube staff (portadas, fotos del equipo, aliados)
-- avatars:     público, cada persona en su carpeta <user_id>/
-- submissions: PRIVADO, carpeta <entry_id>/; leen integrantes, staff y jurados
-- Se omite automáticamente si el esquema `storage` no existe (p. ej. pruebas con PGlite).
-- =====================================================================
do $outer$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'Esquema storage ausente: se omiten buckets y políticas';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'application/pdf']),
    ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
    ('submissions', 'submissions', false, 26214400, null)
  on conflict (id) do nothing;

  execute $p$create policy "media lectura pública" on storage.objects for select using (bucket_id = 'media')$p$;
  execute $p$create policy "media escritura staff" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff())$p$;
  execute $p$create policy "media edición staff" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff())$p$;
  execute $p$create policy "media borrado staff" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff())$p$;

  execute $p$create policy "avatars lectura pública" on storage.objects for select using (bucket_id = 'avatars')$p$;
  execute $p$create policy "avatars propios" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "avatars propios update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "avatars propios delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;

  execute $p$create policy "entregas subir integrantes" on storage.objects for insert to authenticated
    with check (bucket_id = 'submissions' and public.is_entry_member(((storage.foldername(name))[1])::uuid))$p$;
  execute $p$create policy "entregas leer autorizados" on storage.objects for select to authenticated
    using (bucket_id = 'submissions' and exists (
      select 1 from public.contest_entries ce
      where ce.id::text = (storage.foldername(name))[1]
        and (public.is_entry_member(ce.id) or public.can_manage_contest(ce.contest_id) or public.is_judge_of(ce.contest_id))
    ))$p$;
end
$outer$;
