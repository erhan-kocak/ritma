-- Bu dosya otomatik üretilir, elle düzenlemeyin; npm run db:migrate çalıştırın.

create table appointments (
  id uuid not null,
  provider_id text not null,
  service_id text not null,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  client_name text not null,
  client_email text not null,
  created_at timestamp with time zone not null,
  constraint appointments_check CHECK ((ends_at > starts_at)),
  constraint appointments_pkey PRIMARY KEY (id),
  constraint appointments_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES providers(id),
  constraint appointments_provider_id_service_id_fkey FOREIGN KEY (provider_id, service_id) REFERENCES services(provider_id, id),
  constraint appointments_provider_id_tstzrange_excl EXCLUDE USING gist (provider_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&)
);

create table providers (
  id text not null,
  slug text not null,
  name text not null,
  title text not null,
  constraint providers_pkey PRIMARY KEY (id),
  constraint providers_slug_key UNIQUE (slug)
);

create table services (
  id text not null,
  provider_id text not null,
  name text not null,
  duration_minutes integer not null,
  constraint services_duration_minutes_check CHECK ((duration_minutes > 0)),
  constraint services_pkey PRIMARY KEY (provider_id, id),
  constraint services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES providers(id)
);

create table working_ranges (
  provider_id text not null,
  day smallint not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  constraint working_ranges_check CHECK ((end_time > start_time)),
  constraint working_ranges_day_check CHECK (((day >= 1) AND (day <= 7))),
  constraint working_ranges_pkey PRIMARY KEY (provider_id, day, start_time),
  constraint working_ranges_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES providers(id)
);
