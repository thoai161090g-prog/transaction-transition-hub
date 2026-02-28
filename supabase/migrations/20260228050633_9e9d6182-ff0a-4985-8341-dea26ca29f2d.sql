
-- Create card_topups table for scratch card payments
CREATE TABLE public.card_topups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  telco TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  card_code TEXT NOT NULL,
  amount INTEGER NOT NULL,
  package TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.card_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own card topups"
ON public.card_topups FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own card topups or admin all"
ON public.card_topups FOR SELECT
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update card topups"
ON public.card_topups FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
