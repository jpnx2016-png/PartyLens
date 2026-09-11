create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  url text not null,
  alt text not null default 'Foto da festa',
  author text not null default 'Convidado',
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;
create policy "Fotos publicadas são visíveis" on public.photos for select using (true);
create policy "Qualquer convidado pode publicar" on public.photos for insert with check (true);

insert into storage.buckets (id, name, public)
values ('party-photos', 'party-photos', true)
on conflict (id) do update set public = true;

create policy "Fotos podem ser lidas publicamente" on storage.objects for select using (bucket_id = 'party-photos');
create policy "Convidados podem enviar fotos" on storage.objects for insert with check (bucket_id = 'party-photos');
create policy "Convidados podem remover fotos" on storage.objects for delete using (bucket_id = 'party-photos');

alter publication supabase_realtime add table public.photos;
