-- İlk tablolar. Şema adı yazılmaz; göç script'i search_path'i ayarlar.

create extension if not exists btree_gist with schema public;

create table providers (
  id    text primary key,
  slug  text not null unique,
  name  text not null,
  title text not null
);

create table services (
  id               text not null,
  provider_id      text not null references providers(id),
  name             text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  primary key (provider_id, id)
);

-- Günde birden çok aralık olabilir (09–12, 13–18). day: 1 = Pazartesi … 7 = Pazar.
create table working_ranges (
  provider_id text not null references providers(id),
  day         smallint not null check (day between 1 and 7),
  start_time  time not null,
  end_time    time not null check (end_time > start_time),
  primary key (provider_id, day, start_time)
);

create table appointments (
  id           uuid primary key,
  provider_id  text not null references providers(id),
  service_id   text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null check (ends_at > starts_at),
  client_name  text not null,
  client_email text not null,
  created_at   timestamptz not null,
  foreign key (provider_id, service_id) references services(provider_id, id),
  -- Aynı hizmet verende zaman aralığı çakışan iki randevu olamaz; '[)' bitişik randevulara izin verir.
  exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);
