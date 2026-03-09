
CREATE TABLE public.game_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  game text NOT NULL,
  phien integer NOT NULL,
  result text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_history_user_game ON public.game_history (user_id, game, created_at DESC);
CREATE UNIQUE INDEX idx_game_history_unique_phien ON public.game_history (user_id, game, phien);

ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own game history"
  ON public.game_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own game history"
  ON public.game_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
