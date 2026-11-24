-- Kısa video uygulaması: belge deposu + yol bazlı erişim kuralları
-- Uygulamadaki her belge "koleksiyon/id" yoluyla tek tabloda tutulur.

create table if not exists public.docs (
  path       text primary key,
  col        text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists docs_col_idx on public.docs (col);

create table if not exists public.app_admins (uid uuid primary key);
alter table public.app_admins enable row level security;
create policy "admin kendini görür" on public.app_admins for select using (uid = auth.uid());

create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where uid = auth.uid())
$$;

-- İlk kayıt olan kullanıcı yönetici olur (uygulama sahibi)
create or replace function public.first_user_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.app_admins) then
    insert into public.app_admins (uid) values (new.id);
  end if;
  return new;
end $$;
drop trigger if exists on_first_user on auth.users;
create trigger on_first_user after insert on auth.users
  for each row execute function public.first_user_admin();

-- Yol kuralları (claude.ai sürümündeki kuralların aynısı)
create or replace function public.doc_rule(p text, is_write boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  s   text[] := string_to_array(p, '/');
  u   text   := auth.uid()::text;
  top text   := s[1];
begin
  if u is null then return false; end if;
  if top = 'data' then
    return s[2] = 'users' and s[3] = u;                       -- kişiye özel alan
  elsif top in ('feed', 'ads') then
    return (not is_write) or public.is_app_admin();            -- herkes okur, yönetici yazar
  elsif top in ('profiles','likes','follows','reposts','views','comments','gifts','pins','votes',
                'footnotes','playlists','bulletins','shop','searches','stories','approvals','lives') then
    return (not is_write) or s[2] = u or public.is_app_admin(); -- herkes okur, herkes kendi belgesini yazar
  elsif top in ('signals','uploads','reports','payouts') then
    return s[2] = u or public.is_app_admin();                  -- sahibi ve yönetici
  elsif top = 'wallet' then
    return ((not is_write) and s[2] = u) or public.is_app_admin(); -- sahibi okur, yalnız yönetici yazar
  elsif top in ('chats','shared') then
    return true;                                               -- mesaj içerikleri istemcide şifreli
  end if;
  return public.is_app_admin();
end $$;

create or replace function public.docs_fill_col() returns trigger
language plpgsql as $$
begin
  new.col := regexp_replace(new.path, '/[^/]+$', '');
  new.updated_at := now();
  if array_length(string_to_array(new.path, '/'), 1) % 2 <> 0 then
    raise exception 'Belge yolu çift sayıda parçadan oluşmalı: %', new.path;
  end if;
  return new;
end $$;
drop trigger if exists docs_bi on public.docs;
create trigger docs_bi before insert or update on public.docs
  for each row execute function public.docs_fill_col();

alter table public.docs enable row level security;
create policy "docs okuma"    on public.docs for select using (public.doc_rule(path, false));
create policy "docs ekleme"   on public.docs for insert with check (public.doc_rule(path, true));
create policy "docs güncelle" on public.docs for update using (public.doc_rule(path, true)) with check (public.doc_rule(path, true));
create policy "docs silme"    on public.docs for delete using (public.doc_rule(path, true));

grant select, insert, update, delete on public.docs to authenticated;
grant execute on function public.is_app_admin() to authenticated;

-- Anlık güncellemeler
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- Dosyalar: herkes izler, herkes kendi klasörüne yükler
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do nothing;
create policy "media yükle" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media sil" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_app_admin()));
