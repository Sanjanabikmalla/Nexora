ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS competitor_count_nearby INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_review_responses INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pressure_signal TEXT,
  ADD COLUMN IF NOT EXISTS strike_timing TEXT NOT NULL DEFAULT 'WAIT' CHECK (strike_timing IN ('NOW', 'SOON', 'WAIT')),
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Hyderabad';

CREATE INDEX IF NOT EXISTS idx_businesses_city ON public.businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_strike_timing ON public.businesses(strike_timing);

CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Converted', 'Discarded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  briefing TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  readiness_score INT CHECK (readiness_score >= 0 AND readiness_score <= 100),
  feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_sessions TO authenticated;
GRANT SELECT ON public.scoring_config TO authenticated;
GRANT ALL ON public.lists, public.list_items, public.copilot_sessions, public.scoring_config TO service_role;

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manages lists" ON public.lists;
CREATE POLICY "owner manages lists" ON public.lists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner manages list items" ON public.list_items;
CREATE POLICY "owner manages list items" ON public.list_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()));

DROP POLICY IF EXISTS "owner manages copilot sessions" ON public.copilot_sessions;
CREATE POLICY "owner manages copilot sessions" ON public.copilot_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins manage scoring config" ON public.scoring_config;
CREATE POLICY "admins manage scoring config" ON public.scoring_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER t_lists_u BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_list_items_u BEFORE UPDATE ON public.list_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_copilot_sessions_u BEFORE UPDATE ON public.copilot_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

UPDATE public.businesses b
SET
  city = COALESCE(l.city, b.city, 'Hyderabad'),
  competitor_count_nearby = CASE
    WHEN competitor_count_nearby > 0 THEN competitor_count_nearby
    ELSE 2 + (abs(('x' || substr(md5(b.id::text), 1, 4))::bit(16)::int) % 9)
  END,
  google_review_responses = CASE
    WHEN google_review_responses > 0 THEN google_review_responses
    ELSE abs(('x' || substr(md5(b.id::text), 5, 4))::bit(16)::int) % GREATEST(b.google_review_count + 1, 1)
  END,
  strike_timing = CASE
    WHEN b.has_website = false AND b.has_instagram = false THEN 'NOW'
    WHEN b.google_review_count >= 40 AND b.google_rating < 4.2 THEN 'NOW'
    WHEN b.has_website = false OR b.has_instagram = false THEN 'SOON'
    ELSE 'WAIT'
  END,
  pressure_signal = CASE
    WHEN b.has_website = false AND b.has_instagram = false THEN 'NOW: Digital absence is creating an opening before nearby competitors capture search demand.'
    WHEN b.google_review_count >= 40 AND b.google_rating < 4.2 THEN 'NOW: Review volume is high, but sentiment drag gives a sharp reputation recovery angle.'
    WHEN b.has_website = false THEN 'SOON: A missing website is limiting intent capture while competitors stay discoverable.'
    WHEN b.has_instagram = false THEN 'SOON: Social inactivity makes the lead vulnerable to better-branded local competitors.'
    ELSE 'WAIT: Keep warm and monitor for a stronger buying trigger.'
  END
FROM public.localities l
WHERE b.locality_id = l.id;
