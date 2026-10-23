INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public read project images" ON storage.objects;
DROP POLICY IF EXISTS "admin read project images" ON storage.objects;
DROP POLICY IF EXISTS "admin write project images" ON storage.objects;
DROP POLICY IF EXISTS "admin delete project images" ON storage.objects;

CREATE POLICY "admin read project images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write project images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete project images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));
