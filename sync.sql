-- Cole este arquivo no SQL Editor do Supabase (New query → Run).
-- Cria o escritório compartilhado da Agenda Jurídica.

create table if not exists offices (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id text primary key,
  office_id uuid not null references offices(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table if not exists custom_subjects (
  id text primary key,
  office_id uuid not null references offices(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists appointments_office_updated on appointments (office_id, updated_at);
create index if not exists subjects_office_updated on custom_subjects (office_id, updated_at);

alter table offices enable row level security;
alter table appointments enable row level security;
alter table custom_subjects enable row level security;

revoke all on table offices from anon, authenticated, public;
revoke all on table appointments from anon, authenticated, public;
revoke all on table custom_subjects from anon, authenticated, public;

create or replace function agenda_normalize_code(p_code text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  normalized := upper(replace(replace(replace(trim(coalesce(p_code, '')), ' ', ''), '–', '-'), '—', '-'));
  if position('-' in normalized) = 0 and length(normalized) = 8 then
    normalized := substr(normalized, 1, 4) || '-' || substr(normalized, 5, 4);
  end if;
  return normalized;
end;
$$;

create or replace function agenda_generate_office_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return substr(result, 1, 4) || '-' || substr(result, 5, 4);
end;
$$;

create or replace function create_office()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  new_id uuid;
  attempts int := 0;
begin
  loop
    new_code := agenda_generate_office_code();
    begin
      insert into offices (code) values (new_code) returning id into new_id;
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 8 then
        raise exception 'Não foi possível criar o código';
      end if;
    end;
  end loop;
  return json_build_object('id', new_id, 'code', new_code);
end;
$$;

create or replace function join_office(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  office_row offices%rowtype;
begin
  select * into office_row from offices where code = agenda_normalize_code(p_code);
  if office_row.id is null then
    raise exception 'Código inválido';
  end if;
  return json_build_object('id', office_row.id, 'code', office_row.code);
end;
$$;

create or replace function pull_office(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  oid uuid;
begin
  select id into oid from offices where code = agenda_normalize_code(p_code);
  if oid is null then
    raise exception 'Código inválido';
  end if;
  return json_build_object(
    'appointments', (
      select coalesce(json_agg(json_build_object(
        'id', id,
        'payload', payload,
        'updated_at', updated_at,
        'deleted_at', deleted_at
      )), '[]'::json)
      from appointments
      where office_id = oid
    ),
    'subjects', (
      select coalesce(json_agg(json_build_object(
        'id', id,
        'payload', payload,
        'updated_at', updated_at,
        'deleted_at', deleted_at
      )), '[]'::json)
      from custom_subjects
      where office_id = oid
    )
  );
end;
$$;

create or replace function push_office_items(p_code text, p_appointments json, p_subjects json)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  oid uuid;
  rec json;
  n_app int := 0;
  n_sub int := 0;
begin
  select id into oid from offices where code = agenda_normalize_code(p_code);
  if oid is null then
    raise exception 'Código inválido';
  end if;

  if p_appointments is not null then
    for rec in select value from json_array_elements(p_appointments)
    loop
      insert into appointments (id, office_id, payload, updated_at, deleted_at)
      values (
        rec->>'id',
        oid,
        coalesce((rec->'payload')::jsonb, '{}'::jsonb),
        coalesce((rec->>'updated_at')::timestamptz, now()),
        nullif(rec->>'deleted_at', '')::timestamptz
      )
      on conflict (id) do update
        set payload = excluded.payload,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at,
            office_id = excluded.office_id
        where appointments.updated_at <= excluded.updated_at;
      n_app := n_app + 1;
    end loop;
  end if;

  if p_subjects is not null then
    for rec in select value from json_array_elements(p_subjects)
    loop
      insert into custom_subjects (id, office_id, payload, updated_at, deleted_at)
      values (
        rec->>'id',
        oid,
        coalesce((rec->'payload')::jsonb, '{}'::jsonb),
        coalesce((rec->>'updated_at')::timestamptz, now()),
        nullif(rec->>'deleted_at', '')::timestamptz
      )
      on conflict (id) do update
        set payload = excluded.payload,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at,
            office_id = excluded.office_id
        where custom_subjects.updated_at <= excluded.updated_at;
      n_sub := n_sub + 1;
    end loop;
  end if;

  return json_build_object('ok', true, 'appointments', n_app, 'subjects', n_sub);
end;
$$;

revoke all on function agenda_normalize_code(text) from public, anon, authenticated;
revoke all on function agenda_generate_office_code() from public, anon, authenticated;

grant execute on function create_office() to anon, authenticated;
grant execute on function join_office(text) to anon, authenticated;
grant execute on function pull_office(text) to anon, authenticated;
grant execute on function push_office_items(text, json, json) to anon, authenticated;
