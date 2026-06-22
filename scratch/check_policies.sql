SELECT relname, relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass;
