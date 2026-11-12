-- Reverte 0001. Só homologação/CI. Apaga todos os schemas do v2 e os papéis app_rw e etl.
-- Papéis são do cluster: se outro banco do mesmo cluster ainda os usa, o papel é mantido (aviso, sem erro).
drop schema if exists migracao, audit, familia, catequese, org, identity cascade;
drop owned by app_rw, etl;
do $$ declare r text; begin
  foreach r in array array['app_rw', 'etl'] loop
    begin execute format('drop role if exists %I', r);
    exception when dependent_objects_still_exist then raise notice 'papel % mantido: usado por outro banco do cluster', r; end;
  end loop;
end $$;
